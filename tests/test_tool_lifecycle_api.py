"""
Test suite for Tool Lifecycle API: Metrics, Status Toggle & Deletion (Plan 05-01).
Tests:
- GET /api/tools returns full metrics (reuse_count, success_rate, gate_score, last_used_at)
- PATCH /api/tools/{tool_id}/status toggles active/inactive and evicts from dynamic MCP cache
- Cross-tenant isolation on PATCH and DELETE (rejecting foreign tenant mutations)
- DELETE /api/tools/{tool_id} deletes from DB and memory
- Inactive tools are ignored by HybridToolSearcher
"""
import pytest
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
from agents.search.hybrid_search import HybridToolSearcher


@pytest.fixture(autouse=True)
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
async def test_list_tools_returns_dual_gate_metrics():
    """Verify GET /api/tools returns full metrics dictionary."""
    user, headers = await _create_test_user_and_headers("metrics_user")

    async with get_db() as db:
        tool = await RegistryRepository.add_tool(
            db,
            name="metric_calc",
            description="Performs calculations with metrics",
            code="def execute(a, b): return a + b",
            schema={"type": "object"},
            tests_code="def test_calc(): pass",
            user_id=user.id,
        )
        tool.reuse_count = 5
        tool.success_rate = 0.98
        tool.gate_score = 0.95
        await db.flush()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/tools", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] >= 1
        matched = next((t for t in data["tools"] if t["id"] == str(tool.id)), None)
        assert matched is not None
        assert matched["name"] == "metric_calc"
        assert matched["reuse_count"] == 5
        assert matched["success_rate"] == 0.98
        assert matched["gate_score"] == 0.95
        assert matched["tests_code"] == "def test_calc(): pass"
        assert matched["status"] == "active"


@pytest.mark.asyncio
async def test_patch_tool_status_toggle_and_eviction():
    """Verify PATCH /api/tools/{tool_id}/status updates DB and evicts from dynamic MCP cache."""
    user, headers = await _create_test_user_and_headers("status_user")

    async with get_db() as db:
        tool = await RegistryRepository.add_tool(
            db,
            name="toggle_tool",
            description="Toggles on and off",
            code="def execute(): return 'active'",
            schema={},
            user_id=user.id,
        )
        tool_id = str(tool.id)

    # Hot-swap into dynamic MCP registry
    dynamic_mcp_registry.register_dynamic_tool(
        user_id=str(user.id),
        tool_id=tool_id,
        name="toggle_tool",
        code="def execute(): return 'active'",
    )
    assert dynamic_mcp_registry.get_tool_callable(str(user.id), tool_id) is not None

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Update to inactive
        patch_resp = await client.patch(
            f"/api/tools/{tool_id}/status",
            json={"status": "inactive"},
            headers=headers,
        )
        assert patch_resp.status_code == 200
        patch_data = patch_resp.json()
        assert patch_data["new_status"] == "inactive"

        # Verify evicted from dynamic MCP cache
        assert dynamic_mcp_registry.get_tool_callable(str(user.id), tool_id) is None

        # 2. Reject invalid status
        invalid_resp = await client.patch(
            f"/api/tools/{tool_id}/status",
            json={"status": "invalid_status_xyz"},
            headers=headers,
        )
        assert invalid_resp.status_code == 400
        assert "Invalid status" in invalid_resp.json()["detail"]


@pytest.mark.asyncio
async def test_cross_tenant_tool_mutation_protection():
    """Verify User B cannot toggle status or delete User A's tool."""
    user_a, headers_a = await _create_test_user_and_headers("tenant_owner")
    user_b, headers_b = await _create_test_user_and_headers("tenant_attacker")

    async with get_db() as db:
        tool_a = await RegistryRepository.add_tool(
            db,
            name="owner_tool",
            description="Owner's private tool",
            code="def execute(): return 'secret'",
            schema={},
            user_id=user_a.id,
        )
        tool_a_id = str(tool_a.id)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # User B attempts to change status of User A's tool
        patch_resp = await client.patch(
            f"/api/tools/{tool_a_id}/status",
            json={"status": "inactive"},
            headers=headers_b,
        )
        assert patch_resp.status_code == 404

        # User B attempts to delete User A's tool
        del_resp = await client.delete(
            f"/api/tools/{tool_a_id}",
            headers=headers_b,
        )
        assert del_resp.status_code == 404

    # Verify tool A is still intact in DB
    async with get_db() as db:
        tool = await RegistryRepository.get_tool(db, tool_a_id)
        assert tool is not None
        assert tool.status == "active"


