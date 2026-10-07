"""
Self-Forging AI Agent - FastAPI Backend Entry Point
"""

import uuid
import asyncio
from typing import Optional
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_core.messages import HumanMessage

from config import config
from agents.graph import build_graph
import tool_registry as registry

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

# Build the LangGraph once at startup
graph = None

@app.on_event("startup")
async def startup():
    global graph
    warnings = config.validate()
    if warnings:
        for w in warnings:
            print(f"CONFIG WARNING: {w}")
    else:
        print("Configuration loaded successfully.")
    print(f"OmniRoute endpoint: {config.OMNIROUTE_BASE_URL}")
    print(f"Default model: {config.OMNIROUTE_MODEL}")
    
    # Initialize SQLite Registry
    registry.init_db()
    
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
# Health
# ============================================================

@app.get("/")
async def root():
    return {"name": config.APP_NAME, "version": config.APP_VERSION, "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy", "graph_ready": graph is not None}


# ============================================================
# Chat Endpoint  
# ============================================================

@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
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
        
        # Save to registry if tests passed
        if final_state.get("tests_passed"):
            tool_id = str(uuid.uuid4())
            name = final_state.get("generated_schema", {}).get("name", f"tool_{tool_id[:8]}")
            desc = final_state.get("generated_schema", {}).get("description", "")
            registry.add_tool(
                tool_id=tool_id,
                name=name,
                description=desc,
                code=forged_tool["code"],
                schema=forged_tool["schema"]
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
# Tools Registry Endpoints
# ============================================================

@app.get("/api/tools")
async def list_tools():
    """List all forged and registered tools."""
    tools = registry.list_tools()
    return {"tools": tools, "count": len(tools)}
