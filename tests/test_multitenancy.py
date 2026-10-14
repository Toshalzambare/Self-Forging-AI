"""
Multi-Tenancy & Data Isolation Test Suite:
- Unauthenticated access returns 401 across all protected routes
- User A and User B complete data isolation for tools and activity logs
- User-scoped access to system default providers and MCP servers
"""
import pytest
import uuid
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from fastapi.testclient import TestClient
from main import app
from registry import get_db, RegistryRepository
from registry.database import engine


@pytest.fixture(autouse=True)
async def cleanup_engine():
    yield
    await engine.dispose()


def create_test_user(client: TestClient, prefix: str) -> tuple[dict, dict]:
    uid = uuid.uuid4().hex[:8]
    email = f"{prefix}_{uid}@example.com"
    username = f"{prefix}_{uid}"
    res = client.post("/api/auth/signup", json={
        "email": email,
        "username": username,
        "password": "StrongPassword123!",
    })
    assert res.status_code == 201
    data = res.json()
    headers = {"Authorization": f"Bearer {data['token']}"}
    return data["user"], headers


def test_unauthenticated_routes_return_401():
    """Verify all protected registry endpoints reject unauthenticated requests with 401."""
    client = TestClient(app)

    assert client.get("/api/tools").status_code == 401
    assert client.get("/api/logs").status_code == 401
    assert client.get("/api/providers").status_code == 401
    assert client.get("/api/settings/providers").status_code == 401
    assert client.get("/api/mcp-servers").status_code == 401
    assert client.get("/api/settings/mcp_servers").status_code == 401
    assert client.post("/api/chat", json={"message": "hello"}).status_code == 401


@pytest.mark.asyncio
async def test_tenant_data_isolation():
    """Verify User A and User B have separate tools and activity logs."""
    client = TestClient(app)

    user_a, headers_a = create_test_user(client, "user_a")
    user_b, headers_b = create_test_user(client, "user_b")

    # Add tool for User A directly in DB
    tool_a_name = f"tool_a_{uuid.uuid4().hex[:6]}"
    tool_b_name = f"tool_b_{uuid.uuid4().hex[:6]}"

    async with get_db() as db:
        await RegistryRepository.add_tool(
            db,
            user_id=user_a["id"],
            name=tool_a_name,
            description="User A's private tool",
            code="def run(): return 'A'",
            schema={"name": tool_a_name},
        )
        await RegistryRepository.add_log(
            db,
            user_id=user_a["id"],
            session_id=str(uuid.uuid4()),
            action="User A Action",
            details="Executed private task for A",
        )

        await RegistryRepository.add_tool(
            db,
            user_id=user_b["id"],
            name=tool_b_name,
            description="User B's private tool",
            code="def run(): return 'B'",
            schema={"name": tool_b_name},
        )
        await RegistryRepository.add_log(
            db,
            user_id=user_b["id"],
            session_id=str(uuid.uuid4()),
            action="User B Action",
            details="Executed private task for B",
        )

    # 1. User A lists tools: should see Tool A, but NOT Tool B
    tools_a_res = client.get("/api/tools", headers=headers_a)
    assert tools_a_res.status_code == 200
    tools_a = [t["name"] for t in tools_a_res.json()["tools"]]
    assert tool_a_name in tools_a
    assert tool_b_name not in tools_a

    # 2. User B lists tools: should see Tool B, but NOT Tool A
    tools_b_res = client.get("/api/tools", headers=headers_b)
    assert tools_b_res.status_code == 200
    tools_b = [t["name"] for t in tools_b_res.json()["tools"]]
    assert tool_b_name in tools_b
    assert tool_a_name not in tools_b

    # 3. User A lists logs: should see User A Action, but NOT User B Action
    logs_a_res = client.get("/api/logs", headers=headers_a)
    assert logs_a_res.status_code == 200
    logs_a = [l["action"] for l in logs_a_res.json()["logs"]]
    assert "User A Action" in logs_a
    assert "User B Action" not in logs_a

    # 4. User B lists logs: should see User B Action, but NOT User A Action
    logs_b_res = client.get("/api/logs", headers=headers_b)
    assert logs_b_res.status_code == 200
    logs_b = [l["action"] for l in logs_b_res.json()["logs"]]
    assert "User B Action" in logs_b
    assert "User A Action" not in logs_b


def test_shared_default_providers_and_mcp_servers():
    """Verify both tenants can view default system providers and MCP servers."""
    client = TestClient(app)

    _, headers_a = create_test_user(client, "tenant_a")
    _, headers_b = create_test_user(client, "tenant_b")

    # Providers
    prov_a = client.get("/api/providers", headers=headers_a).json()["providers"]
    prov_b = client.get("/api/providers", headers=headers_b).json()["providers"]
    assert len(prov_a) >= 3
    assert len(prov_b) >= 3
    assert {p["id"] for p in prov_a} == {p["id"] for p in prov_b}

    # MCP Servers
    mcp_a = client.get("/api/mcp-servers", headers=headers_a).json()["mcp_servers"]
    mcp_b = client.get("/api/mcp-servers", headers=headers_b).json()["mcp_servers"]
    assert len(mcp_a) >= 3
    assert len(mcp_b) >= 3
    assert {m["id"] for m in mcp_a} == {m["id"] for m in mcp_b}
