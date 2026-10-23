"""
Test suite for .sfatool Serialization, Export & AST Security Import Gate (Plan 05-02).
Tests:
- Export of registered tool into .sfatool payload and attachment headers
- Cross-tenant export protection (404 for non-owners)
- Valid import flow into PostgreSQL and dynamic MCP hot-swapping
- AST security gate rejection of malicious tools (os, subprocess, eval)
- AST security gate rejection of malicious tests
- Name collision handling with unique suffixing
- Format validation (missing required keys, invalid Python syntax)
"""
import pytest
import pytest_asyncio
import os
import sys
import uuid
from httpx import AsyncClient, ASGITransport

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from main import app
from registry.database import get_db, engine
from registry.repository import RegistryRepository
from registry.mcp_manager import dynamic_mcp_registry
from auth import create_access_token


@pytest_asyncio.fixture(autouse=True)
async def cleanup():
    dynamic_mcp_registry.clear()
    yield
    dynamic_mcp_registry.clear()
    await engine.dispose()


async def _create_test_user_and_headers(email_prefix: str):
    user_id = str(uuid.uuid4())
    async with get_db() as db:
        user = await RegistryRepository.create_user(
            db,
            email=f"{email_prefix}_{user_id[:8]}@example.com",
            username=f"{email_prefix}_{user_id[:8]}",
            password_hash="hashed_pw",
        )
    token = create_access_token(user_id=str(user.id), email=user.email)
    headers = {"Authorization": f"Bearer {token}"}
    return user, headers


@pytest.mark.asyncio
async def test_export_tool_success_and_headers():
    """Verify GET /api/tools/{tool_id}/export produces valid .sfatool payload."""
    user, headers = await _create_test_user_and_headers("export_user")

    async with get_db() as db:
        tool = await RegistryRepository.add_tool(
            db,
            name="json_beautifier",
            description="Formats and indents JSON text",
            code="def execute(text: str) -> str: return text.strip()",
            schema={"properties": {"text": {"type": "string"}}},
            tests_code="def test_exec(): pass",
            user_id=user.id,
        )
        tool.reuse_count = 12
        tool.success_rate = 1.0
        tool.gate_score = 0.95
        await db.flush()
        tool_id = str(tool.id)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(f"/api/tools/{tool_id}/export", headers=headers)
        assert resp.status_code == 200
        assert 'attachment; filename="json_beautifier.sfatool"' in resp.headers.get("content-disposition", "")
        data = resp.json()
        assert data["sfa_version"] == "1.0"
        assert data["meta"]["name"] == "json_beautifier"
        assert data["meta"]["description"] == "Formats and indents JSON text"
        assert "def execute" in data["code"]
        assert data["metrics"]["reuse_count"] == 12
        assert data["metrics"]["success_rate"] == 1.0
        assert data["metrics"]["gate_score"] == 0.95


@pytest.mark.asyncio
async def test_export_tool_cross_tenant_rejection():
    """Verify User B cannot export User A's tool."""
    user_a, _ = await _create_test_user_and_headers("owner_export")
    user_b, headers_b = await _create_test_user_and_headers("attacker_export")

    async with get_db() as db:
        tool_a = await RegistryRepository.add_tool(
            db,
            name="secret_tool",
            description="Proprietary calculation",
            code="def execute(): return 42",
            schema={},
            user_id=user_a.id,
        )
        tool_a_id = str(tool_a.id)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(f"/api/tools/{tool_a_id}/export", headers=headers_b)
        assert resp.status_code == 404


