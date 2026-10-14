"""
SFA Tool (.sfatool) Serialization, Validation & Security Verification.
Provides canonical export packaging, schema validation, and AST security
gating for portable tool exchange.
"""
import ast
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple
from registry.models import Tool
from sandbox.profiler import check_security

logger = logging.getLogger(__name__)

SFA_TOOL_VERSION = "1.0"


def export_sfatool_payload(tool: Tool) -> Dict[str, Any]:
    """
    Serializes a Tool ORM model into the standard .sfatool JSON package.
    """
    return {
        "sfa_version": SFA_TOOL_VERSION,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "meta": {
            "name": tool.name,
            "description": tool.description or "",
            "version": "1.0.0",
            "author_id": str(tool.user_id) if tool.user_id else None,
        },
        "schema": tool.schema_json or {},
        "code": tool.code or "",
        "tests": tool.tests_code or "",
        "metrics": {
            "reuse_count": tool.reuse_count or 0,
            "success_rate": round(float(tool.success_rate or 0.0), 4),
            "gate_score": round(float(tool.gate_score or 0.0), 4),
            "last_used_at": tool.last_used_at.isoformat() if tool.last_used_at else None,
        },
    }


def validate_sfatool_payload(data: Any) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Validates structure and schema format of an imported .sfatool payload.
    Returns: (is_valid: bool, error_msg: str, cleaned_payload: dict)
    """
    if not isinstance(data, dict):
        return False, "Payload must be a valid JSON object.", {}

    version = data.get("sfa_version")
    if not version:
        return False, "Missing 'sfa_version' in tool package.", {}

    meta = data.get("meta")
    if not isinstance(meta, dict) or not meta.get("name"):
        return False, "Package 'meta' must be an object containing a 'name'.", {}

    code = data.get("code")
    if not isinstance(code, str) or not code.strip():
        return False, "Tool 'code' must be a non-empty Python string.", {}

    schema = data.get("schema")
    if schema is None or not isinstance(schema, dict):
        return False, "Tool 'schema' must be a JSON Schema object.", {}

    tests = data.get("tests")
    if tests is None:
        tests = ""
    if not isinstance(tests, str):
        return False, "Tool 'tests' must be a string containing pytest code.", {}

    # Verify code parses as valid Python
    try:
        ast.parse(code)
    except SyntaxError as e:
        return False, f"Syntax error in tool code: {str(e)}", {}

    if tests.strip():
        try:
            ast.parse(tests)
        except SyntaxError as e:
            return False, f"Syntax error in test code: {str(e)}", {}

    cleaned = {
        "name": str(meta["name"]).strip(),
        "description": str(meta.get("description", "")).strip(),
        "code": code.strip(),
        "schema": schema,
        "tests": tests.strip() if tests else "",
        "metrics": data.get("metrics") or {},
    }
    return True, "", cleaned


def verify_import_security(code: str, tests_code: str = "") -> Tuple[bool, str]:
    """
    Runs AST Security Profiling Gate against imported tool code and its tests.
    Rejects forbidden modules, OS system calls, and file system escapes.
    Returns: (is_safe: bool, reason: str)
    """
    # 1. Profile Tool Implementation Code
    code_violations = check_security(code)
    if code_violations:
        reason = f"Security profiling rejected imported tool code: {', '.join(code_violations)}"
        logger.warning(reason)
        return False, reason

    # 2. Profile Test Code
    if tests_code and tests_code.strip():
        test_violations = check_security(tests_code)
        if test_violations:
            reason = f"Security profiling rejected imported test code: {', '.join(test_violations)}"
            logger.warning(reason)
            return False, reason

    return True, "AST security verification passed."
