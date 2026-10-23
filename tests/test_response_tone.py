"""
Tests for Conversational Response Grounding and Tone Polish (STREAM-02).
Verifies that assistant messages provide natural, warm answers without raw code/schema dumps.
"""
import os
import sys
import pytest
from unittest.mock import AsyncMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from langchain_core.messages import AIMessage
from agents.nodes.runtime_exec import handle_runtime_execution


@pytest.mark.asyncio
async def test_runtime_exec_conversational_response_and_forge_data():
    """Verify runtime execution grounds answer warmly and places technical data in forge_data."""
    mock_llm = AsyncMock()
    mock_llm.ainvoke = AsyncMock(
        return_value=AIMessage(
            content="The 45th Fibonacci number is **1,134,903,170**. I calculated this using dynamic programming for optimal speed."
        )
    )

    state = {
        "registered_tool_id": "calculate_fibonacci",
        "user_id": "user-test-123",
        "generated_schema": {"type": "object", "properties": {"n": {"type": "integer"}}},
        "task": "Compute the 45th Fibonacci number",
        "session_id": "session-456",
        "tests_passed": True,
    }

    with patch("agents.nodes.runtime_exec.extract_tool_arguments", AsyncMock(return_value={"n": 45})), \
         patch("agents.nodes.runtime_exec.execute_tool", AsyncMock(return_value={"success": True, "result": 1134903170, "execution_time_ms": 1.2})), \
         patch("agents.nodes.runtime_exec.llm", mock_llm), \
         patch("agents.nodes.runtime_exec.emit_agent_event", AsyncMock()):

        output = await handle_runtime_execution(state)

    messages = output.get("messages", [])
    assert len(messages) == 1
    ai_msg = messages[0]

    # Verify natural answer presence
    assert "1,134,903,170" in ai_msg.content
    # Verify no raw python function definitions or schema clutter in chat bubble
    assert "def execute(" not in ai_msg.content
    assert "json_schema" not in ai_msg.content
    assert "pytest" not in ai_msg.content

    # Verify technical metadata preserved for Activity Drawer
    forge_data = ai_msg.additional_kwargs.get("forge_data", {})
    assert forge_data.get("is_tool_forged") is True
    assert forge_data.get("tool_id") == "calculate_fibonacci"
    assert forge_data.get("arguments") == {"n": 45}
    assert forge_data.get("result") == 1134903170
    assert forge_data.get("execution_time_ms") == 1.2
    assert forge_data.get("tests_passed") is True


@pytest.mark.asyncio
async def test_runtime_exec_token_streaming_callback():
    """Verify token_callback streams incremental text chunks during synthesis."""
    collected_tokens = []

    def on_token(token: str):
        collected_tokens.append(token)

    async def mock_astream(*args, **kwargs):
        chunks = ["The ", "result ", "is ", "42."]
        for c in chunks:
            yield AIMessage(content=c)

    mock_llm = AsyncMock()
    mock_llm.astream = mock_astream

    state = {
        "registered_tool_id": "test_tool",
        "user_id": "user-123",
        "generated_schema": {},
        "task": "What is the answer?",
        "session_id": "sess-1",
        "token_callback": on_token,
    }

    with patch("agents.nodes.runtime_exec.extract_tool_arguments", AsyncMock(return_value={})), \
         patch("agents.nodes.runtime_exec.execute_tool", AsyncMock(return_value={"success": True, "result": 42})), \
         patch("agents.nodes.runtime_exec.llm", mock_llm), \
         patch("agents.nodes.runtime_exec.emit_agent_event", AsyncMock()):

        output = await handle_runtime_execution(state)

    assert "".join(collected_tokens) == "The result is 42."
    ai_msg = output["messages"][0]
    assert ai_msg.content == "The result is 42."
