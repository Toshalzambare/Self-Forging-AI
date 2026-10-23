"""
Gate 2: Lightweight Sandbox Regression Verification.
Re-evaluates the tool against its stored adversarial test suite
in the pre-cached sandbox before allowing reuse, preventing silent regression.
"""
import logging
from typing import Tuple, Optional
from registry.models import Tool
from sandbox.executor import execute_in_sandbox, client, INFRASTRUCTURE_ERROR_MARKERS

logger = logging.getLogger(__name__)


def evaluate_regression(tool: Tool, timeout: Optional[int] = None) -> Tuple[Optional[bool], str]:
    """
    Run Gate 2 regression verification inside the isolated Docker sandbox.
    Returns: (tests_passed: Optional[bool], output_trace: str)
      - True: Regression tests passed successfully
      - False: Regression tests executed and failed
      - None: Infrastructure unavailable / Docker error / timeout (inconclusive)
    """
    if client is None:
        logger.warning("Sandbox unavailable; rejecting Gate 2 for tool '%s'", tool.name)
        return None, "Sandbox unavailable; regression verification cannot run safely without isolated container."

    tests = tool.tests_code or ""
    if not tests.strip():
        logger.warning("Tool '%s' has no stored tests; cannot pass Gate 2 regression verification.", tool.name)
        return False, "Tool has no stored regression tests; verification requires an adversarial test suite."

    try:
        user_id = str(tool.user_id) if getattr(tool, "user_id", None) else None
        passed, logs = execute_in_sandbox(tool.code, tests, timeout=timeout, user_id=user_id)
        if not passed and any(marker in logs for marker in INFRASTRUCTURE_ERROR_MARKERS):
            logger.warning("Sandbox infrastructure failure during Gate 2 for tool '%s': %s", tool.name, logs[:120])
            return None, f"Sandbox infrastructure error; regression verification inconclusive: {logs[:200]}"
        return passed, logs
    except Exception as e:
        logger.error("Docker sandbox execution error during Gate 2 for tool '%s': %s", tool.name, str(e))
        return None, f"Sandbox execution error: {str(e)}"

