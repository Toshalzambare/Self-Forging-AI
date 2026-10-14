"""
Tests for Modular Settings API (Plan 07-03).
Covers Profile, Model Providers, Sandbox Configuration, and MCP Server Connectivity.
"""

import sys
import os
import uuid
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import pytest
from httpx import AsyncClient, ASGITransport

from main import app
from registry import get_db, User
from auth.security import create_access_token, hash_password


async def _create_settings_user(prefix: str = "settings_tester") -> tuple[User, str]:
    uid = uuid.uuid4().hex[:6]
    async with get_db() as db:
        user = User(
            email=f"{prefix}_{uid}@example.com",
            username=f"{prefix}_{uid}",
            password_hash=hash_password("SettingsPass123!"),
            is_active=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    token = create_access_token(user_id=str(user.id), email=user.email)
    return user, token


@pytest.mark.asyncio
async def test_settings_unauthenticated_returns_401():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        assert (await ac.get("/api/settings/profile")).status_code == 401
        assert (await ac.get("/api/settings/sandbox")).status_code == 401
        assert (await ac.get("/api/settings/providers")).status_code == 401
        assert (await ac.get("/api/settings/mcp_servers")).status_code == 401


@pytest.mark.asyncio
async def test_settings_profile():
    user, token = await _create_settings_user("prof")
    headers = {"Authorization": f"Bearer {token}"}
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/settings/profile", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == str(user.id)
        assert "active_model" in data
        assert "active_endpoint" in data
        assert data["active_provider"] == "OmniRoute"


@pytest.mark.asyncio
async def test_settings_sandbox_lifecycle():
    _, token = await _create_settings_user("sandbox")
    headers = {"Authorization": f"Bearer {token}"}
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Get default sandbox config
        res = await ac.get("/api/settings/sandbox", headers=headers)
        assert res.status_code == 200
        cfg = res.json()["sandbox"]
        assert "image" in cfg
        assert "memory_limit" in cfg
        assert "timeout_seconds" in cfg
        assert "network_mode" in cfg

        # Patch sandbox config
        patch_res = await ac.patch(
            "/api/settings/sandbox",
            headers=headers,
            json={"memory_limit": "1024m", "timeout_seconds": 45, "network_mode": "bridge"},
        )
        assert patch_res.status_code == 200
        updated = patch_res.json()["sandbox"]
        assert updated["memory_limit"] == "1024m"
        assert updated["timeout_seconds"] == 45
        assert updated["network_mode"] == "bridge"


@pytest.mark.asyncio
async def test_settings_providers_and_patch():
    _, token = await _create_settings_user("providers")
    headers = {"Authorization": f"Bearer {token}"}
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # List providers
        res = await ac.get("/api/settings/providers", headers=headers)
        assert res.status_code == 200
        providers = res.json()["providers"]
        assert len(providers) >= 3
        target_id = providers[0]["id"]

        # Patch provider api key
        patch_res = await ac.patch(
            f"/api/settings/providers/{target_id}",
            headers=headers,
            json={"api_key": "sk-test-secret-key-12345", "is_active": True},
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["status"] == "success"


@pytest.mark.asyncio
async def test_settings_mcp_servers_crud_and_test_ping():
    _, token = await _create_settings_user("mcp")
    headers = {"Authorization": f"Bearer {token}"}
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Create MCP Server
        create_res = await ac.post(
            "/api/settings/mcp_servers",
            headers=headers,
            json={"name": "Custom Weather MCP", "url": "http://127.0.0.1:8999"},
        )
        assert create_res.status_code == 201
        server_id = create_res.json()["mcp_server"]["id"]

        # List MCP Servers
        list_res = await ac.get("/api/settings/mcp_servers", headers=headers)
        assert list_res.status_code == 200
        server_ids = [s["id"] for s in list_res.json()["mcp_servers"]]
        assert server_id in server_ids

        # Test MCP Server ping
        test_res = await ac.post(
            "/api/settings/mcp_servers/test",
            headers=headers,
            json={"url": "http://127.0.0.1:9"},
        )
        assert test_res.status_code == 200
        ping_result = test_res.json()
        assert "status" in ping_result
        assert "latency_ms" in ping_result

        # Delete MCP Server
        del_res = await ac.delete(f"/api/settings/mcp_servers/{server_id}", headers=headers)
        assert del_res.status_code == 204
