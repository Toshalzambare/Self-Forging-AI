"""
Unit & Integration test suite for Persistent Tool Registration and Dynamic MCP Hot-Swapping (Plan 04-03).
Tests:
- DynamicMcpRegistry compilation, execution, and multi-tenant namespace isolation
- Error handling on invalid tool code or missing execute callable
- register_node persistence to PostgreSQL and automatic hot-swap into in-memory MCP registry
"""
import pytest
import os
import sys
import uuid

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from registry.database import get_db, engine
from registry.repository import RegistryRepository
from registry.mcp_manager import DynamicMcpRegistry, dynamic_mcp_registry
from agents.nodes.register import register_node, _infer_tool_name


@pytest.fixture(autouse=True)
async def cleanup():
    """Clear in-memory MCP registry between test runs."""
    dynamic_mcp_registry.clear()
    yield
    dynamic_mcp_registry.clear()
    await engine.dispose()


def test_infer_tool_name_strategies():
    """Verify tool name extraction from schema, capability, and fallback."""
    # From title
    assert _infer_tool_name({"title": "Calculate Prime Numbers"}, "") == "calculate_prime_numbers"
    # From name
    assert _infer_tool_name({"name": "fetch_weather_api"}, "") == "fetch_weather_api"
    # From capability
    name = _infer_tool_name({}, "extract metadata from pdf documents")
    assert "extract" in name and "metadata" in name and "pdf" in name
    # Fallback
    fallback = _infer_tool_name({}, "")
    assert fallback.startswith("forged_tool_")


def test_dynamic_mcp_registry_compilation_and_execution():
    """Verify dynamic tool compilation, execution, and return value."""
    registry = DynamicMcpRegistry()
    code = """
def execute(base: int, exponent: int = 2) -> int:
    return base ** exponent
"""
    schema = {
        "title": "power_calc",
        "description": "Calculates power of a number",
        "parameters": {"type": "object"}
    }

    success = registry.register_dynamic_tool(
        user_id="user_123",
        tool_id="tool_power_1",
        name="power_calc",
        code=code,
        schema=schema,
    )
    assert success is True

    # Retrieve by name
    fn_by_name = registry.get_tool_callable("user_123", "power_calc")
    assert callable(fn_by_name)
    assert fn_by_name(3, 3) == 27
    assert fn_by_name(5) == 25

    # Retrieve by ID
    fn_by_id = registry.get_tool_callable("user_123", "tool_power_1")
    assert callable(fn_by_id)
    assert fn_by_id(2, 4) == 16


def test_dynamic_mcp_registry_tenant_isolation():
    """Verify User A and User B can register tools with the same name without colliding."""
    registry = DynamicMcpRegistry()

    # User A registers a multiplier
    code_a = "def execute(x): return x * 10"
    registry.register_dynamic_tool(
        user_id="tenant_a",
        tool_id="tool_a",
        name="transform_number",
        code=code_a,
    )

    # User B registers an adder
    code_b = "def execute(x): return x + 100"
    registry.register_dynamic_tool(
        user_id="tenant_b",
        tool_id="tool_b",
        name="transform_number",
        code=code_b,
    )

    fn_a = registry.get_tool_callable("tenant_a", "transform_number")
    fn_b = registry.get_tool_callable("tenant_b", "transform_number")

    assert fn_a(5) == 50
    assert fn_b(5) == 105

    # Tenant C has no tool
    fn_c = registry.get_tool_callable("tenant_c", "transform_number")
    assert fn_c is None


def test_dynamic_mcp_registry_invalid_code_handling():
    """Verify registry rejects syntax errors and missing execute functions gracefully."""
    registry = DynamicMcpRegistry()

    # Syntax error
    bad_syntax = "def execute( broken syntax"
    assert registry.register_dynamic_tool(
        user_id="user_err",
        tool_id="bad_1",
        name="bad_syntax",
        code=bad_syntax,
    ) is False

    # Missing execute function
    no_execute = "def helper(): return 42"
    assert registry.register_dynamic_tool(
        user_id="user_err",
        tool_id="bad_2",
        name="no_execute",
        code=no_execute,
    ) is False

    assert registry.get_tool_callable("user_err", "bad_syntax") is None
    assert registry.get_tool_callable("user_err", "no_execute") is None


def test_dynamic_mcp_registry_listing_and_unregister():
    """Verify tool listing and unregistration."""
    registry = DynamicMcpRegistry()
    registry.register_dynamic_tool(
        user_id="user_list",
        tool_id="tool_1",
        name="tool_one",
        code="def execute(): return 1",
    )
    registry.register_dynamic_tool(
        user_id="user_list",
        tool_id="tool_2",
        name="tool_two",
        code="def execute(): return 2",
    )

    tools = registry.list_user_dynamic_tools("user_list")
    assert len(tools) == 2
    names = [t["name"] for t in tools]
    assert "tool_one" in names and "tool_two" in names

    # Unregister tool_one
    removed = registry.unregister_dynamic_tool("user_list", "tool_one")
    assert removed is True
    assert registry.get_tool_callable("user_list", "tool_one") is None
    assert len(registry.list_user_dynamic_tools("user_list")) == 1


@pytest.mark.asyncio
async def test_register_node_persists_to_db_and_mcp_registry():
    """Verify register_node persists tool to PostgreSQL and makes it callable in MCP registry."""
    test_user_id = str(uuid.uuid4())
    # Create user in DB for foreign key constraint
    async with get_db() as db:
        user = await RegistryRepository.create_user(
            db,
            email=f"forge_reg_{test_user_id[:8]}@example.com",
            username=f"forge_reg_{test_user_id[:8]}",
            password_hash="fakehash",
        )
        test_user_id = user.id

    state = {
        "generated_code": """
def execute(text: str) -> str:
    return text.strip().upper()
""",
        "generated_schema": {
            "title": "text_uppercase_formatter",
            "description": "Converts input text to uppercase",
            "type": "object",
            "properties": {"text": {"type": "string"}},
        },
        "adversarial_tests": "def test_execute(): pass",
        "missing_capability": "convert text to uppercase format",
        "user_id": test_user_id,
    }

    result = await register_node(state)

    assert result["is_registered"] is True
    assert "registered_tool_id" in result
    tool_id = result["registered_tool_id"]
    assert tool_id is not None

    # 1. Verify in database
    async with get_db() as db:
        db_tool = await RegistryRepository.get_tool(db, tool_id)
        assert db_tool is not None
        assert db_tool.name == "text_uppercase_formatter"
        assert db_tool.user_id == test_user_id
        assert db_tool.status == "active"
        assert "def execute" in db_tool.code

    # 2. Verify in DynamicMcpRegistry immediately executable
    callable_fn = dynamic_mcp_registry.get_tool_callable(test_user_id, "text_uppercase_formatter")
    assert callable(callable_fn)
    assert callable_fn("hello world") == "HELLO WORLD"

    # Also retrievable by tool_id
    fn_by_id = dynamic_mcp_registry.get_tool_callable(test_user_id, tool_id)
    assert callable(fn_by_id)
    assert fn_by_id("self forging ai") == "SELF FORGING AI"


@pytest.mark.asyncio
async def test_register_node_missing_code_graceful_failure():
    """Verify register_node safely fails when generated_code is empty."""
    state = {
        "generated_code": "",
        "missing_capability": "nothing",
    }
    result = await register_node(state)
    assert result["is_registered"] is False
    assert result["registered_tool_id"] is None
