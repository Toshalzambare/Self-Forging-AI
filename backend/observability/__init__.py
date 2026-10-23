"""
Observability package for real-time WebSocket streaming and audit logging.
"""

from observability.connection_manager import connection_manager, ConnectionManager
from observability.events import (
    emit_agent_event,
    AgentLifecycleEvent,
    register_session_listener,
    unregister_session_listener,
)

__all__ = [
    "connection_manager",
    "ConnectionManager",
    "emit_agent_event",
    "AgentLifecycleEvent",
    "register_session_listener",
    "unregister_session_listener",
]
