"""
Core Node:
Analyzes user tasks, determines if forging a tool is required,
and executes verified dynamic tools to ground the final response.
"""
import logging
from typing import Dict, Any
from agents.state import AgentState
from agents.llm import llm
from agents.utils import extract_json_from_text
from agents.execution.tool_runner import execute_tool, extract_tool_arguments
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from observability import emit_agent_event, AgentLifecycleEvent

logger = logging.getLogger(__name__)


def _extract_user_prompt(messages: list, fallback_task: str) -> str:
    """Extract prompt text from messages or fallback to task string."""
    for m in messages:
        if hasattr(m, "content") and getattr(m, "type", "") in ["human", "user"]:
            return str(m.content)
        if isinstance(m, dict) and m.get("role") in ["human", "user"]:
            return str(m.get("content", ""))
    return fallback_task or ""


async def _handle_runtime_execution(state: AgentState) -> Dict[str, Any]:
    """Execute forged and registered tool to formulate final response."""
    tool_id = state.get("registered_tool_id") or "forged_tool"
    user_id = state.get("user_id")
    schema = state.get("generated_schema", {})
    task = state.get("task", "") or _extract_user_prompt(state.get("messages", []), "")

    # 1. Extract arguments matching tool schema
    args = await extract_tool_arguments(user_task=task, tool_name=tool_id, schema=schema)
    logger.info("Executing runtime tool '%s' with args: %s", tool_id, args)

    # 2. Invoke tool callable
    exec_result = await execute_tool(user_id=user_id, tool_id_or_name=tool_id, arguments=args)

    # 3. Synthesize grounded final response
    if exec_result.get("success"):
        sys_prompt = SystemMessage(content="""
You are an intelligent AI agent. A verified tool has executed to fulfill the user's task.
Formulate a direct, helpful, and concise final response answering the user request based on the tool's execution result.
Include the computed result clearly.
""")
        user_prompt = HumanMessage(content=f"""
User Task: {task}
Tool Executed: {tool_id}
Arguments Passed: {args}
Execution Result: {exec_result.get('result')}

Formulate the final response:
""")
        res = await llm.ainvoke([sys_prompt, user_prompt])
        reply = res.content
    else:
        err = exec_result.get("error", "Unknown error")
        reply = f"The tool was registered, but runtime execution encountered an error: {err}"

    if user_id:
        await emit_agent_event(
            user_id=user_id,
            session_id=state.get("session_id", ""),
            event=AgentLifecycleEvent.TOOL_VERIFIED,
            status="success" if exec_result.get("success") else "failed",
            summary=f"Runtime execution of verified tool '{tool_id}' finished.",
            data={"tool_id": tool_id, "success": exec_result.get("success")},
        )

    return {
        "missing_capability": "",
        "messages": [
            AIMessage(
                content=reply,
                additional_kwargs={
                    "forge_data": {
                        "is_tool_forged": True,
                        "tool_id": tool_id,
                        "arguments": args,
                        "result": exec_result.get("result"),
                        "execution_time_ms": exec_result.get("execution_time_ms", 0.0),
                        "tests_passed": state.get("tests_passed", True),
                    }
                }
            )
        ]
    }


