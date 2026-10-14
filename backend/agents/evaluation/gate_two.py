"""
Gate 2: Lightweight Sandbox Regression Verification.
Re-evaluates the tool against its stored adversarial test suite
in the pre-cached sandbox before allowing reuse, preventing silent regression.
"""
import logging
from typing import Tuple
from registry.models import Tool
from sandbox.executor import execute_in_sandbox, client

logger = logging.getLogger(__name__)


def evaluate_regression(tool: Tool, timeout: int = 5) -> Tuple[bool, str]:
    """
    Run Gate 2 regression verification inside the isolated Docker sandbox.
    Fails closed if the sandbox daemon is offline or inaccessible.
    Returns: (tests_passed: bool, output_trace: str)
    """
    if client is None:
        logger.warning("Sandbox unavailable; rejecting Gate 2 for tool '%s'", tool.name)
        return False, "Sandbox unavailable; regression verification cannot run safely without isolated container."

    tests = tool.tests_code or ""
    if not tests.strip():
        # No regression suite stored: tool passes with notice
        logger.info("Tool '%s' has no stored tests; passing Gate 2 by default.", tool.name)
        return True, "No regression test suite stored; Gate 2 passed by default."

    try:
        passed, logs = execute_in_sandbox(tool.code, tests, timeout=timeout)
        if "CRITICAL ERROR: Docker daemon" in logs:
            logger.warning("Docker daemon failure during Gate 2 for tool '%s'", tool.name)
            return False, "Sandbox daemon error; regression verification cannot run safely."
        return passed, logs
    except Exception as e:
        logger.error("Docker sandbox execution error during Gate 2 for tool '%s': %s", tool.name, str(e))
        return False, f"Sandbox execution error: {str(e)}"

