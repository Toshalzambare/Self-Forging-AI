"""
Self-Forging AI Agent - FastAPI Backend Entry Point
"""

import uuid
import asyncio
import logging
import re
from typing import Optional
from fastapi import FastAPI, HTTPException, Depends, Request, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, AIMessage
from sqlalchemy.ext.asyncio import AsyncSession

from config import config
from agents.graph import build_graph
from registry import get_db, get_db_session, check_db_connection, RegistryRepository, User, dynamic_mcp_registry
from registry.sfatool import export_sfatool_payload, validate_sfatool_payload, verify_import_security
from auth import auth_router, get_current_user
from auth.security import decode_access_token
from storage import check_storage_connection
from conversation import conversation_router, ConversationService, attachment_router, AttachmentService
from observability import connection_manager, emit_agent_event, AgentLifecycleEvent
from settings import settings_router

app = FastAPI(
    title=config.APP_NAME,
    description="An autonomous AI agent that forges, tests, and registers its own tools at runtime.",
    version=config.APP_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Authentication, Conversation, Attachment & Settings routers
app.include_router(auth_router)
app.include_router(conversation_router)
app.include_router(attachment_router)
app.include_router(settings_router)

# Build the LangGraph once at startup
graph = None
logger = logging.getLogger(__name__)


is_migration_ready: bool = False


@app.on_event("startup")
async def startup():
    global graph, is_migration_ready
    warnings = config.validate()
    if warnings:
        for w in warnings:
            print(f"[WARNING] CONFIG WARNING: {w}")
    else:
        print("Configuration loaded successfully.")
    print(f"OmniRoute endpoint: {config.OMNIROUTE_BASE_URL}")
    print(f"Default model: {config.OMNIROUTE_MODEL}")

    # Run Alembic migrations automatically at startup
    try:
        import os
        from alembic.config import Config as AlembicConfig
        from alembic import command
        ini_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "alembic.ini")
        alembic_cfg = AlembicConfig(ini_path)
        await asyncio.to_thread(command.upgrade, alembic_cfg, "head")
        is_migration_ready = True
        print("Database migrations applied successfully.")
    except Exception as e:
        is_migration_ready = False
        print(f"Alembic startup migration note: {e}")

    # Seed default providers and MCP servers in PostgreSQL if empty
    try:
        async with get_db() as db:
            await RegistryRepository.seed_defaults(db)
        print("Default registry data verified.")
    except Exception as e:
        print(f"Registry seeding warning: {e}")

    graph = build_graph()
    print("LangGraph agent compiled and ready.")


# ============================================================
# Pydantic Models
# ============================================================

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    conversation_id: Optional[str] = None
    model: Optional[str] = None


class ChatResponse(BaseModel):
    session_id: str
    conversation_id: str
    reply: str
    forged_tool: Optional[dict] = None
    sandbox_results: Optional[str] = None
    tests_passed: Optional[bool] = None
    repair_attempts: Optional[int] = None
    is_tool_forged: bool = False
    forge_data: Optional[dict] = None


# ============================================================
# Health Endpoints
# ============================================================

@app.get("/")
async def root():
    return {"name": config.APP_NAME, "version": config.APP_VERSION, "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy" if is_migration_ready else "degraded", "graph_ready": graph is not None and is_migration_ready}


@app.get("/api/health")
async def health_check():
    """Combined health check for DB, storage, and migration readiness."""
    db_ok = await check_db_connection()
    storage_ok = await asyncio.to_thread(check_storage_connection)

    overall = "ok" if db_ok and storage_ok and is_migration_ready else "degraded"
    status_code = 200 if overall == "ok" else 503

    return JSONResponse(
        status_code=status_code,
        content={
            "status": overall,
            "db": "connected" if db_ok else "error",
            "storage": "connected" if storage_ok else "error",
            "migration_ready": is_migration_ready,
        }
    )


# ============================================================
# Chat Endpoint  
# ============================================================