async def core_node(state: AgentState) -> dict:
    """
    The Core Agent Node.
    Decides whether to reuse existing tools via Hybrid Search, forge new tools,
    or execute registered tools.
    """
    messages = state.get("messages", [])
    if not messages:
        return {"messages": []}

    # If tool was forged and successfully registered, execute it at runtime
    if state.get("is_registered"):
        return await _handle_runtime_execution(state)

    task_prompt = _extract_user_prompt(messages, state.get("task", ""))
    user_id = state.get("user_id")
    session_id = state.get("session_id", "")

    if user_id and task_prompt:
        await emit_agent_event(
            user_id=user_id,
            session_id=session_id,
            event=AgentLifecycleEvent.AGENT_THINKING,
            status="in_progress",
            summary="Analyzing task and evaluating tool registry...",
            data={"task": task_prompt[:120]},
        )

    # 1. Novel Hybrid Tool Search: Check if existing tool in registry matches user request
    if task_prompt:
        try:
            from registry.database import get_db
            from agents.search.hybrid_search import HybridToolSearcher
            from agents.evaluation.dual_gate import DualGateEngine
            from registry.mcp_manager import dynamic_mcp_registry

            async with get_db() as db:
                match = await HybridToolSearcher.search(db=db, task=task_prompt, user_id=user_id)
                if match is not None:
                    tool = match.tool
                    logger.info(
                        "Hybrid Tool Search found matching existing tool '%s' (Score: %.4f). Running Dual-Gate admission.",
                        tool.name, match.score
                    )
                    # Extract arguments and evaluate Dual-Gate admission
                    args = await extract_tool_arguments(user_task=task_prompt, tool_name=tool.name, schema=tool.schema_json)
                    admitted, gate_msg = await DualGateEngine.evaluate_tool_reuse(
                        db=db, tool=tool, task=task_prompt, arguments=args
                    )

                    if not admitted:
                        logger.warning(
                            "Tool '%s' rejected by Dual-Gate: %s. Falling back to forge pipeline.",
                            tool.name, gate_msg
                        )
                    else:
                        # Dual-Gate passed! Ensure cached in dynamic MCP registry and execute
                        dynamic_mcp_registry.register_dynamic_tool(
                            user_id=tool.user_id,
                            tool_id=tool.id,
                            name=tool.name,
                            code=tool.code,
                            schema=tool.schema_json,
                        )
                        exec_result = await execute_tool(user_id=user_id, tool_id_or_name=tool.id, arguments=args)

                        if user_id:
                            await emit_agent_event(
                                user_id=user_id,
                                session_id=session_id,
                                event=AgentLifecycleEvent.TOOL_REUSED,
                                status="success",
                                summary=f"Reused verified tool '{tool.name}' (Gate score: {tool.gate_score:.2f}).",
                                data={"tool_name": tool.name, "tool_id": str(tool.id)},
                            )

                        if exec_result.get("success"):
                            sys_prompt = SystemMessage(content="""
You are an intelligent AI agent. An existing verified tool passed Dual-Gate re-evaluation and executed to fulfill the user's task.
Formulate a direct, helpful, and concise final response answering the user request based on the tool's execution result.
Include the computed result clearly.
""")
                            user_prompt = HumanMessage(content=f"""
User Task: {task_prompt}
Tool Reused: {tool.name}
Arguments Passed: {args}
Execution Result: {exec_result.get('result')}

Formulate the final response:
""")
                            res = await llm.ainvoke([sys_prompt, user_prompt])
                            reply = res.content
                        else:
                            err = exec_result.get("error", "Unknown error")
                            reply = f"Matched tool '{tool.name}' from your registry, but runtime execution encountered an error: {err}"

                        return {
                            "missing_capability": "",
                            "messages": [
                                AIMessage(
                                    content=reply,
                                    additional_kwargs={
                                        "forge_data": {
                                            "is_tool_reused": True,
                                            "tool_id": tool.id,
                                            "tool_name": tool.name,
                                            "match_score": match.score,
                                            "gate_score": tool.gate_score,
                                            "reuse_count": tool.reuse_count,
                                            "arguments": args,
                                            "result": exec_result.get("result"),
                                            "execution_time_ms": exec_result.get("execution_time_ms", 0.0),
                                        }
                                    }
                                )
                            ]
                        }
        except Exception as e:
            logger.warning("Hybrid Tool Search encountered error: %s", str(e), exc_info=True)

    # 2. No matching tool found — evaluate whether to forge a new tool
    sys_prompt = SystemMessage(content="""
You are the Core Agent. Your job is to determine if the user's request requires an external tool (like web scraping, reading files, API calls).
Return ONLY a valid JSON object with EXACTLY these three keys:
{
  "is_tool_needed": bool,
  "missing_capability_description": "If a tool is needed, describe clearly what the tool should do. Empty string otherwise.",
  "response_to_user": "If no tool is needed, the answer to the user's request. If a tool is needed, a message saying you are forging it."
}
""")

    response = await llm.ainvoke([sys_prompt] + messages)
    content = response.content

    try:
        data = extract_json_from_text(content)
        is_tool_needed = data.get("is_tool_needed", False)
        missing_cap = data.get("missing_capability_description", "")
        reply = data.get("response_to_user", "Processing request...")
    except Exception as e:
        is_tool_needed = False
        missing_cap = ""
        reply = f"Error parsing reasoning: {str(e)}"

    if is_tool_needed:
        return {
            "missing_capability": missing_cap,
            "messages": [AIMessage(content=reply)]
        }
    else:
        return {
            "missing_capability": "",
            "messages": [AIMessage(content=reply)]
        }
