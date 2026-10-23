"""
Tool Runner:
Executes dynamic MCP tools at runtime with execution timeouts, output capturing,
and argument extraction grounded in tool schemas.
"""
import asyncio
import inspect
import logging
import time
import uuid
from typing import Any, Dict, Optional
from registry.database import get_db
from registry.repository import RegistryRepository
from registry.mcp_manager import dynamic_mcp_registry
from langchain_openai import ChatOpenAI
from agents.llm import llm, get_llm
from agents.utils import extract_json_from_text
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger(__name__)


async def _resolve_callable(user_id: Optional[str], tool_id_or_name: str):
    """
    Find compiled callable from memory; if missing, check PostgreSQL to hot-swap on-demand.
    """
    fn = dynamic_mcp_registry.get_tool_callable(user_id, tool_id_or_name)
    if fn is not None:
        return fn

    # Fallback: Query PostgreSQL by ID or name to rehydrate memory cache
    try:
        async with get_db() as db:
            tool = None
            try:
                uuid.UUID(str(tool_id_or_name))
                tool = await RegistryRepository.get_tool(db, tool_id_or_name)
            except ValueError:
                pass
            if not tool:
                # Try finding by name
                tools = await RegistryRepository.list_tools(db, user_id=user_id)
                for t in tools:
                    if t.name.lower() == tool_id_or_name.lower():
                        tool = t
                        break

            if tool:
                # Multi-tenant isolation: Verify user has permission to access this tool
                if tool.user_id not in (user_id, None):
                    logger.warning(
                        "Tenant isolation violation: user '%s' attempted to rehydrate tool '%s' owned by '%s'",
                        user_id, tool.id, tool.user_id
                    )
                    return None

                if tool.status != "active":
                    logger.warning(
                        "Tool '%s' is not active (status: '%s'); skipping rehydration.",
                        tool.name, tool.status
                    )
                    return None

                if tool.code:
                    dynamic_mcp_registry.register_dynamic_tool(
                        user_id=tool.user_id,
                        tool_id=tool.id,
                        name=tool.name,
                        code=tool.code,
                        schema=tool.schema_json,
                    )
                    return dynamic_mcp_registry.get_tool_callable(user_id, tool.id)
    except Exception as e:
        logger.warning("Failed on-demand rehydration for tool '%s': %s", tool_id_or_name, str(e))

    return None


async def execute_tool(
    user_id: Optional[str],
    tool_id_or_name: str,
    arguments: Optional[Dict[str, Any]] = None,
    timeout: int = 15,
) -> Dict[str, Any]:
    """
    Execute a dynamic tool safely with timeout protection and structured return value.
    """
    args = arguments if isinstance(arguments, dict) else {}
    fn = await _resolve_callable(user_id, tool_id_or_name)

    if fn is None:
        return {
            "success": False,
            "result": None,
            "error": f"Tool '{tool_id_or_name}' not found in runtime registry or database.",
            "execution_time_ms": 0.0,
        }

    start_time = time.perf_counter()
    try:
        # Support both synchronous and asynchronous tool functions
        if inspect.iscoroutinefunction(fn):
            result = await asyncio.wait_for(fn(**args), timeout=timeout)
        else:
            result = await asyncio.wait_for(
                asyncio.to_thread(fn, **args),
                timeout=timeout,
            )

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "success": True,
            "result": result,
            "error": None,
            "execution_time_ms": elapsed_ms,
        }

    except asyncio.TimeoutError:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.warning("Execution of tool '%s' timed out after %ds", tool_id_or_name, timeout)
        return {
            "success": False,
            "result": None,
            "error": f"Execution timed out after {timeout} seconds.",
            "execution_time_ms": elapsed_ms,
        }
    except Exception as e:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.warning("Tool '%s' raised an execution error: %s", tool_id_or_name, str(e), exc_info=True)
        return {
            "success": False,
            "result": None,
            "error": str(e),
            "execution_time_ms": elapsed_ms,
        }


async def extract_tool_arguments(
    user_task: str,
    tool_name: str,
    schema: Optional[Dict[str, Any]] = None,
    model: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Extract structured arguments for execute(**args) from user prompt using LLM.
    """
    if not user_task:
        return {}

    tool_schema = schema or {}
    sys_prompt = SystemMessage(content="""
You are a parameter extraction specialist.
Given a user's task and a target tool's JSON schema, extract the exact arguments needed to execute the tool.
Return ONLY a valid JSON object matching the parameters. If no arguments are needed or cannot be inferred, return {}.
""")

    user_prompt = HumanMessage(content=f"""
Target Tool: {tool_name}
Schema: {tool_schema}
User Task: {user_task}

Extract the keyword arguments to pass to execute(...):
""")

    try:
        if hasattr(llm, "mock_calls") or not isinstance(llm, ChatOpenAI):
            active_llm = llm
        elif model:
            active_llm = get_llm(model=model)
        else:
            active_llm = llm
        response = await active_llm.ainvoke([sys_prompt, user_prompt])
        parsed = extract_json_from_text(response.content)
        return parsed if isinstance(parsed, dict) else {}
    except Exception as e:
        logger.warning("Failed extracting tool arguments for '%s': %s", tool_name, str(e))
        return {}