@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, current_user: User = Depends(get_current_user)):
    """
    Main chat endpoint. Sends the user message through the LangGraph pipeline.
    Handles both simple replies and tool-forging workflows.
    """
    if not graph:
        raise HTTPException(status_code=503, detail="Agent not ready yet.")

    session_id = req.session_id or str(uuid.uuid4())

    # Resolve or create persistent conversation
    async with get_db() as db:
        if req.conversation_id:
            conv = await ConversationService.get_conversation(
                db,
                conversation_id=req.conversation_id,
                user_id=str(current_user.id),
            )
            if not conv:
                raise HTTPException(status_code=404, detail="Conversation not found")
        else:
            first_line = req.message.strip().split("\n")[0][:40] if req.message else "New Conversation"
            conv = await ConversationService.create_conversation(
                db,
                user_id=str(current_user.id),
                title=first_line or "New Conversation",
            )
        conversation_id = str(conv.id)

        # 1. Persist User Message to PostgreSQL
        await ConversationService.add_message(
            db,
            conversation_id=conversation_id,
            role="user",
            content=req.message,
        )

        # Retrieve any attached documents for context grounding
        raw_attachments = await AttachmentService.list_attachments(db, conversation_id, str(current_user.id))
        doc_blocks = []
        att_list = []
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

        # Load prior conversation history so the agent maintains multi-turn context
        history_messages = []
        if req.conversation_id:
            from registry.models import Message
            from sqlalchemy import select
            stmt_msgs = (
                select(Message)
                .where(Message.conversation_id == conversation_id)
                .order_by(Message.created_at.desc())
                .limit(20)
            )
            res_msgs = await db.execute(stmt_msgs)
            prior_msgs = list(reversed(res_msgs.scalars().all()))
            for m in prior_msgs:
                if m.role == "assistant":
                    history_messages.append(AIMessage(content=m.content))
                elif m.role == "user":
                    history_messages.append(HumanMessage(content=m.content))
        if not history_messages:
            history_messages = [HumanMessage(content=req.message)]

    initial_state = {
        "messages": history_messages,
        "task": req.message,
        "model": (req.model or "").strip(),
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
        "user_id": str(current_user.id),
        "session_id": conversation_id,
        "is_registered": False,
        "registered_tool_id": "",
    }

    try:
        final_state = await graph.ainvoke(initial_state)
    except Exception as e:
        logger.exception("Agent execution failed for conversation %s: %s", conversation_id, str(e))
        async with get_db() as db:
            await ConversationService.add_message(
                db,
                conversation_id=conversation_id,
                role="assistant",
                content="An error occurred while executing the task.",
            )
        raise HTTPException(status_code=500, detail="An error occurred while executing the task.")

    messages = final_state.get("messages", [])
    # Get last assistant message
    reply = ""
    for m in reversed(messages):
        content = m.content if hasattr(m, "content") else m.get("content", "")
        role = m.type if hasattr(m, "type") else m.get("role", "")
        if role in ("ai", "assistant") or (hasattr(m, "type") and m.type == "ai"):
            reply = content
            break
    if not reply and messages:
        last = messages[-1]
        reply = last.content if hasattr(last, "content") else last.get("content", "")

    is_tool_forged = bool(final_state.get("generated_code"))
    forged_tool = None
    if is_tool_forged:
        forged_tool = {
            "code": final_state.get("generated_code", ""),
            "schema": final_state.get("generated_schema", {}),
            "tests": final_state.get("adversarial_tests", ""),
        }

        # Log if verified tool was not registered by register_node
        if final_state.get("tests_passed") and not final_state.get("is_registered"):
            logger.warning("Verified tool was not registered for conversation %s", conversation_id)
        elif not final_state.get("tests_passed"):
            async with get_db() as db:
                await RegistryRepository.add_log(
                    db,
                    user_id=str(current_user.id),
                    session_id=conversation_id,
                    action="Tool Verification Failed",
                    details=f"Tool generation failed verification after {final_state.get('repair_attempts')} attempts.",
                    status="error"
                )
    else:
        async with get_db() as db:
            await RegistryRepository.add_log(
                db,
                user_id=str(current_user.id),
                session_id=conversation_id,
                action="Chat Response",
                details="Agent provided a conversational response."
            )

    # 2. Persist Assistant Reply to PostgreSQL
    node_forge_data = {}
    for m in reversed(messages):
        if getattr(m, "type", None) == "ai":
            node_forge_data = (getattr(m, "additional_kwargs", {}) or {}).get("forge_data") or {}
            break

    forge_meta = {
        **node_forge_data,
        "is_tool_forged": is_tool_forged,
        "forged_tool": forged_tool,
        "sandbox_results": final_state.get("sandbox_results"),
        "tests_passed": final_state.get("tests_passed"),
        "repair_attempts": final_state.get("repair_attempts"),
    }
    has_forge_meta = bool(is_tool_forged or node_forge_data)
    async with get_db() as db:
        await ConversationService.add_message(
            db,
            conversation_id=conversation_id,
            role="assistant",
            content=reply,
            forge_data=forge_meta if has_forge_meta else None,
        )

    return ChatResponse(
        session_id=session_id,
        conversation_id=conversation_id,
        reply=reply,
        forged_tool=forged_tool,
        sandbox_results=final_state.get("sandbox_results"),
        tests_passed=final_state.get("tests_passed"),
        repair_attempts=final_state.get("repair_attempts"),
        is_tool_forged=is_tool_forged,
        forge_data=forge_meta if has_forge_meta else None,
    )


