"""
WebSocket Connection Manager for Real-Time Agent Observability.
Manages active connections per authenticated user and broadcasts lifecycle events.
"""

import asyncio
import logging
from typing import Dict, List
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages active WebSockets segmented by user_id."""

    def __init__(self):
        # user_id -> list of active WebSocket connections
        self._active_connections: Dict[str, List[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        """Accept and register an active WebSocket connection for a user."""
        await websocket.accept()
        async with self._lock:
            if user_id not in self._active_connections:
                self._active_connections[user_id] = []
            self._active_connections[user_id].append(websocket)
            active_count = len(self._active_connections[user_id])
        logger.info("WebSocket connected for user '%s' (active: %d)", user_id, active_count)

    def disconnect(self, user_id: str, websocket: WebSocket) -> None:
        """Remove a disconnected WebSocket from active registry."""
        if user_id in self._active_connections:
            if websocket in self._active_connections[user_id]:
                self._active_connections[user_id].remove(websocket)
            if not self._active_connections[user_id]:
                del self._active_connections[user_id]
        logger.info("WebSocket disconnected for user '%s'", user_id)

    async def broadcast_user(self, user_id: str, event: dict) -> None:
        """Broadcast an event payload to all active WebSockets of a specific user."""
        connections = list(self._active_connections.get(user_id, []))
        if not connections:
            return

        dead_connections = []
        for ws in connections:
            try:
                await asyncio.wait_for(ws.send_json(event), timeout=2.0)
            except Exception as exc:
                logger.warning("Failed to deliver WebSocket message to user '%s': %s", user_id, str(exc))
                dead_connections.append(ws)

        if dead_connections:
            async with self._lock:
                for dead_ws in dead_connections:
                    self.disconnect(user_id, dead_ws)

    def is_connected(self, user_id: str) -> bool:
        """Check if a user has at least one active connection."""
        return bool(self._active_connections.get(user_id))

    def active_user_count(self) -> int:
        """Return the number of connected users."""
        return len(self._active_connections)


# Global singleton instance
connection_manager = ConnectionManager()
