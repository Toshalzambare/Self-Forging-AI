"""
Register Node:
Persists verified and tested tools into the PostgreSQL database under the user's
tenant namespace, and hot-swaps them into the dynamic MCP registry for immediate execution.
"""
import logging
import re
import uuid
from typing import Optional, Dict, Any
from agents.state import AgentState
from registry.database import get_db
from registry.repository import RegistryRepository
from registry.mcp_manager import dynamic_mcp_registry
from observability import emit_agent_event, AgentLifecycleEvent

logger = logging.getLogger(__name__)


def _infer_tool_name(schema: dict, capability: str) -> str:
    """Extract a clean, valid identifier name for the tool."""
    # 1. From schema title or name
    title = schema.get("title") or schema.get("name")
    if title and isinstance(title, str):
        clean = re.sub(r"[^a-zA-Z0-9_]+", "_", title.strip().lower()).strip("_")
        if clean:
            return clean

    # 2. Inferred from capability description
    if capability:
        clean = re.sub(r"[^a-zA-Z0-9_]+", "_", capability.strip().lower()).strip("_")
        parts = [p for p in clean.split("_") if p and p not in ["a", "an", "the", "to", "for", "in", "of"]]
        candidate = "_".join(parts[:4])
        if candidate:
            return candidate[:40]

    # 3. Fallback
    return f"forged_tool_{uuid.uuid4().hex[:6]}"


async def register_node(state: AgentState) -> dict:
    """
    Persistence & Hot-Swap Node.
    Saves verified Python tools into PostgreSQL and hot-swaps into dynamic MCP registry.
    """
    code = state.get("generated_code", "")
    schema = state.get("generated_schema", {})
    tests = state.get("adversarial_tests", "")
    user_id = state.get("user_id")
    capability = state.get("missing_capability", "")

    if not code:
        logger.error("register_node invoked without generated_code")
        return {"is_registered": False, "registered_tool_id": None}

    tool_name = _infer_tool_name(schema if isinstance(schema, dict) else {}, capability)
    description = (
        (schema.get("description") if isinstance(schema, dict) else None)
        or capability
        or f"Autonomously forged tool: {tool_name}"
    )

    try:
        async with get_db() as db:
            tool = await RegistryRepository.add_tool(
                db,
                name=tool_name,
                description=description,
                code=code,
                schema=schema if isinstance(schema, dict) else {},
                tests_code=tests,
                user_id=user_id,
                status="active"
            )

            session_id = state.get("session_id") or "forge_pipeline"
            await RegistryRepository.add_log(
                db,
                session_id=session_id,
                action="TOOL_REGISTERED",
                details=f"Tool '{tool_name}' ({tool.id}) successfully forged, verified, and persisted.",
                user_id=user_id,
            )

        # Hot-swap into dynamic in-memory MCP registry
        hot_swapped = dynamic_mcp_registry.register_dynamic_tool(
            user_id=user_id,
            tool_id=tool.id,
            name=tool_name,
            code=code,
            schema=schema if isinstance(schema, dict) else {},
        )
        if not hot_swapped:
            logger.error("Hot-swap compilation failed for tool '%s' (%s)", tool_name, tool.id)
            if user_id:
                async with get_db() as db:
                    await RegistryRepository.update_tool_status(db, str(tool.id), str(user_id), status="quarantined")
            return {
                "is_registered": False,
                "registered_tool_id": tool.id,
                "error": f"Tool '{tool_name}' failed runtime dynamic compilation.",
                "messages": [
                    {
                        "role": "assistant",
                        "content": f"Tool '{tool_name}' passed tests but failed dynamic runtime hot-swap."
                    }
                ]
            }

        if user_id:
            try:
                await emit_agent_event(
                    user_id=user_id,
                    session_id=session_id,
                    event=AgentLifecycleEvent.TOOL_VERIFIED,
                    status="success",
                    summary=f"Tool '{tool_name}' verified and hot-swapped into dynamic MCP registry.",
                    data={"tool_name": tool_name, "tool_id": str(tool.id)},
                )
            except Exception as emit_err:
                logger.warning("Failed emitting TOOL_VERIFIED event for tool '%s': %s", tool_name, str(emit_err))

        logger.info(
            "Registered tool '%s' with ID %s under tenant '%s'",
            tool_name, tool.id, user_id
        )

        return {
            "is_registered": True,
            "registered_tool_id": tool.id,
            "messages": [
                {
                    "role": "assistant",
                    "content": f"Tool '{tool_name}' has been successfully forged, dual-gate verified, and registered into the MCP registry."
                }
            ]
        }

    except Exception as e:
        logger.error("Failed registering tool in register_node: %s", str(e), exc_info=True)
        return {
            "is_registered": False,
            "registered_tool_id": None,
            "messages": [
                {
                    "role": "assistant",
                    "content": f"Encountered an internal error while registering tool '{tool_name}': {str(e)}"
                }
            ]
        }