# ============================================================
# Tools Registry Endpoints (PostgreSQL backed, user-scoped)
# ============================================================

class ToolStatusUpdate(BaseModel):
    status: str


@app.get("/api/tools")
async def list_tools(current_user: User = Depends(get_current_user)):
    """List all forged and registered tools with metrics for the authenticated user."""
    async with get_db() as db:
        tools = await RegistryRepository.list_tools(db, user_id=str(current_user.id))
        tool_list = [
            {
                "id": str(t.id),
                "name": t.name,
                "description": t.description,
                "code": t.code,
                "schema": t.schema_json,
                "tests_code": t.tests_code,
                "status": t.status,
                "reuse_count": t.reuse_count or 0,
                "success_rate": round(float(t.success_rate or 0.0), 4),
                "gate_score": round(float(t.gate_score or 0.0), 4),
                "last_used_at": t.last_used_at.isoformat() if t.last_used_at else None,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in tools
        ]
        return {"tools": tool_list, "count": len(tool_list)}


@app.patch("/api/tools/{tool_id}/status")
async def update_tool_status(
    tool_id: str,
    payload: ToolStatusUpdate,
    current_user: User = Depends(get_current_user),
):
    """Toggle tool status (active, inactive, degraded, quarantined) for the authenticated user."""
    allowed_statuses = {"active", "inactive", "degraded", "quarantined"}
    target_status = payload.status.lower().strip()
    if target_status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{payload.status}'. Must be one of: {', '.join(sorted(allowed_statuses))}",
        )

    async with get_db() as db:
        updated = await RegistryRepository.update_tool_status(
            db, tool_id=tool_id, user_id=str(current_user.id), status=target_status
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Tool not found or permission denied")
        tool_data = {
            "id": str(updated.id),
            "name": updated.name,
            "code": updated.code,
            "schema_json": updated.schema_json,
            "status": updated.status,
        }

    # If deactivated, evict from dynamic in-memory MCP registry; if reactivated, re-register
    if target_status != "active":
        dynamic_mcp_registry.unregister_dynamic_tool(str(current_user.id), tool_id)
    else:
        dynamic_mcp_registry.register_dynamic_tool(
            user_id=str(current_user.id),
            tool_id=tool_data["id"],
            name=tool_data["name"],
            code=tool_data["code"],
            schema=tool_data["schema_json"] or {},
        )

    return {
        "status": "success",
        "tool_id": tool_data["id"],
        "name": tool_data["name"],
        "new_status": tool_data["status"],
    }


@app.delete("/api/tools/{tool_id}")
async def delete_tool(
    tool_id: str,
    current_user: User = Depends(get_current_user),
):
    """Permanently delete a tool owned by the authenticated user."""
    async with get_db() as db:
        deleted = await RegistryRepository.delete_tool(
            db, tool_id=tool_id, user_id=str(current_user.id)
        )
        if not deleted:
            raise HTTPException(status_code=404, detail="Tool not found or permission denied")

    # Evict from dynamic in-memory MCP registry after successful DB transaction commit
    dynamic_mcp_registry.unregister_dynamic_tool(str(current_user.id), tool_id)

    return {"status": "success", "message": f"Tool '{tool_id}' successfully deleted."}


@app.get("/api/tools/{tool_id}/export")
async def export_tool(
    tool_id: str,
    current_user: User = Depends(get_current_user),
):
    """Export a registered tool as a portable .sfatool JSON package."""
    async with get_db() as db:
        tool = await RegistryRepository.get_tool(db, tool_id=tool_id)
        if not tool or (tool.user_id and str(tool.user_id) != str(current_user.id)):
            raise HTTPException(status_code=404, detail="Tool not found or permission denied")

        payload = export_sfatool_payload(tool)
        safe_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', tool.name or "tool")
        filename = f"{safe_name}.sfatool"
        return JSONResponse(
            content=payload,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Type": "application/json",
            },
        )


