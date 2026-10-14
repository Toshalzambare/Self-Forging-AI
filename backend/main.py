"""
Self-Forging AI Agent - FastAPI Backend Entry Point
"""

import uuid
import asyncio
import logging
import re
from typing import Optional
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_core.messages import HumanMessage

from config import config
from agents.graph import build_graph
from registry import get_db, check_db_connection, RegistryRepository, User, dynamic_mcp_registry
from registry.sfatool import export_sfatool_payload, validate_sfatool_payload, verify_import_security
from auth import auth_router, get_current_user
from storage import check_storage_connection
from conversation import conversation_router, ConversationService

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

# Mount Authentication & Conversation routers
app.include_router(auth_router)
app.include_router(conversation_router)

# Build the LangGraph once at startup
graph = None
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    global graph
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
        print("Database migrations applied successfully.")
    except Exception as e:
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


class ChatResponse(BaseModel):
    session_id: str
    conversation_id: str
    reply: str
    forged_tool: Optional[dict] = None
    sandbox_results: Optional[str] = None
    tests_passed: Optional[bool] = None
    repair_attempts: Optional[int] = None
    is_tool_forged: bool = False


# ============================================================
# Health Endpoints
# ============================================================

@app.get("/")
async def root():
    return {"name": config.APP_NAME, "version": config.APP_VERSION, "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy", "graph_ready": graph is not None}


