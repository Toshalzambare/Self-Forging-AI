"""
Streaming Conversation Service.
Executes the LangGraph agent pipeline and streams real-time lifecycle transitions
and word-by-word token chunks over Server-Sent Events (SSE).
"""
import asyncio
import logging
import uuid
from typing import AsyncGenerator, Optional, List, Dict, Any

from langchain_core.messages import HumanMessage, AIMessage
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from agents.graph import build_graph
from conversation.service import ConversationService
from conversation.attachment_service import AttachmentService
from conversation.sse_stream import format_sse
from observability.events import (
    register_session_listener,
    unregister_session_listener,
    AgentLifecycleEvent,
)
from registry.database import get_db
from registry.models import Message

logger = logging.getLogger(__name__)

# Compile graph singleton
_graph = None


def get_agent_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph


async def stream_conversation_events(
    conversation_id: str,
    user_prompt: str,
    user_id: str,
    model: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """
    Executes the LangGraph agent workflow for a user message while streaming
    live lifecycle events and final response tokens over Server-Sent Events (SSE).
    Persists messages to PostgreSQL upon completion.
    """
    queue: asyncio.Queue = asyncio.Queue()
    register_session_listener(conversation_id, queue)
    graph = get_agent_graph()

    # 1. Setup DB state, persist user message, and build context
    async with get_db() as db:
        conv = await ConversationService.get_conversation(db, conversation_id, user_id)
        if not conv:
            yield format_sse("error", {"detail": "Conversation not found or access denied."})
            unregister_session_listener(conversation_id, queue)
            return

        # Persist user message
        await ConversationService.add_message(
            db,
            conversation_id=conversation_id,
            role="user",
            content=user_prompt,
        )

        # Retrieve attachments
        raw_attachments = await AttachmentService.list_attachments(db, conversation_id, user_id)
        doc_blocks: List[str] = []
        att_list: List[Dict[str, Any]] = []
        remaining_budget = 32000
        for a in raw_attachments:
            att_list.append({
                "id": str(a.id),
                "filename": a.filename,
                "content_type": a.content_type,
                "size_bytes": a.size_bytes,
            })
            if remaining_budget > 0 and a.extracted_text and a.extracted_text.strip():
                snippet = a.extracted_text.strip()[:min(8000, remaining_budget)]
                remaining_budget -= len(snippet)
                doc_blocks.append(f"=== ATTACHED FILE: {a.filename} ===\n{snippet}\n=== END OF FILE ===")

        document_context = "\n\n".join(doc_blocks)

        # Load prior conversation history
        stmt_msgs = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .limit(20)
        )
        res_msgs = await db.execute(stmt_msgs)
        prior_msgs = list(reversed(res_msgs.scalars().all()))
        history_messages = []
        for m in prior_msgs:
            if m.role == "assistant":
                history_messages.append(AIMessage(content=m.content))
            elif m.role == "user":
                history_messages.append(HumanMessage(content=m.content))
        if not history_messages:
            history_messages = [HumanMessage(content=user_prompt)]

    # 2. Token callback for real-time streaming
    async def on_token_chunk(chunk: str):
        if chunk:
            await queue.put({"type": "token", "payload": {"chunk": chunk}})

    initial_state = {
        "messages": history_messages,
        "task": user_prompt,
        "model": (model or "").strip(),
        "missing_capability": "",
        "generated_code": "",
        "generated_schema": {},
        "adversarial_tests": "",
        "sandbox_results": "",
        "tests_passed": False,
        "repair_attempts": 0,
        "documentation_context": "",
        "document_context": document_context,
        "attachments": att_list,
        "user_id": str(user_id),
        "session_id": str(conversation_id),
        "is_registered": False,
        "registered_tool_id": "",
        "token_callback": on_token_chunk,
    }

    # 3. Background runner for agent execution
    async def run_pipeline():
        try:
            final_state = await graph.ainvoke(initial_state)
            messages = final_state.get("messages", [])
            reply = ""
            for m in reversed(messages):
                content = m.content if hasattr(m, "content") else m.get("content", "")
                role = m.type if hasattr(m, "type") else m.get("role", "")
                if role in ("ai", "assistant"):
                    reply = content
                    break
            if not reply and messages:
                last = messages[-1]
                reply = last.content if hasattr(last, "content") else last.get("content", "")

            # Compile forge data
            forge_data = None
            for m in reversed(messages):
                kwargs = getattr(m, "additional_kwargs", {}) or {}
                if "forge_data" in kwargs:
                    forge_data = kwargs["forge_data"]
                    break

            if not forge_data and final_state.get("generated_code"):
                forge_data = {
                    "is_tool_forged": True,
                    "code": final_state.get("generated_code"),
                    "schema": final_state.get("generated_schema"),
                    "tests": final_state.get("adversarial_tests"),
                    "sandbox_results": final_state.get("sandbox_results"),
                    "tests_passed": final_state.get("tests_passed"),
                    "repair_attempts": final_state.get("repair_attempts"),
                    "tool_id": final_state.get("registered_tool_id"),
                }
            elif forge_data:
                if "code" not in forge_data and final_state.get("generated_code"):
                    forge_data["code"] = final_state.get("generated_code")
                if "tests" not in forge_data and final_state.get("adversarial_tests"):
                    forge_data["tests"] = final_state.get("adversarial_tests")
                if "sandbox_results" not in forge_data and final_state.get("sandbox_results"):
                    forge_data["sandbox_results"] = final_state.get("sandbox_results")

            # Persist assistant message in DB
            async with get_db() as db_session:
                saved_msg = await ConversationService.add_message(
                    db_session,
                    conversation_id=conversation_id,
                    role="assistant",
                    content=reply or "Task executed successfully.",
                    forge_data=forge_data,
                )
                msg_id = str(saved_msg.id)

            await queue.put({
                "type": "done",
                "payload": {
                    "message_id": msg_id,
                    "reply": reply,
                    "forge_data": forge_data,
                    "conversation_id": conversation_id,
                }
            })
        except Exception as e:
            logger.exception("Streaming pipeline execution failed: %s", str(e))
            await queue.put({"type": "error", "payload": {"detail": f"Execution error: {str(e)}"}})

    pipeline_task = asyncio.create_task(run_pipeline())

    # 4. Stream consumer yielding SSE frames
    try:
        while True:
            item = await queue.get()
            event_type = item.get("type")
            payload = item.get("payload")

            if event_type == "lifecycle":
                yield format_sse("lifecycle", payload)
            elif event_type == "thinking":
                yield format_sse("thinking", payload)
            elif event_type == "activity":
                yield format_sse("activity", payload)
            elif event_type == "token":
                yield format_sse("token", payload)
            elif event_type == "done":
                yield format_sse("done", payload)
                break
            elif event_type == "error":
                yield format_sse("error", payload)
                break
    finally:
        unregister_session_listener(conversation_id, queue)
        if not pipeline_task.done():
            pipeline_task.cancel()
