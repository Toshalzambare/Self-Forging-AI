"""
Settings API Router.
Endpoints for user profile, model providers, sandbox tuning, and external MCP endpoints.
"""

import time
import uuid
import httpx
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from registry.database import get_db_session
from registry.models import User, Provider, McpServer
from registry.repository import RegistryRepository
from auth.dependencies import get_current_user
from agents.research.doc_extractor import is_safe_url_async, resolve_safe_target_async
from config import config
from settings.schemas import ProviderUpdate, SandboxUpdate, McpServerCreate, McpServerTest

router = APIRouter(prefix="/api/settings", tags=["settings"])

_USER_SANDBOX_CONFIG: Dict[str, Dict[str, Any]] = {}


def _get_default_sandbox() -> Dict[str, Any]:
    return {
        "image": getattr(config, "DOCKER_SANDBOX_IMAGE", "sfa-sandbox:latest"),
        "memory_limit": getattr(config, "DOCKER_SANDBOX_MEMORY_LIMIT", "512m"),
        "timeout_seconds": getattr(config, "DOCKER_SANDBOX_TIMEOUT", 60),
        "network_mode": getattr(config, "DOCKER_SANDBOX_NETWORK", "none"),
    }


def get_user_sandbox_config(user_id: Optional[str] = None) -> Dict[str, Any]:
    """Retrieve configured sandbox resource limits for a user."""
    if user_id and user_id in _USER_SANDBOX_CONFIG:
        return _USER_SANDBOX_CONFIG[user_id]
    return _get_default_sandbox()


@router.get("/profile")
async def get_settings_profile(current_user: User = Depends(get_current_user)):
    """Retrieve active user profile and runtime LLM config."""
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "username": current_user.username,
        "auth_provider": current_user.auth_provider,
        "active_model": config.OMNIROUTE_MODEL,
        "active_endpoint": config.OMNIROUTE_BASE_URL,
        "active_provider": "OmniRoute",
    }


@router.get("/sandbox")
async def get_sandbox_config(current_user: User = Depends(get_current_user)):
    """Retrieve active execution sandbox parameters for the user."""
    user_id = str(current_user.id)
    return {"sandbox": _USER_SANDBOX_CONFIG.get(user_id, _get_default_sandbox())}


@router.patch("/sandbox")
async def update_sandbox_config(
    req: SandboxUpdate,
    current_user: User = Depends(get_current_user),
):
    """Update execution sandbox constraints (memory, timeout, network)."""
    user_id = str(current_user.id)
    current = _USER_SANDBOX_CONFIG.get(user_id, _get_default_sandbox()).copy()

    if req.image is not None:
        current["image"] = req.image.strip()
    if req.memory_limit is not None:
        current["memory_limit"] = req.memory_limit.strip()
    if req.timeout_seconds is not None:
        current["timeout_seconds"] = req.timeout_seconds
    if req.network_mode is not None:
        requested = req.network_mode.strip()
        if requested != "none" and getattr(config, "DOCKER_SANDBOX_NETWORK", "none") == "none":
            raise HTTPException(
                status_code=403,
                detail="Network access for the sandbox is disabled by the server operator.",
            )
        current["network_mode"] = requested

    _USER_SANDBOX_CONFIG[user_id] = current
    return {"status": "success", "sandbox": current}


@router.get("/providers")
async def list_providers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """List configured model providers for the authenticated user."""
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


@router.patch("/providers/{provider_id}")
async def update_provider(
    provider_id: str,
    req: ProviderUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Update or save API key / active status for a model provider."""
    user_id_str = str(current_user.id)
    provider = await RegistryRepository.get_provider(db, provider_id=provider_id, user_id=user_id_str)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

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
    return {
        "status": "success",
        "message": f"Stored credentials updated for {provider.name}. Agent calls route via active OmniRoute gateway.",
    }


@router.get("/mcp_servers")
async def list_mcp_servers(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """List configured MCP servers for the authenticated user."""
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


@router.post("/mcp_servers", status_code=status.HTTP_201_CREATED)
async def create_mcp_server(
    req: McpServerCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Add a new external MCP server for the authenticated user."""
    server = McpServer(
        id=f"mcp_{uuid.uuid4().hex[:8]}",
        user_id=str(current_user.id),
        name=req.name.strip(),
        url=req.url.strip(),
        status="active",
    )
    db.add(server)
    await db.commit()
    return {
        "status": "created",
        "mcp_server": {"id": server.id, "name": server.name, "url": server.url, "status": server.status},
    }


@router.delete("/mcp_servers/{server_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mcp_server(
    server_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Delete an external MCP server configuration."""
    stmt = select(McpServer).where(McpServer.id == server_id, McpServer.user_id == str(current_user.id))
    res = await db.execute(stmt)
    server = res.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="MCP server not found or access denied")

    await db.delete(server)
    await db.commit()
    return None


@router.post("/mcp_servers/test")
async def test_mcp_server(req: McpServerTest, current_user: User = Depends(get_current_user)):
    """Ping an external MCP endpoint with a 3-second timeout and return latency/status."""
    url = req.url.strip()
    if not url.startswith(("http://", "https://")):
        url = "http://" + url
    target = await resolve_safe_target_async(url)
    if not target:
        raise HTTPException(status_code=400, detail="URL targets a disallowed address.")

    bound_url, host_header, sni_hostname = target
    start = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=3.0, follow_redirects=False) as client:
            ext = {"sni_hostname": sni_hostname} if sni_hostname else None
            resp = await client.get(bound_url, headers={"Host": host_header}, extensions=ext)
            elapsed_ms = round((time.perf_counter() - start) * 1000, 1)
            is_ok = resp.status_code < 500
            return {
                "status": "online" if is_ok else "unreachable",
                "status_code": resp.status_code,
                "latency_ms": elapsed_ms,
                "message": f"Endpoint responded in {elapsed_ms}ms (HTTP {resp.status_code})",
            }
    except Exception as exc:
        elapsed_ms = round((time.perf_counter() - start) * 1000, 1)
        return {"status": "offline", "latency_ms": elapsed_ms, "message": f"Connection failed: {str(exc)}"}
