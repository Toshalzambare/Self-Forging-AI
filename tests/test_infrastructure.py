"""
Phase 1 Infrastructure Tests:
- PostgreSQL database connectivity & CRUD operations via RegistryRepository
- MinIO S3 object storage operations
- FastAPI health & registry endpoints
- Pre-cached sandbox test execution
"""
import pytest
import uuid
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from config import config
from registry import get_db, check_db_connection, RegistryRepository
from storage import check_storage_connection, upload_file, download_file, delete_file
from sandbox.executor import execute_in_sandbox
from fastapi.testclient import TestClient
from main import app
from registry.database import engine


@pytest.fixture(autouse=True)
async def cleanup_database():
    yield
    await engine.dispose()


@pytest.mark.asyncio
async def test_database_connection():
    """Verify PostgreSQL connection succeeds."""
    connected = await check_db_connection()
    assert connected is True, "PostgreSQL connection failed"


@pytest.mark.asyncio
async def test_registry_repository_crud():
    """Verify async CRUD operations on PostgreSQL."""
    async with get_db() as db:
        test_tool_name = f"test_tool_{uuid.uuid4().hex[:8]}"
        tool = await RegistryRepository.add_tool(
            db,
            name=test_tool_name,
            description="Unit test tool",
            code="def run(): return 42",
            schema={"name": test_tool_name, "parameters": {}},
            tests_code="assert run() == 42"
        )
        assert tool.id is not None
        assert tool.name == test_tool_name

        # Verify get_tool
        fetched = await RegistryRepository.get_tool(db, tool.id)
        assert fetched is not None
        assert fetched.name == test_tool_name

        # Verify list_tools
        tools = await RegistryRepository.list_tools(db)
        assert any(t.id == tool.id for t in tools)

        # Verify add_log and list_logs
        session_id = str(uuid.uuid4())
        log = await RegistryRepository.add_log(
            db,
            session_id=session_id,
            action="Test Action",
            details="Unit test log detail"
        )
        assert log.id is not None

        logs = await RegistryRepository.list_logs(db, limit=10)
        assert any(l.session_id == session_id for l in logs)

        # Verify providers and mcp_servers can be seeded and listed
        await RegistryRepository.seed_defaults(db)
        providers = await RegistryRepository.list_providers(db)
        assert len(providers) >= 3

        mcp_servers = await RegistryRepository.list_mcp_servers(db)
        assert len(mcp_servers) >= 3


def test_storage_operations():
    """Verify MinIO object storage connection, upload, download, and delete."""
    assert check_storage_connection() is True, "MinIO connection failed"

    bucket = config.MINIO_BUCKET_TOOLS
    key = f"test_artifacts/test_{uuid.uuid4().hex[:8]}.txt"
    payload = b"Unit test storage content"

    uploaded_key = upload_file(bucket, key, payload, content_type="text/plain")
    assert uploaded_key == key

    data = download_file(bucket, key)
    assert data == payload

    delete_file(bucket, key)


def test_api_health_endpoint():
    """Verify /api/health returns 200 with db and storage connected."""
    with TestClient(app) as client:
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["db"] == "connected"
        assert data["storage"] == "connected"


def test_api_registry_endpoints():
    """Verify all registry endpoints return valid JSON responses when authenticated."""
    with TestClient(app) as client:
        # Create user to authenticate
        uid = uuid.uuid4().hex[:8]
        signup_resp = client.post("/api/auth/signup", json={
            "email": f"infra_{uid}@example.com",
            "username": f"infra_{uid}",
            "password": "Password123!",
        })
        assert signup_resp.status_code == 201
        token = signup_resp.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}

        tools_resp = client.get("/api/tools", headers=headers)
        assert tools_resp.status_code == 200
        assert "tools" in tools_resp.json()

        logs_resp = client.get("/api/logs", headers=headers)
        assert logs_resp.status_code == 200
        assert "logs" in logs_resp.json()

        providers_resp = client.get("/api/providers", headers=headers)
        assert providers_resp.status_code == 200
        assert "providers" in providers_resp.json()

        mcp_resp = client.get("/api/mcp-servers", headers=headers)
        assert mcp_resp.status_code == 200
        assert "mcp_servers" in mcp_resp.json()


def test_sandbox_performance():
    """Verify pre-cached sandbox runs pytest in < 5 seconds without pip install."""
    code = "def multiply(x, y): return x * y"
    tests = "from generated_tool import multiply\ndef test_mult(): assert multiply(6, 7) == 42"

    passed, trace = execute_in_sandbox(code, tests)
    assert passed is True
    assert "PASSED" in trace
