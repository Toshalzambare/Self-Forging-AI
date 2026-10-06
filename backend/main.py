"""
Self-Forging AI Agent - FastAPI Backend Entry Point

This is the main server that:
1. Serves the REST API and WebSocket connections for the frontend
2. Hosts the LangGraph agent orchestration
3. Manages the Docker sandbox lifecycle
4. Runs the MCP tool registry
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import config

app = FastAPI(
    title="Self-Forging AI Agent",
    description="An autonomous AI agent that forges, tests, and registers its own tools at runtime.",
    version="0.1.0",
)

# Allow frontend dev server to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    """Run on server start: validate config, init DB, etc."""
    warnings = config.validate()
    if warnings:
        for w in warnings:
            print(f"⚠️  CONFIG WARNING: {w}")
    else:
        print("✅ Configuration loaded successfully.")

    print(f"🔌 OmniRoute endpoint: {config.OMNIROUTE_BASE_URL}")
    print(f"🤖 Default model: {config.OMNIROUTE_MODEL}")
    print(f"🐳 Sandbox image: {config.DOCKER_SANDBOX_IMAGE}")
    print(f"📦 Tool registry DB: {config.REGISTRY_DB_PATH}")


@app.get("/")
async def root():
    return {
        "name": "Self-Forging AI Agent",
        "version": "0.1.0",
        "status": "running",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


# ============================================================
# API Routes (will be added in later phases)
# ============================================================
# POST /api/chat          - Send a message to the agent
# WS   /ws/forge          - WebSocket for real-time forge logs
# GET  /api/tools          - List all registered tools
# GET  /api/tools/{id}     - Get a specific tool's details
# DELETE /api/tools/{id}   - Remove a tool from the registry