@app.post("/api/tools/import")
async def import_tool(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """
    Import a .sfatool file or JSON payload.
    Validates structure, enforces AST security profiling gate, and registers under user's namespace.
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON format in request body.")

    # 1. Validate .sfatool format and parse Python syntax
    is_valid, err_msg, cleaned = validate_sfatool_payload(body)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Invalid .sfatool package: {err_msg}")

    # 2. Enforce AST Security Profiling Gate
    is_safe, sec_reason = verify_import_security(cleaned["code"], cleaned["tests"])
    if not is_safe:
        raise HTTPException(status_code=400, detail=sec_reason)

    async with get_db() as db:
        # 3. Handle name collisions in user namespace
        existing_tools = await RegistryRepository.list_tools(db, user_id=str(current_user.id))
        target_name = cleaned["name"]
        if any(t.name.lower() == target_name.lower() for t in existing_tools):
            target_name = f"{target_name}_imported_{uuid.uuid4().hex[:6]}"

        # 4. Save into PostgreSQL with status reflecting test presence
        has_tests = bool(cleaned["tests"] and cleaned["tests"].strip())
        tool_status = "active" if has_tests else "untested"

        imported_tool = await RegistryRepository.add_tool(
            db,
            name=target_name,
            description=cleaned["description"] or f"Imported tool {target_name}",
            code=cleaned["code"],
            schema=cleaned["schema"],
            tests_code=cleaned["tests"],
            user_id=str(current_user.id),
            status=tool_status,
        )
        tool_data = {
            "id": str(imported_tool.id),
            "name": imported_tool.name,
            "description": imported_tool.description,
            "code": imported_tool.code,
            "schema_json": imported_tool.schema_json,
            "status": imported_tool.status,
        }

    # 5. Hot-swap into dynamic MCP registry only if active (has regression test suite)
    if tool_status == "active":
        hot_swapped = dynamic_mcp_registry.register_dynamic_tool(
            user_id=str(current_user.id),
            tool_id=tool_data["id"],
            name=tool_data["name"],
            code=tool_data["code"],
            schema=tool_data["schema_json"] or {},
        )
        if not hot_swapped:
            async with get_db() as db:
                await RegistryRepository.delete_tool(db, tool_data["id"], str(current_user.id))
            raise HTTPException(
                status_code=400,
                detail=f"Tool '{tool_data['name']}' could not be loaded into runtime MCP registry: compilation or execution failed.",
            )

    return {
        "status": "success",
        "message": f"Tool '{tool_data['name']}' successfully verified and imported.",
        "tool": {
            "id": tool_data["id"],
            "name": tool_data["name"],
            "description": tool_data["description"],
            "status": tool_data["status"],
            "schema": tool_data["schema_json"],
        },
    }


@app.post("/api/tools/{tool_id}/test")
async def test_tool(tool_id: str, current_user: User = Depends(get_current_user)):
    """Test and verify a registered tool in the Docker sandbox regression suite."""
    import ast
    async with get_db() as db:
        tool = await RegistryRepository.get_tool(db, tool_id=tool_id)
        if not tool or (tool.user_id and str(tool.user_id) != str(current_user.id)):
            raise HTTPException(status_code=404, detail="Tool not found or access denied")
        try:
            ast.parse(tool.code or "")
        except SyntaxError as exc:
            return {
                "status": "failed",
                "message": f"Tool syntax validation error: {str(exc)}",
            }

        from agents.evaluation.gate_two import evaluate_regression
        if tool.tests_code and tool.tests_code.strip():
            passed, logs = await asyncio.to_thread(evaluate_regression, tool)
            if passed is True:
                return {
                    "status": "passed",
                    "message": f"Sandbox regression tests passed for {tool.name}.",
                    "logs": logs,
                }
            elif passed is False:
                return {
                    "status": "failed",
                    "message": f"Sandbox regression tests failed for {tool.name}.",
                    "logs": logs,
                }
            else:
                return {
                    "status": "syntax_only",
                    "message": f"Syntax verified for {tool.name}, but sandbox was unavailable: {logs}",
                }

        return {
            "status": "passed",
            "message": f"Syntax and AST validation verified for {tool.name}. Note: tool has no stored regression tests.",
        }



@app.get("/api/logs")
async def list_logs(
    session_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
):
    """List activity logs for the authenticated user with optional session and status filtering."""
    async with get_db() as db:
        logs = await RegistryRepository.list_logs(
            db,
            user_id=str(current_user.id),
            session_id=session_id,
            status=status,
            limit=limit,
            offset=offset,
        )
        log_list = [
            {
                "id": l.id,
                "session_id": l.session_id,
                "action": l.action,
                "details": l.details,
                "status": l.status,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in logs
        ]
        return {"logs": log_list}


@app.websocket("/ws/logs/{user_id}")
async def websocket_logs(
    websocket: WebSocket,
    user_id: str,
    token: Optional[str] = Query(None),
):
    """
    WebSocket endpoint streaming agent lifecycle events in real time.
    Requires a valid JWT access token matching user_id.
    """
    if not token:
        await websocket.accept()
        await websocket.close(code=4003, reason="Missing authentication token")
        return

    payload = decode_access_token(token)
    if not payload or str(payload.get("sub")) != str(user_id):
        await websocket.accept()
        await websocket.close(code=4003, reason="Unauthorized or invalid token")
        return

    async with get_db() as db:
        user = await RegistryRepository.get_user_by_id(db, user_id)
        token_iat = payload.get("iat")
        is_revoked = False
        if token_iat and user and user.updated_at:
            if token_iat < int(user.updated_at.timestamp()):
                is_revoked = True

        if not user or not user.is_active or is_revoked:
            await websocket.accept()
            await websocket.close(code=4003, reason="User deactivated or token revoked")
            return

    await connection_manager.connect(user_id, websocket)
    try:
        await websocket.send_json({
            "type": "CONNECTION_ESTABLISHED",
            "user_id": user_id,
            "message": "Connected to real-time agent observability stream.",
        })
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.warning("WebSocket error for user '%s': %s", user_id, str(exc))
    finally:
        connection_manager.disconnect(user_id, websocket)


@app.get("/api/providers")
async def list_providers_legacy(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Legacy alias for listing model providers."""
    providers = await RegistryRepository.list_providers(db, user_id=str(current_user.id))
    return {
        "providers": [
            {
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "has_api_key": bool(p.api_key),
                "is_active": p.is_active,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in providers
        ]
    }


@app.get("/api/mcp-servers")
async def list_mcp_servers_legacy(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Legacy alias for listing MCP servers."""
    servers = await RegistryRepository.list_mcp_servers(db, user_id=str(current_user.id))
    return {
        "mcp_servers": [
            {
                "id": s.id,
                "name": s.name,
                "url": s.url,
                "status": s.status,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in servers
        ]
    }
