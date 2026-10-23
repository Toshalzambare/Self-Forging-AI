"""
Core Node:
Analyzes user tasks, determines if forging a tool is required,
and coordinates tool reuse via Hybrid Tool Search and Dual-Gate admission.
"""
import asyncio
import logging
from typing import Dict, Any
from agents.state import AgentState
from langchain_openai import ChatOpenAI
from agents.llm import llm, get_llm
from agents.utils import extract_json_from_text
from agents.nodes.runtime_exec import handle_runtime_execution
from agents.execution.tool_runner import execute_tool, extract_tool_arguments
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from observability import emit_agent_event, AgentLifecycleEvent

logger = logging.getLogger(__name__)


def _extract_user_prompt(messages: list, fallback_task: str) -> str:
    """Extract prompt text from messages (newest first) or fallback to task string."""
    for m in reversed(messages):
        if hasattr(m, "content") and getattr(m, "type", "") in ["human", "user"]:
            return str(m.content)
        if isinstance(m, dict) and m.get("role") in ["human", "user"]:
            return str(m.get("content", ""))
    return fallback_task or ""


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
        return await handle_runtime_execution(state)

    # Forge already attempted and failed or registration rejected: terminate cleanly
    if state.get("generated_code") and (not state.get("tests_passed") or not state.get("is_registered")):
        return {"missing_capability": "", "messages": []}

    task_prompt = _extract_user_prompt(messages, state.get("task", ""))
    user_id = state.get("user_id")
    session_id = state.get("session_id", "")
    model_override = state.get("model")
    if hasattr(llm, "mock_calls") or not isinstance(llm, ChatOpenAI):
        active_llm = llm
    elif model_override:
        active_llm = get_llm(model=model_override)
    else:
        active_llm = llm

    if user_id and task_prompt:
        await emit_agent_event(
            user_id=user_id,
            session_id=session_id,
            event=AgentLifecycleEvent.AGENT_THINKING,
            status="in_progress",
            summary="Analyzing task and evaluating tool registry...",
            data={"task": task_prompt[:120], "model": state.get("model") or "default"},
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
                    logger.info("Hybrid Search found tool '%s' (Score: %.4f). Running Dual-Gate.", tool.name, match.score)
                    doc_ctx = state.get("document_context", "")
                    reuse_task = f"{task_prompt}\n\nDocument Context:\n{doc_ctx}" if doc_ctx else task_prompt
                    args = await extract_tool_arguments(
                        user_task=reuse_task,
                        tool_name=tool.name,
                        schema=tool.schema_json,
                        model=state.get("model"),
                    )
                    admitted, gate_msg = await DualGateEngine.evaluate_tool_reuse(
                        db=db, tool=tool, task=task_prompt, arguments=args
                    )

                    if not admitted:
                        logger.warning("Tool '%s' rejected by Dual-Gate: %s. Falling back to forge.", tool.name, gate_msg)
                    else:
                        dynamic_mcp_registry.register_dynamic_tool(
                            user_id=tool.user_id, tool_id=tool.id, name=tool.name,
                            code=tool.code, schema=tool.schema_json,
                        )
                        exec_result = await execute_tool(user_id=user_id, tool_id_or_name=tool.id, arguments=args)

                        if exec_result.get("success"):
                            if user_id:
                                await emit_agent_event(
                                    user_id=user_id, session_id=session_id,
                                    event=AgentLifecycleEvent.TOOL_REUSED, status="success",
                                    summary=f"Reused verified tool '{tool.name}' (Gate score: {tool.gate_score:.2f}).",
                                    data={"tool_name": tool.name, "tool_id": str(tool.id)},
                                )
                            sys_prompt = SystemMessage(content="""
You are an articulate, warm, and helpful AI assistant. An existing verified tool passed Dual-Gate qualification and executed to fulfill the user's inquiry.
Deliver a direct, natural, and engaging response answering the user's question clearly with the computed result.
Do NOT output raw JSON schemas, Python function definitions, or pytest code in your reply.
""")
                            user_prompt = HumanMessage(content=f"User Task: {task_prompt}\nTool Reused: {tool.name}\nArguments: {args}\nResult: {exec_result.get('result')}\nFormulate the final response:")
                            token_cb = state.get("token_callback")
                            if token_cb and hasattr(active_llm, "astream"):
                                chunks = []
                                async for chunk in active_llm.astream([sys_prompt, user_prompt]):
                                    txt = chunk.content if hasattr(chunk, "content") else str(chunk)
                                    chunks.append(txt)
                                    try:
                                        res = token_cb(txt)
                                        if asyncio.iscoroutine(res):
                                            await res
                                    except Exception:
                                        pass
                                reply = "".join(chunks)
                            else:
                                res = await active_llm.ainvoke([sys_prompt, user_prompt])
                                reply = res.content
                        else:
                            err = exec_result.get("error", "Unknown error")
                            if user_id:
                                await emit_agent_event(
                                    user_id=user_id, session_id=session_id,
                                    event=AgentLifecycleEvent.TOOL_REUSED, status="failed",
                                    summary=f"Reused tool '{tool.name}' failed: {err}",
                                    data={"tool_name": tool.name, "tool_id": str(tool.id), "error": err},
                                )
                            await DualGateEngine.record_runtime_failure(db, tool, err)
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
You are the Core Orchestration Agent of the Self-Forging AI platform.
Your job is to determine whether the user request requires creating a Python computational tool or can be answered directly.

MANDATORY RULES:
1. ANY request involving mathematical computation, number sequences (e.g., Fibonacci, primes, factorials, powers), string manipulation, data parsing, hashing, sorting, unit conversions, or custom algorithms MUST have "is_tool_needed": true.
2. NEVER calculate mathematics, algorithms, or number sequences in your head. Always delegate to a synthesized Python tool to guarantee mathematical accuracy.
3. Set "is_tool_needed": false ONLY for conversational greetings ("hi", "hello"), conceptual questions ("what is a neural network?"), or general explanations.

Return ONLY a valid JSON object with EXACTLY this structure:
{
  "is_tool_needed": true,
  "missing_capability_description": "Clear description of the required Python function",
  "response_to_user": "Synthesizing a dedicated tool..."
}
""")

    doc_ctx = state.get("document_context")
    task_input = f"User Request: {task_prompt}"
    if doc_ctx:
        task_input += f"\n\nContext from attached user documents:\n{doc_ctx}"

    response = await active_llm.ainvoke([sys_prompt, HumanMessage(content=task_input)])
    content = str(response.content)

    try:
        data = extract_json_from_text(content)
        is_tool_needed = bool(data.get("is_tool_needed", False))
        missing_cap = data.get("missing_capability_description", "")
        reply = data.get("response_to_user", "Processing request...")
    except Exception as e:
        logger.warning("JSON parsing failed in core_node: %s. Analyzing task keywords for fallback.", e)
        comp_keywords = [
            "calculate", "compute", "fibonacci", "algorithm", "prime", "factorial",
            "convert", "hash", "parse", "sort", "tool", "sequence", "solve", "math"
        ]
        task_lower = task_prompt.lower()
        if any(kw in task_lower for kw in comp_keywords):
            is_tool_needed = True
            missing_cap = task_prompt
            reply = f"Synthesizing a specialized Python tool to fulfill your request: {task_prompt}"
        else:
            is_tool_needed = False
            missing_cap = ""
            reply = content.strip() if content.strip() else "I have processed your request."

    return {
        "missing_capability": missing_cap if is_tool_needed else "",
        "messages": [AIMessage(content=reply)]
    }
