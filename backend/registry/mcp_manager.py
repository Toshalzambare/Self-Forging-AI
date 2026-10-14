"""
Dynamic MCP Registry Manager:
Hot-swaps forged and tested tools into the in-memory runtime registry,
enabling immediate execution by the agent without server restarts.
Enforces multi-tenant namespace isolation via user_id partitioning.
"""
import logging
from typing import Callable, Optional, Dict, Any, List
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class DynamicToolEntry:
    """Metadata and compiled callable wrapper for a dynamically registered tool."""

    def __init__(
        self,
        tool_id: str,
        name: str,
        user_id: Optional[str],
        code: str,
        schema: dict,
        callable_fn: Callable,
    ):
        self.tool_id = tool_id
        self.name = name
        self.user_id = user_id
        self.code = code
        self.schema = schema
        self.callable_fn = callable_fn
        self.registered_at = datetime.now(timezone.utc)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "tool_id": self.tool_id,
            "name": self.name,
            "user_id": self.user_id,
            "schema": self.schema,
            "code": self.code,
            "registered_at": self.registered_at.isoformat(),
        }


class DynamicMcpRegistry:
    """
    In-memory registry managing hot-swapped tools per user/tenant.
    Provides fast O(1) lookup of compiled execute callables by tool_id or name.
    """

    def __init__(self):
        # Keyed by formatted namespace string: "{tenant}:{identifier}"
        self._entries_by_id: Dict[str, DynamicToolEntry] = {}
        self._entries_by_name: Dict[str, DynamicToolEntry] = {}

    @staticmethod
    def _namespace_key(user_id: Optional[str], identifier: str) -> str:
        tenant = user_id or "global"
        return f"{tenant}:{identifier.lower().strip()}"

    def register_dynamic_tool(
        self,
        *,
        user_id: Optional[str],
        tool_id: str,
        name: str,
        code: str,
        schema: Optional[dict] = None,
    ) -> bool:
        """
        Compile Python code in an isolated module namespace and cache the execute function.
        Returns True if registration succeeded, False otherwise.
        """
        if not code or not code.strip():
            logger.error("Failed to register tool '%s': code is empty", name)
            return False

        tool_schema = schema or {}
        local_scope: Dict[str, Any] = {}

        try:
            # Compile and execute the verified code in an isolated scope
            compiled_bytecode = compile(code, f"<dynamic_tool_{name}>", "exec")
            exec(compiled_bytecode, local_scope)

            callable_fn = local_scope.get("execute")
            if not callable(callable_fn):
                logger.error("Tool '%s' does not define a callable 'execute' function", name)
                return False

            entry = DynamicToolEntry(
                tool_id=tool_id,
                name=name,
                user_id=user_id,
                code=code,
                schema=tool_schema,
                callable_fn=callable_fn,
            )

            id_key = self._namespace_key(user_id, tool_id)
            name_key = self._namespace_key(user_id, name)

            self._entries_by_id[id_key] = entry
            self._entries_by_name[name_key] = entry

            logger.info("Successfully hot-swapped dynamic tool '%s' (ID: %s, User: %s)", name, tool_id, user_id)
            return True

        except Exception as e:
            logger.error("Failed compiling and registering tool '%s': %s", name, str(e), exc_info=True)
            return False

    def get_tool_callable(
        self,
        user_id: Optional[str],
        name_or_id: str,
    ) -> Optional[Callable]:
        """
        Retrieve the compiled callable function for a given tool ID or tool name.
        Checks user tenant namespace first, then global fallback.
        """
        if not name_or_id:
            return None

        # Check tenant specific by id or name
        id_key = self._namespace_key(user_id, name_or_id)
        if id_key in self._entries_id_or_name(id_key):
            return self._resolve_entry(id_key).callable_fn

        # Check global fallback if user_id was provided
        if user_id:
            global_key = self._namespace_key(None, name_or_id)
            if global_key in self._entries_id_or_name(global_key):
                return self._resolve_entry(global_key).callable_fn

        return None

    def _entries_id_or_name(self, key: str) -> Dict[str, DynamicToolEntry]:
        if key in self._entries_by_id:
            return self._entries_by_id
        return self._entries_by_name

    def _resolve_entry(self, key: str) -> DynamicToolEntry:
        return self._entries_by_id.get(key) or self._entries_by_name[key]

    def get_tool_entry(
        self,
        user_id: Optional[str],
        name_or_id: str,
    ) -> Optional[DynamicToolEntry]:
        """Retrieve the full DynamicToolEntry metadata and callable wrapper."""
        if not name_or_id:
            return None

        id_key = self._namespace_key(user_id, name_or_id)
        if id_key in self._entries_by_id:
            return self._entries_by_id[id_key]
        if id_key in self._entries_by_name:
            return self._entries_by_name[id_key]

        if user_id:
            global_key = self._namespace_key(None, name_or_id)
            if global_key in self._entries_by_id:
                return self._entries_by_id[global_key]
            if global_key in self._entries_by_name:
                return self._entries_by_name[global_key]

        return None

    def list_user_dynamic_tools(self, user_id: Optional[str]) -> List[Dict[str, Any]]:
        """List all registered dynamic tools accessible to a user."""
        tenant = user_id or "global"
        seen_ids = set()
        results = []

        for entry in self._entries_by_id.values():
            if (entry.user_id == user_id or entry.user_id is None) and entry.tool_id not in seen_ids:
                seen_ids.add(entry.tool_id)
                results.append(entry.to_dict())

        return results

    def unregister_dynamic_tool(self, user_id: Optional[str], name_or_id: str) -> bool:
        """Remove a tool from the in-memory registry."""
        entry = self.get_tool_entry(user_id, name_or_id)
        if not entry:
            return False

        id_key = self._namespace_key(entry.user_id, entry.tool_id)
        name_key = self._namespace_key(entry.user_id, entry.name)

        self._entries_by_id.pop(id_key, None)
        self._entries_by_name.pop(name_key, None)
        return True

    def clear(self):
        """Clear all entries (primarily for test tear-downs)."""
        self._entries_by_id.clear()
        self._entries_by_name.clear()


# Global singleton instance
dynamic_mcp_registry = DynamicMcpRegistry()
