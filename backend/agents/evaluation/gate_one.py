"""
Gate 1: Semantic & Schema Effectiveness Evaluator.
Validates code safety AST profiling, argument schema compatibility,
and contextual task alignment before granting tool reuse admission.
"""
import logging
from typing import Tuple, Dict, Any, Optional
from registry.models import Tool
from sandbox.profiler import check_security

logger = logging.getLogger(__name__)

EFFECTIVENESS_THRESHOLD = 0.65


def evaluate_effectiveness(
    tool: Tool,
    current_task: str,
    arguments: Optional[Dict[str, Any]] = None,
) -> Tuple[bool, float, str]:
    """
    Evaluate Gate 1 admission criteria.
    Returns: (is_admissible: bool, score: float, rationale: str)
    """
    args = arguments if isinstance(arguments, dict) else {}

    # 1. AST Security Profiling Check
    violations = check_security(tool.code)
    if violations:
        msg = f"Security profiling rejected tool '{tool.name}': " + "; ".join(violations)
        logger.warning(msg)
        return False, 0.0, msg

    # 2. Schema and Argument Compatibility
    schema = tool.schema_json or {}
    properties = (
        schema.get("properties")
        or schema.get("parameters", {}).get("properties")
        or {}
    )
    required_params = (
        schema.get("required")
        or schema.get("parameters", {}).get("required")
        or []
    )

    # Check for missing required parameters
    missing_required = [param for param in required_params if param not in args]
    if missing_required:
        msg = f"Missing required parameters for '{tool.name}': {missing_required}"
        logger.info(msg)
        return False, 0.35, msg

    # Calculate parameter coverage ratio
    if properties:
        matched = sum(1 for p in properties if p in args)
        param_score = (matched + 1.0) / (len(properties) + 1.0)
    else:
        # Zero-parameter tool
        param_score = 0.90

    # 3. Contextual Task Alignment
    task_clean = (current_task or "").lower()
    name_clean = tool.name.replace("_", " ").lower()
    desc_clean = (tool.description or "").lower()

    if name_clean in task_clean or any(word in task_clean for word in tool.name.split("_")):
        context_score = 0.95
    elif any(token in task_clean for token in desc_clean.split() if len(token) > 3):
        context_score = 0.80
    else:
        context_score = 0.60

    total_score = round((0.60 * param_score) + (0.40 * context_score), 3)
    is_admissible = total_score >= EFFECTIVENESS_THRESHOLD
    rationale = (
        f"Gate 1 passed (Score: {total_score:.3f})"
        if is_admissible
        else f"Gate 1 failed (Score: {total_score:.3f} < {EFFECTIVENESS_THRESHOLD})"
    )

    return is_admissible, total_score, rationale
