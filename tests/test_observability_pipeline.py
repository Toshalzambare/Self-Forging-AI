"""
Tests for Observability Pipeline (Phase 6):
WebSocket Authentication, Event Broadcasting, Database Persistence, and Filtered Logs API.
"""

import uuid
import os
import sys
import pytest

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect
from httpx import AsyncClient, ASGITransport

from main import app
from registry import get_db, RegistryRepository, User
from auth.security import create_access_token, hash_password
from observability import emit_agent_event, AgentLifecycleEvent, connection_manager


async def _create_test_user(identifier: str) -> tuple[User, str]:
    """Helper creating user in PostgreSQL and returning (User, access_token)."""
    uid = uuid.uuid4().hex[:6]
    async with get_db() as db:
        user = User(
            email=f"{identifier}_{uid}@example.com",
            username=f"{identifier}_{uid}",
            password_hash=hash_password("ValidPass123!"),
            is_active=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    token = create_access_token(user_id=str(user.id), email=user.email)
    return user, token


def test_websocket_missing_token_rejected():
    """Verify connecting to WebSocket without a token is rejected with code 4003."""
    client = TestClient(app)
    fake_user_id = str(uuid.uuid4())
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect(f"/ws/logs/{fake_user_id}") as ws:
            ws.receive_text()
    assert exc.value.code == 4003


def test_websocket_invalid_token_rejected():
    """Verify connecting to WebSocket with an invalid token is rejected with code 4003."""
    client = TestClient(app)
    fake_user_id = str(uuid.uuid4())
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect(f"/ws/logs/{fake_user_id}?token=invalid.jwt.token") as ws:
            ws.receive_text()
    assert exc.value.code == 4003


@pytest.mark.asyncio
async def test_websocket_cross_user_token_rejected():
    """Verify User B's token cannot connect to User A's WebSocket stream."""
    user_a, _ = await _create_test_user("user_a")
    _, token_b = await _create_test_user("user_b")

    client = TestClient(app)
    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect(f"/ws/logs/{user_a.id}?token={token_b}") as ws:
            ws.receive_text()
    assert exc.value.code == 4003


@pytest.mark.asyncio
async def test_websocket_valid_connection_and_event_broadcast():
    """Verify valid connection receives connection ack, ping-pong, and real-time broadcasts."""
    user, token = await _create_test_user("ws_broadcast_user")
    session_id = f"session_{uuid.uuid4().hex[:8]}"

    client = TestClient(app)
    with client.websocket_connect(f"/ws/logs/{user.id}?token={token}") as ws:
        # 1. Receive connection confirmation
        ack = ws.receive_json()
        assert ack["type"] == "CONNECTION_ESTABLISHED"
        assert ack["user_id"] == str(user.id)

        # 2. Ping-pong keepalive
        ws.send_text("ping")
        assert ws.receive_text() == "pong"

        # 3. Emit lifecycle event and verify received
        await emit_agent_event(
            user_id=str(user.id),
            session_id=session_id,
            event=AgentLifecycleEvent.FORGE_STARTED,
            status="in_progress",
            summary="Synthesizing currency conversion tool...",
            data={"tool_name": "currency_converter"},
        )

        event = ws.receive_json()
        assert event["type"] == "AGENT_LIFECYCLE_EVENT"
        assert event["event"] == "FORGE_STARTED"
        assert event["session_id"] == session_id
        assert event["status"] == "in_progress"
        assert "currency conversion" in event["summary"]
        assert event["data"]["tool_name"] == "currency_converter"


@pytest.mark.asyncio
async def test_emit_agent_event_persists_to_activity_logs():
    """Verify emit_agent_event writes an ActivityLog entry to PostgreSQL."""
    user, _ = await _create_test_user("persist_user")
    session_id = f"session_{uuid.uuid4().hex[:8]}"

    await emit_agent_event(
        user_id=str(user.id),
        session_id=session_id,
        event=AgentLifecycleEvent.SANDBOX_TESTING,
        status="in_progress",
        summary="Running pytest test suite...",
        data={"attempt": 1},
    )

    async with get_db() as db:
        logs = await RegistryRepository.list_logs(db, user_id=str(user.id), session_id=session_id)
        assert len(logs) == 1
        log = logs[0]
        assert log.action == "SANDBOX_TESTING"
        assert log.status == "in_progress"
        assert log.session_id == session_id
        assert "Running pytest" in log.details


@pytest.mark.asyncio
async def test_get_api_logs_filtering_and_tenant_isolation():
    """Verify GET /api/logs filtering by session_id, status, and tenant isolation."""
    user_a, token_a = await _create_test_user("tenant_a")
    user_b, token_b = await _create_test_user("tenant_b")

    sess_1 = "sess_1"
    sess_2 = "sess_2"

    # Emit logs for User A
    await emit_agent_event(str(user_a.id), sess_1, AgentLifecycleEvent.AGENT_THINKING, "in_progress", "Thinking 1")
    await emit_agent_event(str(user_a.id), sess_1, AgentLifecycleEvent.TOOL_VERIFIED, "success", "Verified 1")
    await emit_agent_event(str(user_a.id), sess_2, AgentLifecycleEvent.TOOL_FAILED, "failed", "Failed 2")

    # Emit log for User B
    await emit_agent_event(str(user_b.id), sess_1, AgentLifecycleEvent.TOOL_VERIFIED, "success", "User B log")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. User A lists all their logs (3 logs)
        resp = await client.get("/api/logs", headers=headers_a)
        assert resp.status_code == 200
        logs = resp.json()["logs"]
        assert len(logs) == 3
        # Should not see User B's log
        assert not any("User B" in l["details"] for l in logs)

        # 2. User A filters by session_id=sess_1 (2 logs)
        resp_sess = await client.get(f"/api/logs?session_id={sess_1}", headers=headers_a)
        assert resp_sess.status_code == 200
        sess_logs = resp_sess.json()["logs"]
        assert len(sess_logs) == 2
        assert all(l["session_id"] == sess_1 for l in sess_logs)

        # 3. User A filters by status=failed (1 log)
        resp_status = await client.get("/api/logs?status=failed", headers=headers_a)
        assert resp_status.status_code == 200
        fail_logs = resp_status.json()["logs"]
        assert len(fail_logs) == 1
        assert fail_logs[0]["status"] == "failed"

        # 4. User B only sees their 1 log
        resp_b = await client.get("/api/logs", headers=headers_b)
        assert resp_b.status_code == 200
        b_logs = resp_b.json()["logs"]
        assert len(b_logs) == 1
        assert "User B" in b_logs[0]["details"]
