"""
Self-Forging AI Agent - FastAPI Backend Entry Point
"""

import uuid
import asyncio
from typing import Optional
from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_core.messages import HumanMessage

from config import config
from agents.graph import build_graph
from registry import get_db, check_db_connection, RegistryRepository, User
from auth import auth_router, get_current_user
from storage import check_storage_connection

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

# Mount Authentication router
app.include_router(auth_router)

# Build the LangGraph once at startup
graph = None


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


class ChatResponse(BaseModel):
    session_id: str
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
    storage_ok = check_storage_connection()

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

    initial_state = {
        "messages": [HumanMessage(content=req.message)],
        "task": req.message,
        "missing_capability": "",
        "generated_code": "",
        "generated_schema": {},
        "adversarial_tests": "",
        "sandbox_results": "",
        "tests_passed": False,
        "repair_attempts": 0
    }

    try:
        final_state = await graph.ainvoke(initial_state)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")

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

        # Save to PostgreSQL registry if tests passed
        if final_state.get("tests_passed"):
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
        else:
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

    return ChatResponse(
        session_id=session_id,
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

@app.get("/api/tools")
async def list_tools(current_user: User = Depends(get_current_user)):
    """List all forged and registered tools for the authenticated user."""
    async with get_db() as db:
        tools = await RegistryRepository.list_tools(db, user_id=str(current_user.id))
        tool_list = [
            {
                "id": str(t.id),
                "name": t.name,
                "description": t.description,
                "code": t.code,
                "schema": t.schema_json,
                "status": t.status,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in tools
        ]
        return {"tools": tool_list, "count": len(tool_list)}


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
                "api_key": p.api_key,
                "is_active": p.is_active,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in providers
        ]
        return {"providers": provider_list}


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
