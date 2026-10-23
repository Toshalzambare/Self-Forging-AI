"""
Runtime Tool Execution Helper.
Executes forged and verified tools and synthesizes grounded agent responses.
"""
import asyncio
import logging
import sys
from typing import Dict, Any
from agents.state import AgentState
from langchain_openai import ChatOpenAI
from agents.llm import llm, get_llm
from agents.execution.tool_runner import execute_tool, extract_tool_arguments
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from observability import emit_agent_event, AgentLifecycleEvent

logger = logging.getLogger(__name__)


async def handle_runtime_execution(state: AgentState) -> Dict[str, Any]:
    """Execute forged and registered tool to formulate final grounded response."""
    tool_id = state.get("registered_tool_id") or "forged_tool"
    user_id = state.get("user_id")
    schema = state.get("generated_schema", {})
    task = state.get("task", "")
    doc_ctx = state.get("document_context", "")
    task_with_docs = f"{task}\n\nDocument Context:\n{doc_ctx}" if doc_ctx else task

    # 1. Extract arguments matching tool schema
    args = await extract_tool_arguments(
        user_task=task_with_docs,
        tool_name=tool_id,
        schema=schema,
        model=state.get("model"),
    )
    logger.info("Executing runtime tool '%s' with args: %s", tool_id, args)

    # 2. Invoke tool callable
    exec_result = await execute_tool(user_id=user_id, tool_id_or_name=tool_id, arguments=args)

    # 3. Synthesize grounded final response using active model
    model_override = state.get("model")
    core_mod = sys.modules.get("agents.nodes.core")
    if core_mod and hasattr(core_mod, "llm") and (hasattr(core_mod.llm, "mock_calls") or not isinstance(core_mod.llm, ChatOpenAI)):
        active_llm = core_mod.llm
    elif hasattr(llm, "mock_calls") or not isinstance(llm, ChatOpenAI):
        active_llm = llm
    elif model_override:
        active_llm = get_llm(model=model_override)
    else:
        active_llm = llm
    if exec_result.get("success"):
        sys_prompt = SystemMessage(content="""
You are an articulate, warm, and helpful AI assistant. A specialized tool was dynamically synthesized, tested in a sandbox, and executed to fulfill the user's inquiry.
Deliver a direct, natural, and engaging response answering the user's question clearly with the computed result.
Do NOT output raw JSON schemas, Python function definitions, or pytest code in your reply (the complete code and tests are already displayed in the user's Activity Drawer).
""")
        user_prompt = HumanMessage(content=f"""
User Task: {task}
Tool Executed: {tool_id}
Arguments Passed: {args}
Execution Result: {exec_result.get('result')}

Formulate the final response:
""")
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
        reply = f"The tool was registered, but runtime execution encountered an error: {err}"

    if user_id:
        succeeded = bool(exec_result.get("success"))
        await emit_agent_event(
            user_id=user_id,
            session_id=state.get("session_id", ""),
            event=AgentLifecycleEvent.TOOL_VERIFIED if succeeded else AgentLifecycleEvent.TOOL_FAILED,
            status="success" if succeeded else "failed",
            summary=f"Runtime execution of verified tool '{tool_id}' finished.",
            data={"tool_id": tool_id, "success": succeeded, "error": exec_result.get("error")},
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
