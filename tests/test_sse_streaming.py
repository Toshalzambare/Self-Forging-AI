"""
Test suite for Server-Sent Events (SSE) Streaming Architecture (Plan 08-01):
- SSE format serialization
- Session listener queue registration, dispatch, and cleanup
- Stream endpoint response headers and event sequencing
- Real-time token streaming and lifecycle event handling
- Tenant isolation and unauthorized request rejection
"""
import asyncio
import os
import sys
import uuid
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from main import app
from auth.dependencies import get_current_user
from conversation.sse_stream import format_sse
from observability.events import (
    register_session_listener,
    unregister_session_listener,
    emit_agent_event,
    _SESSION_LISTENERS,
)
from conversation.stream_service import stream_conversation_events


def test_format_sse_serialization():
    """Verify standards-compliant SSE event frame serialization."""
    frame_dict = format_sse("token", {"chunk": "Hello "})
    assert frame_dict.startswith("event: token\n")
    assert 'data: {"chunk": "Hello "}' in frame_dict
    assert frame_dict.endswith("\n\n")

    frame_str = format_sse("ping", "pong")
    assert frame_str == "event: ping\ndata: pong\n\n"


@pytest.mark.asyncio
async def test_session_listener_lifecycle():
    """Verify registering, dispatching, and unregistering SSE listener queues."""
    test_sid = str(uuid.uuid4())
    queue: asyncio.Queue = asyncio.Queue()

    register_session_listener(test_sid, queue)
    assert test_sid in _SESSION_LISTENERS
    assert queue in _SESSION_LISTENERS[test_sid]

    # Emit event and verify queue receives it
    await emit_agent_event(
        user_id="test_uid",
        session_id=test_sid,
        event="AGENT_THINKING",
        status="in_progress",
        summary="Testing listener",
    )

    item = await asyncio.wait_for(queue.get(), timeout=2.0)
    assert item["type"] == "lifecycle"
    assert item["payload"]["event"] == "AGENT_THINKING"
    assert item["payload"]["summary"] == "Testing listener"

    unregister_session_listener(test_sid, queue)
    assert test_sid not in _SESSION_LISTENERS


def test_stream_unauthorized():
    """Verify endpoint rejects unauthenticated requests with 401."""
    app.dependency_overrides.pop(get_current_user, None)
    with TestClient(app) as client:
        res = client.post(
            f"/api/conversations/{uuid.uuid4()}/stream",
            json={"message": "Calculate Fibonacci"}
        )
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_stream_conversation_not_found_event():
    """Verify stream yields error event when conversation is not found."""
    test_cid = str(uuid.uuid4())
    test_uid = str(uuid.uuid4())

    with patch("conversation.stream_service.get_db") as mock_get_db:
        mock_session = AsyncMock()
        mock_get_db.return_value.__aenter__.return_value = mock_session
        with patch("conversation.service.ConversationService.get_conversation", return_value=None):
            events = []
            async for ev in stream_conversation_events(test_cid, "hello", test_uid):
                events.append(ev)

            assert len(events) == 1
            assert "event: error" in events[0]
            assert "Conversation not found" in events[0]


def test_stream_route_headers_and_event_flow():
    """Verify /api/conversations/{id}/stream route returns 200 text/event-stream with SSE events."""
    test_user = MagicMock()
    test_user.id = uuid.uuid4()
    test_cid = str(uuid.uuid4())

    async def fake_stream_events(*args, **kwargs):
        yield format_sse("lifecycle", {"event": "AGENT_THINKING", "status": "in_progress"})
        yield format_sse("token", {"chunk": "The 35th "})
        yield format_sse("token", {"chunk": "Fibonacci number is 9,227,465."})
        yield format_sse("done", {"message_id": "msg-123", "reply": "Done"})

    app.dependency_overrides[get_current_user] = lambda: test_user
    try:
        with patch("conversation.router.stream_conversation_events", side_effect=fake_stream_events):
            with TestClient(app) as client:
                res = client.post(
                    f"/api/conversations/{test_cid}/stream",
                    json={"message": "Calculate the 35th Fibonacci number."}
                )

                assert res.status_code == 200
                assert "text/event-stream" in res.headers["content-type"]
                assert res.headers.get("cache-control") == "no-cache"

                body = res.text
                assert "event: lifecycle" in body
                assert "AGENT_THINKING" in body
                assert "event: token" in body
                assert "The 35th " in body
                assert "event: done" in body
                assert "msg-123" in body
    finally:
        app.dependency_overrides.pop(get_current_user, None)