@app.get("/api/health")
async def health_check():
    """Combined health check for DB and storage."""
    db_ok = await check_db_connection()
    storage_ok = await asyncio.to_thread(check_storage_connection)

    overall = "ok" if db_ok and storage_ok else "degraded"
    status_code = 200 if overall == "ok" else 503

    return JSONResponse(
        status_code=status_code,
        content={
            "status": overall,
            "db": "connected" if db_ok else "error",
            "storage": "connected" if storage_ok else "error",
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

    initial_state = {
        "messages": [HumanMessage(content=req.message)],
        "task": req.message,
        "missing_capability": "",
        "generated_code": "",
        "generated_schema": {},
        "adversarial_tests": "",
        "sandbox_results": "",
        "tests_passed": False,
        "repair_attempts": 0,
        "documentation_context": "",
        "user_id": str(current_user.id),
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

        # Save to PostgreSQL registry if tests passed and not already registered by graph
        if final_state.get("tests_passed") and not final_state.get("is_registered"):
            tool_id = str(uuid.uuid4())
            name = final_state.get("generated_schema", {}).get("name", f"tool_{tool_id[:8]}")
            desc = final_state.get("generated_schema", {}).get("description", "")
            async with get_db() as db:
                await RegistryRepository.add_tool(
                    db,
                    tool_id=tool_id,
                    user_id=str(current_user.id),
                    name=name,
                    description=desc,
                    code=forged_tool["code"],
                    schema=forged_tool["schema"],
                    tests_code=forged_tool.get("tests", "")
                )
                await RegistryRepository.add_log(
                    db,
                    user_id=str(current_user.id),
                    session_id=session_id,
                    action="Tool Registered",
                    details=f"Tool '{name}' successfully verified and added to registry."
                )
        elif not final_state.get("tests_passed"):
            async with get_db() as db:
                await RegistryRepository.add_log(
                    db,
                    user_id=str(current_user.id),
                    session_id=session_id,
                    action="Tool Verification Failed",
                    details=f"Tool generation failed verification after {final_state.get('repair_attempts')} attempts.",
                    status="error"
                )
    else:
        async with get_db() as db:
            await RegistryRepository.add_log(
                db,
                user_id=str(current_user.id),
                session_id=session_id,
                action="Chat Response",
                details="Agent provided a conversational response."
            )

    # 2. Persist Assistant Reply to PostgreSQL
    forge_meta = {
        "is_tool_forged": is_tool_forged,
        "forged_tool": forged_tool,
        "sandbox_results": final_state.get("sandbox_results"),
        "tests_passed": final_state.get("tests_passed"),
        "repair_attempts": final_state.get("repair_attempts"),
    }
    async with get_db() as db:
        await ConversationService.add_message(
            db,
            conversation_id=conversation_id,
            role="assistant",
            content=reply,
            forge_data=forge_meta if is_tool_forged else None,
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

        # 4. Save into PostgreSQL
        imported_tool = await RegistryRepository.add_tool(
            db,
            name=target_name,
            description=cleaned["description"] or f"Imported tool {target_name}",
            code=cleaned["code"],
            schema=cleaned["schema"],
            tests_code=cleaned["tests"],
            user_id=str(current_user.id),
            status="active",
        )
        tool_data = {
            "id": str(imported_tool.id),
            "name": imported_tool.name,
            "description": imported_tool.description,
            "code": imported_tool.code,
            "schema_json": imported_tool.schema_json,
            "status": imported_tool.status,
        }

    # 5. Hot-swap into dynamic MCP registry after successful DB transaction commit
    dynamic_mcp_registry.register_dynamic_tool(
        user_id=str(current_user.id),
        tool_id=tool_data["id"],
        name=tool_data["name"],
        code=tool_data["code"],
        schema=tool_data["schema_json"] or {},
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
    """Test and verify a registered tool's syntax and AST execution readiness."""
    import ast
    async with get_db() as db:
        tool = await RegistryRepository.get_tool(db, tool_id=tool_id)
        if not tool or (tool.user_id and str(tool.user_id) != str(current_user.id)):
            raise HTTPException(status_code=404, detail="Tool not found or access denied")
        try:
            ast.parse(tool.code or "")
            return {
                "status": "passed",
                "message": f"Syntax and AST validation verified for {tool.name}. Function ready for sandbox execution.",
            }
        except SyntaxError as exc:
            return {
                "status": "failed",
                "message": f"Tool syntax validation error: {str(exc)}",
            }



@app.get("/api/logs")
async def list_logs(current_user: User = Depends(get_current_user)):
    """List activity logs for the authenticated user."""
    async with get_db() as db:
        logs = await RegistryRepository.list_logs(db, user_id=str(current_user.id))
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


@app.get("/api/providers")
@app.get("/api/settings/providers")
async def list_providers(current_user: User = Depends(get_current_user)):
    """List configured model providers for the authenticated user."""
    async with get_db() as db:
        providers = await RegistryRepository.list_providers(db, user_id=str(current_user.id))
        provider_list = [
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
        return {"providers": provider_list}


class ProviderUpdate(BaseModel):
    api_key: Optional[str] = None
    is_active: Optional[bool] = None


@app.patch("/api/settings/providers/{provider_id}")
async def update_provider(
    provider_id: str,
    req: ProviderUpdate,
    current_user: User = Depends(get_current_user),
):
    """Update or save API key / active status for a model provider with tenant isolation."""
    user_id_str = str(current_user.id)
    async with get_db() as db:
        provider = await RegistryRepository.get_provider(db, provider_id=provider_id, user_id=user_id_str)
        if not provider:
            raise HTTPException(status_code=404, detail="Provider not found")

        # If this is a global provider (user_id is None), do not mutate shared row.
        # Instead, create or update a user-scoped override row.
        if provider.user_id is None:
            user_override_id = f"{provider.id}_{user_id_str}"
            user_override = await RegistryRepository.get_provider(db, provider_id=user_override_id, user_id=user_id_str)
            if not user_override:
                user_override = Provider(
                    id=user_override_id,
                    user_id=user_id_str,
                    name=provider.name,
                    description=provider.description,
                    api_key=req.api_key if req.api_key is not None else provider.api_key,
                    is_active=req.is_active if req.is_active is not None else provider.is_active,
                )
                db.add(user_override)
            else:
                if req.api_key is not None:
                    user_override.api_key = req.api_key
                if req.is_active is not None:
                    user_override.is_active = req.is_active
        else:
            if str(provider.user_id) != user_id_str:
                raise HTTPException(status_code=403, detail="Access denied to provider settings")
            if req.api_key is not None:
                provider.api_key = req.api_key
            if req.is_active is not None:
                provider.is_active = req.is_active

        await db.commit()
        return {"status": "success", "message": f"Settings updated for {provider.name}"}



@app.get("/api/mcp-servers")
@app.get("/api/settings/mcp_servers")
async def list_mcp_servers(current_user: User = Depends(get_current_user)):
    """List configured MCP servers for the authenticated user."""
    async with get_db() as db:
        servers = await RegistryRepository.list_mcp_servers(db, user_id=str(current_user.id))
        server_list = [
            {
                "id": s.id,
                "name": s.name,
                "url": s.url,
                "status": s.status,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in servers
        ]
        return {"mcp_servers": server_list}
