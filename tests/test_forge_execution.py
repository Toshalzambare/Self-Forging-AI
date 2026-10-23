"""
Test suite for Runtime Tool Execution and Core Node Execution Loop (Plan 04-04).
Tests:
- execute_tool sync & async function execution
- Execution error handling and execution timeout enforcement
- On-demand tool rehydration from PostgreSQL
- extract_tool_arguments LLM argument extraction
- core_node post-registration execution loop and grounded response synthesis
"""
import pytest
import pytest_asyncio
import os
import sys
import uuid
import time
from unittest.mock import patch, AsyncMock, MagicMock

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from registry.database import get_db, engine
from registry.repository import RegistryRepository
from registry.mcp_manager import dynamic_mcp_registry
from agents.execution.tool_runner import execute_tool, extract_tool_arguments
from agents.nodes.core import core_node
from langchain_core.messages import AIMessage, HumanMessage


@pytest_asyncio.fixture(autouse=True)
async def cleanup():
    dynamic_mcp_registry.clear()
    yield
    dynamic_mcp_registry.clear()
    await engine.dispose()


@pytest.mark.asyncio
async def test_execute_tool_sync_success():
    """Verify synchronous tool function execution and timing."""
    code = """
def execute(text: str, repeat: int = 1) -> str:
    return text * repeat
"""
    dynamic_mcp_registry.register_dynamic_tool(
        user_id="user_exec_1",
        tool_id="repeat_tool",
        name="repeat_tool",
        code=code,
    )

    res = await execute_tool(
        user_id="user_exec_1",
        tool_id_or_name="repeat_tool",
        arguments={"text": "abc", "repeat": 3},
    )

    assert res["success"] is True
    assert res["result"] == "abcabcabc"
    assert res["error"] is None
    assert res["execution_time_ms"] >= 0.0


@pytest.mark.asyncio
async def test_execute_tool_async_success():
    """Verify asynchronous tool function execution."""
    code = """
import asyncio
async def execute(val: int) -> int:
    await asyncio.sleep(0.01)
    return val * 10
"""
    dynamic_mcp_registry.register_dynamic_tool(
        user_id="user_exec_async",
        tool_id="async_tool",
        name="async_tool",
        code=code,
    )

    res = await execute_tool(
        user_id="user_exec_async",
        tool_id_or_name="async_tool",
        arguments={"val": 5},
    )

    assert res["success"] is True
    assert res["result"] == 50
    assert res["error"] is None


@pytest.mark.asyncio
async def test_execute_tool_runtime_error_captured():
    """Verify exceptions inside the tool function are caught without crashing."""
    code = """
def execute(dividend: int, divisor: int) -> float:
    return dividend / divisor
"""
    dynamic_mcp_registry.register_dynamic_tool(
        user_id="user_err",
        tool_id="div_tool",
        name="div_tool",
        code=code,
    )

    res = await execute_tool(
        user_id="user_err",
        tool_id_or_name="div_tool",
        arguments={"dividend": 10, "divisor": 0},
    )

    assert res["success"] is False
    assert res["result"] is None
    assert "division by zero" in res["error"]


@pytest.mark.asyncio
async def test_execute_tool_timeout_enforcement():
    """Verify execution exceeding timeout limit is cleanly aborted."""
    code = """
import time
def execute() -> str:
    time.sleep(2)
    return "done"
"""
    dynamic_mcp_registry.register_dynamic_tool(
        user_id="user_timeout",
        tool_id="sleep_tool",
        name="sleep_tool",
        code=code,
    )

    res = await execute_tool(
        user_id="user_timeout",
        tool_id_or_name="sleep_tool",
        arguments={},
        timeout=1,
    )

    assert res["success"] is False
    assert "timed out" in res["error"].lower()


