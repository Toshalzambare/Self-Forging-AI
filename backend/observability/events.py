"""
Agent Lifecycle Event Emitter and Definitions.
Formats, persists to PostgreSQL activity_logs, and broadcasts events over WebSockets.
"""

import json
import logging
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from registry.database import get_db
from registry.repository import RegistryRepository
from observability.connection_manager import connection_manager

logger = logging.getLogger(__name__)


class AgentLifecycleEvent(str, Enum):
    AGENT_THINKING = "AGENT_THINKING"
    FORGE_STARTED = "FORGE_STARTED"
    SANDBOX_TESTING = "SANDBOX_TESTING"
    REPAIR_ATTEMPT = "REPAIR_ATTEMPT"
    TOOL_VERIFIED = "TOOL_VERIFIED"
    TOOL_FAILED = "TOOL_FAILED"
    TOOL_REUSED = "TOOL_REUSED"


async def emit_agent_event(
    user_id: str,
    session_id: str,
    event: str,
    status: str,
    summary: str,
    data: Optional[Dict[str, Any]] = None,
    db: Optional[AsyncSession] = None,
) -> dict:
    """
    Constructs a lifecycle event, broadcasts it over WebSockets to the user,
    and writes an entry to PostgreSQL activity_logs. Guaranteed non-raising.
    """
    try:
        event_name = event.value if isinstance(event, AgentLifecycleEvent) else str(event)
        now_iso = datetime.now(timezone.utc).isoformat()
        extra_data = data or {}

        payload = {
            "type": "AGENT_LIFECYCLE_EVENT",
            "event": event_name,
            "session_id": str(session_id) if session_id else None,
            "user_id": str(user_id) if user_id else None,
            "timestamp": now_iso,
            "status": status,
            "summary": summary,
            "data": extra_data,
        }

        # 1. Real-time broadcast over WebSockets
        try:
            if user_id:
                await connection_manager.broadcast_user(str(user_id), payload)
        except Exception as exc:
            logger.warning("Error broadcasting event '%s' via WebSocket: %s", event_name, str(exc))

        # 2. Persist to PostgreSQL ActivityLog
        try:
            details_str = json.dumps({"summary": summary, **extra_data}, default=str)
            if db is not None:
                await RegistryRepository.add_log(
                    db,
                    session_id=str(session_id) if session_id else "unknown_session",
                    action=event_name,
                    details=details_str,
                    status=status,
                    user_id=str(user_id) if user_id else None,
                )
            else:
                async with get_db() as local_db:
                    await RegistryRepository.add_log(
                        local_db,
                        session_id=str(session_id) if session_id else "unknown_session",
                        action=event_name,
                        details=details_str,
                        status=status,
                        user_id=str(user_id) if user_id else None,
                    )
        except Exception as exc:
            logger.error("Failed to persist ActivityLog for '%s': %s", event_name, str(exc))

        return payload
    except Exception as exc:
        logger.warning("Unexpected error in emit_agent_event: %s", str(exc))
        return {}
