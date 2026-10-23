"""
Tests for Thinking & Activity Event Stream Pipeline (Plan 09-01).
Verifies:
1. Emission of `thinking` events during AGENT_THINKING transitions.
2. Emission of `activity` events during code/sandbox transitions.
3. Proper SSE serialization of `event: thinking` and `event: activity`.
4. Inclusion of code, tests, and sandbox logs in forge_data.
"""
import asyncio
import os
import sys
import uuid
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from conversation.sse_stream import format_sse
from observability.events import (
    register_session_listener,
    unregister_session_listener,
    emit_agent_event,
    AgentLifecycleEvent,
)


@pytest.mark.asyncio
async def test_thinking_event_dispatch_to_session_listener():
    """Verify that AGENT_THINKING emits both lifecycle and thinking SSE events."""
    session_id = f"test-sess-{uuid.uuid4().hex[:8]}"
    queue = asyncio.Queue()
    register_session_listener(session_id, queue)

    try:
        with patch("observability.events.connection_manager.broadcast_user", AsyncMock()), \
             patch("observability.events.RegistryRepository.add_log", AsyncMock()):
            await emit_agent_event(
                user_id="user-123",
                session_id=session_id,
                event=AgentLifecycleEvent.AGENT_THINKING,
                status="in_progress",
                summary="Evaluating capabilities and searching tool registry...",
                data={"thought": "User wants to compute prime factors. Checking tool index..."},
            )

        events_received = []
        while not queue.empty():
            events_received.append(queue.get_nowait())

        # Must have received both lifecycle and thinking events
        types = [e["type"] for e in events_received]
        assert "lifecycle" in types
        assert "thinking" in types

        thinking_event = next(e for e in events_received if e["type"] == "thinking")
        assert "User wants to compute prime factors" in thinking_event["payload"]["thought"]

        # Check format_sse serialization
        sse_str = format_sse(thinking_event["type"], thinking_event["payload"])
        assert sse_str.startswith("event: thinking\n")
        assert "User wants to compute prime factors" in sse_str
    finally:
        unregister_session_listener(session_id, queue)


@pytest.mark.asyncio
async def test_activity_event_dispatch_to_session_listener():
    """Verify that sandbox and tool lifecycle events dispatch activity events."""
    session_id = f"test-sess-{uuid.uuid4().hex[:8]}"
    queue = asyncio.Queue()
    register_session_listener(session_id, queue)

    try:
        with patch("observability.events.connection_manager.broadcast_user", AsyncMock()), \
             patch("observability.events.RegistryRepository.add_log", AsyncMock()):
            await emit_agent_event(
                user_id="user-123",
                session_id=session_id,
                event=AgentLifecycleEvent.TOOL_VERIFIED,
                status="success",
                summary="Sandbox test verification passed successfully.",
                data={"logs": "pytest stdout: 3 passed in 0.22s", "tool_id": "factor_prime"},
            )

        events_received = []
        while not queue.empty():
            events_received.append(queue.get_nowait())

        types = [e["type"] for e in events_received]
        assert "lifecycle" in types
        assert "activity" in types

        activity_event = next(e for e in events_received if e["type"] == "activity")
        assert activity_event["payload"]["event"] == "TOOL_VERIFIED"
        assert "pytest stdout" in activity_event["payload"]["data"]["logs"]

        # Check format_sse serialization
        sse_str = format_sse(activity_event["type"], activity_event["payload"])
        assert sse_str.startswith("event: activity\n")
        assert "pytest stdout" in sse_str
    finally:
        unregister_session_listener(session_id, queue)