@pytest.mark.asyncio
async def test_execute_tool_ondemand_db_rehydration():
    """Verify tool is rehydrated from PostgreSQL if missing from in-memory cache."""
    test_user_id = str(uuid.uuid4())
    async with get_db() as db:
        user = await RegistryRepository.create_user(
            db,
            email=f"rehydrate_{test_user_id[:8]}@example.com",
            username=f"rehydrate_{test_user_id[:8]}",
            password_hash="fakehash",
        )
        test_user_id = user.id

        tool = await RegistryRepository.add_tool(
            db,
            name="math_cube",
            description="Computes cube of a number",
            code="def execute(n: int) -> int: return n ** 3",
            schema={"type": "object"},
            user_id=test_user_id,
        )
        tool_id = tool.id

    # Ensure in-memory cache does NOT have it
    dynamic_mcp_registry.clear()
    assert dynamic_mcp_registry.get_tool_callable(test_user_id, tool_id) is None

    # Execute tool: should rehydrate from DB and execute
    res = await execute_tool(
        user_id=test_user_id,
        tool_id_or_name=tool_id,
        arguments={"n": 4},
    )

    assert res["success"] is True
    assert res["result"] == 64

    # Now verify it's also cached in memory
    assert dynamic_mcp_registry.get_tool_callable(test_user_id, tool_id) is not None


@pytest.mark.asyncio
async def test_extract_tool_arguments_llm():
    """Verify extract_tool_arguments parses arguments matching schema."""
    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(
        return_value=AIMessage(content='```json\n{"base": 10, "exp": 3}\n```')
    )

    with patch("agents.execution.tool_runner.llm", mock_llm):
        args = await extract_tool_arguments(
            user_task="Calculate 10 to the power of 3",
            tool_name="power_tool",
            schema={"properties": {"base": {"type": "integer"}, "exp": {"type": "integer"}}},
        )
        assert args == {"base": 10, "exp": 3}


@pytest.mark.asyncio
async def test_core_node_runtime_execution_loop():
    """Verify core_node executes registered tool and grounds final answer."""
    tool_code = "def execute(query: str) -> str: return f'Result for {query.upper()}'"
    dynamic_mcp_registry.register_dynamic_tool(
        user_id="test_user_core",
        tool_id="query_processor",
        name="query_processor",
        code=tool_code,
    )

    state = {
        "messages": [HumanMessage(content="Search for python")],
        "task": "Search for python",
        "is_registered": True,
        "registered_tool_id": "query_processor",
        "generated_schema": {"type": "object", "properties": {"query": {"type": "string"}}},
        "user_id": "test_user_core",
        "tests_passed": True,
    }

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(side_effect=[
        # 1. extract_tool_arguments
        AIMessage(content='{"query": "python"}'),
        # 2. final answer synthesis
        AIMessage(content="The search found: Result for PYTHON.")
    ])

    with patch("agents.nodes.core.llm", mock_llm):
        with patch("agents.execution.tool_runner.llm", mock_llm):
            result = await core_node(state)

            assert result["missing_capability"] == ""
            assert len(result["messages"]) == 1
            ai_msg = result["messages"][0]
            assert "The search found: Result for PYTHON." in ai_msg.content
            forge_data = ai_msg.additional_kwargs.get("forge_data", {})
            assert forge_data.get("is_tool_forged") is True
            assert forge_data.get("result") == "Result for PYTHON"
            assert forge_data.get("tool_id") == "query_processor"


@pytest.mark.asyncio
async def test_execute_tool_rejects_cross_tenant_rehydration():
    """Verify execute_tool refuses to rehydrate or execute a tool belonging to another tenant."""
    async with get_db() as db:
        user_a = await RegistryRepository.create_user(
            db,
            email=f"tenant_a_{uuid.uuid4().hex[:6]}@example.com",
            username=f"tenant_a_{uuid.uuid4().hex[:6]}",
            password_hash="fakehash",
        )
        tool_a = await RegistryRepository.add_tool(
            db,
            name="private_tool_a",
            description="Tenant A private logic",
            code="def execute() -> str: return 'tenant_a_secret'",
            schema={"type": "object"},
            user_id=user_a.id,
        )
        tool_id = tool_a.id

    dynamic_mcp_registry.clear()

    # User B attempts to execute Tenant A's tool
    res = await execute_tool(
        user_id="tenant_b_attacker",
        tool_id_or_name=tool_id,
        arguments={},
    )

    assert res["success"] is False
    assert "not found" in res["error"].lower()
    # Ensure tool was NOT registered into memory under tenant_a or tenant_b
    assert dynamic_mcp_registry.get_tool_callable("tenant_b_attacker", tool_id) is None
    assert dynamic_mcp_registry.get_tool_callable(user_a.id, tool_id) is None