@pytest.mark.asyncio
async def test_import_tool_valid_and_hot_swapped():
    """Verify valid .sfatool import saves to DB and hot-swaps into dynamic MCP registry."""
    user, headers = await _create_test_user_and_headers("import_user")

    payload = {
        "sfa_version": "1.0",
        "meta": {
            "name": "temperature_converter",
            "description": "Converts Celsius to Fahrenheit",
            "version": "1.0.0",
        },
        "schema": {
            "type": "object",
            "properties": {"celsius": {"type": "number"}},
            "required": ["celsius"],
        },
        "code": "def execute(celsius: float) -> float:\n    return (celsius * 9/5) + 32",
        "tests": "from generated_tool import execute\ndef test_conv(): assert execute(0) == 32",
        "metrics": {"reuse_count": 0, "success_rate": 1.0},
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/tools/import", json=payload, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        tool_id = data["tool"]["id"]

    # Verify saved in PostgreSQL
    async with get_db() as db:
        tool = await RegistryRepository.get_tool(db, tool_id)
        assert tool is not None
        assert tool.name == "temperature_converter"
        assert str(tool.user_id) == str(user.id)

    # Verify hot-swapped into dynamic MCP registry
    fn = dynamic_mcp_registry.get_tool_callable(str(user.id), tool_id)
    assert fn is not None
    assert fn(0) == 32
    assert fn(100) == 212


@pytest.mark.asyncio
async def test_import_tool_ast_security_gate_rejection():
    """Verify AST security gate rejects tools containing malicious code or imports."""
    user, headers = await _create_test_user_and_headers("sec_user")

    # 1. Banned module: os
    bad_os_payload = {
        "sfa_version": "1.0",
        "meta": {"name": "malicious_os"},
        "schema": {},
        "code": "import os\ndef execute(): os.system('echo hacked')",
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/tools/import", json=bad_os_payload, headers=headers)
        assert resp.status_code == 400
        assert "Banned module import detected: os" in resp.json()["detail"]

    # 2. Banned module: subprocess
    bad_sub_payload = {
        "sfa_version": "1.0",
        "meta": {"name": "malicious_sub"},
        "schema": {},
        "code": "from subprocess import Popen\ndef execute(): Popen(['calc'])",
    }
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/tools/import", json=bad_sub_payload, headers=headers)
        assert resp.status_code == 400
        assert "subprocess" in resp.json()["detail"]

    # 3. Banned call: eval
    bad_eval_payload = {
        "sfa_version": "1.0",
        "meta": {"name": "malicious_eval"},
        "schema": {},
        "code": "def execute(cmd): return eval(cmd)",
    }
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/tools/import", json=bad_eval_payload, headers=headers)
        assert resp.status_code == 400
        assert "eval" in resp.json()["detail"]

    # 4. Malicious test code
    bad_test_payload = {
        "sfa_version": "1.0",
        "meta": {"name": "clean_code_bad_test"},
        "schema": {},
        "code": "def execute(): return 'safe'",
        "tests": "import os\ndef test_it(): os.system('whoami')",
    }
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/tools/import", json=bad_test_payload, headers=headers)
        assert resp.status_code == 400
        assert "os" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_import_tool_name_collision_handling():
    """Verify importing a tool with an existing name suffixes _imported without crash."""
    user, headers = await _create_test_user_and_headers("collision_user")

    # Add existing tool
    async with get_db() as db:
        await RegistryRepository.add_tool(
            db,
            name="text_formatter",
            description="Initial version",
            code="def execute(s): return s.lower()",
            schema={},
            user_id=user.id,
        )

    # Import new tool with the same name
    payload = {
        "sfa_version": "1.0",
        "meta": {"name": "text_formatter", "description": "Imported copy"},
        "schema": {},
        "code": "def execute(s): return s.upper()",
    }

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/tools/import", json=payload, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["tool"]["name"].startswith("text_formatter_imported_")


@pytest.mark.asyncio
async def test_import_tool_validation_errors():
    """Verify malformed JSON or invalid syntax returns 400 Bad Request."""
    user, headers = await _create_test_user_and_headers("validation_user")
    transport = ASGITransport(app=app)

    # 1. Missing sfa_version
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/tools/import", json={"code": "def execute(): pass"}, headers=headers)
        assert resp.status_code == 400
        assert "sfa_version" in resp.json()["detail"]

    # 2. Syntax error in Python code
    syntax_payload = {
        "sfa_version": "1.0",
        "meta": {"name": "broken_syntax"},
        "schema": {},
        "code": "def execute( broken syntax",
    }
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/tools/import", json=syntax_payload, headers=headers)
        assert resp.status_code == 400
        assert "Syntax error" in resp.json()["detail"]

    # 3. Non-string falsy tests value (e.g. 0, False, [])
    bad_tests_payload = {
        "sfa_version": "1.0",
        "meta": {"name": "falsy_tests_tool"},
        "schema": {},
        "code": "def execute(): return 42",
        "tests": 0,
    }
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/tools/import", json=bad_tests_payload, headers=headers)
        assert resp.status_code == 400
        assert "pytest code" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_export_filename_sanitization():
    """Verify tool names with special characters are sanitized in Content-Disposition."""
    user, headers = await _create_test_user_and_headers("sanitize_user")
    async with get_db() as db:
        tool = await RegistryRepository.add_tool(
            db,
            name='unsafe/tool "name"\r\n',
            description="Tool with weird characters",
            code="def execute(): return 'safe'",
            schema={},
            user_id=user.id,
        )
        tool_id = str(tool.id)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(f"/api/tools/{tool_id}/export", headers=headers)
        assert resp.status_code == 200
        disp = resp.headers.get("Content-Disposition", "")
        assert "\r" not in disp
        assert "\n" not in disp
        assert '"' in disp
        assert disp.endswith('.sfatool"')

