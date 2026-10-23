"""
Server-Sent Events (SSE) Protocol Formatter.
Formats structured data and lifecycle events into standards-compliant SSE streams.
"""
import json
from typing import Any


def format_sse(event: str, data: Any) -> str:
    """
    Format an event and payload into a standard SSE wire frame.
    Format:
        event: <event_name>
        data: <json_string>

    """
    if isinstance(data, (dict, list)):
        payload = json.dumps(data, ensure_ascii=False)
    else:
        payload = str(data)

    return f"event: {event}\ndata: {payload}\n\n"