@pytest.mark.asyncio
async def test_delete_tool_success_and_cache_eviction():
    """Verify DELETE /api/tools/{tool_id} deletes tool from DB and dynamic MCP cache."""
    user, headers = await _create_test_user_and_headers("del_user")

    async with get_db() as db:
        tool = await RegistryRepository.add_tool(
            db,
            name="temp_tool",
            description="Temporary tool for deletion test",
            code="def execute(): return 'delete_me'",
            schema={},
            user_id=user.id,
        )
        tool_id = str(tool.id)

    dynamic_mcp_registry.register_dynamic_tool(
        user_id=str(user.id),
        tool_id=tool_id,
        name="temp_tool",
        code="def execute(): return 'delete_me'",
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        del_resp = await client.delete(f"/api/tools/{tool_id}", headers=headers)
        assert del_resp.status_code == 200
        assert del_resp.json()["status"] == "success"

    # Verify deleted from DB
    async with get_db() as db:
        assert await RegistryRepository.get_tool(db, tool_id) is None

    # Verify evicted from dynamic MCP cache
    assert dynamic_mcp_registry.get_tool_callable(str(user.id), tool_id) is None


@pytest.mark.asyncio
async def test_hybrid_search_skips_inactive_tools():
    """Verify HybridToolSearcher ignores tools whose status is inactive."""
    user, _ = await _create_test_user_and_headers("search_toggle_user")

    async with get_db() as db:
        tool = await RegistryRepository.add_tool(
            db,
            name="inactive_currency_converter",
            description="Convert USD to EUR and foreign currencies",
            code="def execute(amount): return amount * 0.9",
            schema={"properties": {"amount": {"type": "number"}}},
            user_id=user.id,
            status="inactive",
        )

        match = await HybridToolSearcher.search(
            db=db,
            task="Convert USD to EUR currency",
            user_id=str(user.id),
        )
        # Should not match because status is inactive
        if match:
            assert match.tool.id != tool.id


@pytest.mark.asyncio
async def test_reactivate_tool_restores_mcp_registration():
    """Verify reactivating an inactive tool registers it back into dynamic MCP."""
    user, headers = await _create_test_user_and_headers("reactivate_user")

    async with get_db() as db:
        tool = await RegistryRepository.add_tool(
            db,
            name="reactivatable_tool",
            description="Tool to test reactivation",
            code="def execute(): return 'reactivated'",
            schema={},
            user_id=user.id,
            status="inactive",
        )
        tool_id = str(tool.id)

    # Initially not in dynamic registry
    assert dynamic_mcp_registry.get_tool_callable(str(user.id), tool_id) is None

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.patch(
            f"/api/tools/{tool_id}/status",
            headers=headers,
            json={"status": "active"},
        )
        assert resp.status_code == 200
        assert resp.json()["new_status"] == "active"

    # Now it must be registered and executable in dynamic MCP
    func = dynamic_mcp_registry.get_tool_callable(str(user.id), tool_id)
    assert func is not None
    assert func() == "reactivated"


@pytest.mark.asyncio
async def test_global_tools_cannot_be_mutated_or_deleted_by_tenants():
    """Verify tenants cannot mutate or delete global system tools (user_id is None)."""
    user, headers = await _create_test_user_and_headers("regular_tenant")

    async with get_db() as db:
        global_tool = await RegistryRepository.add_tool(
            db,
            name="global_system_tool",
            description="Global tool available to all tenants",
            code="def execute(): return 'system'",
            schema={},
            user_id=None,  # Global tool
        )
        global_id = str(global_tool.id)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Attempt to deactivate global tool
        patch_resp = await client.patch(
            f"/api/tools/{global_id}/status",
            headers=headers,
            json={"status": "inactive"},
        )
        assert patch_resp.status_code in (403, 404)

        # Attempt to delete global tool
        del_resp = await client.delete(
            f"/api/tools/{global_id}",
            headers=headers,
        )
        assert del_resp.status_code in (403, 404)

    # Ensure tool still exists and is untouched
    async with get_db() as db:
        tool_in_db = await RegistryRepository.get_tool(db, global_id)
        assert tool_in_db is not None
        assert tool_in_db.status == "active"

