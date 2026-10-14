"""
Dual-Gate Engine Coordinator:
Coordinates dynamic re-evaluation upon tool reuse:
1. Gate 1: Semantic & Schema Effectiveness Evaluation
2. Gate 2: Lightweight Sandbox Regression Verification
Updates rolling gate scores, reuse counters, and quarantine status in PostgreSQL.
"""
import logging
from datetime import datetime, timezone
from typing import Tuple, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from registry.models import Tool
from registry.repository import RegistryRepository
from agents.evaluation.gate_one import evaluate_effectiveness
from agents.evaluation.gate_two import evaluate_regression

logger = logging.getLogger(__name__)

QUARANTINE_THRESHOLD = 0.40


class DualGateEngine:
    """Manages dynamic Dual-Gate re-evaluation, Bayesian decay, and status transitions."""

    @classmethod
    async def evaluate_tool_reuse(
        cls,
        db: AsyncSession,
        tool: Tool,
        task: str,
        arguments: Optional[Dict[str, Any]] = None,
    ) -> Tuple[bool, str]:
        """
        Execute Dual-Gate evaluation before tool reuse.
        Returns: (admitted: bool, message: str)
        """
        args = arguments if isinstance(arguments, dict) else {}
        initial_score = tool.gate_score if (tool.gate_score and tool.gate_score > 0.0) else 0.85

        # ── Gate 1: Semantic & Schema Effectiveness ─────────────────────────────
        is_admissible, eff_score, eff_rationale = evaluate_effectiveness(tool, task, args)
        if not is_admissible:
            # Penalize gate score
            new_score = round(max(0.0, (initial_score * 0.70) + (eff_score * 0.30)), 3)
            tool.gate_score = new_score
            if new_score < QUARANTINE_THRESHOLD:
                tool.status = "quarantined"
            await db.flush()

            await RegistryRepository.add_log(
                db,
                session_id="dual_gate_eval",
                action="GATE_1_REJECTION",
                details=f"Tool '{tool.name}' rejected by Gate 1: {eff_rationale}. Score decayed to {new_score}.",
                status="warning",
                user_id=tool.user_id,
            )
            await db.commit()
            return False, f"Gate 1 Rejected: {eff_rationale}"

        # ── Gate 2: Sandbox Regression Verification ─────────────────────────────
        passed_regression, regression_logs = evaluate_regression(tool)
        if not passed_regression:
            # Severe penalty on regression failure
            new_score = round(max(0.0, initial_score * 0.60), 3)
            tool.gate_score = new_score
            if new_score < QUARANTINE_THRESHOLD:
                tool.status = "quarantined"
            else:
                tool.status = "degraded"
            await db.flush()

            await RegistryRepository.add_log(
                db,
                session_id="dual_gate_eval",
                action="GATE_2_REGRESSION_FAILURE",
                details=f"Tool '{tool.name}' failed Gate 2 regression. Score decayed to {new_score}. Status: {tool.status}.",
                status="error",
                user_id=tool.user_id,
            )
            await db.commit()
            return False, f"Gate 2 Regression Failed: {regression_logs}"

        # ── Both Gates Passed: Promote Metrics & Confirm Active Status ──────────
        tool.reuse_count = (tool.reuse_count or 0) + 1
        tool.last_used_at = datetime.now(timezone.utc)
        tool.status = "active"

        # Update success rate
        prev_success = tool.success_rate or 0.0
        tool.success_rate = round(
            ((prev_success * (tool.reuse_count - 1)) + 1.0) / tool.reuse_count, 3
        )

        # Reweight gate score towards 1.0
        tool.gate_score = round(
            min(1.0, (initial_score * 0.85) + (eff_score * 0.15)), 3
        )
        await db.flush()

        await RegistryRepository.add_log(
            db,
            session_id="dual_gate_eval",
            action="DUAL_GATE_PASSED",
            details=f"Tool '{tool.name}' passed Dual-Gate re-evaluation. Reuse #{tool.reuse_count}, Gate Score: {tool.gate_score}.",
            status="success",
            user_id=tool.user_id,
        )
        await db.commit()

        logger.info(
            "Tool '%s' passed Dual-Gate re-evaluation. New gate score: %.3f, reuse count: %d",
            tool.name, tool.gate_score, tool.reuse_count
        )
        return True, "Dual-Gate admission passed successfully."
