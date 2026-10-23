"""
Tests for Automated Research Benchmark Suite.
Ensures benchmark suite executes and validates Mode A vs Mode B safety invariants.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from benchmarks.benchmark_tasks import BENCHMARK_TASKS
from benchmarks.run_benchmarks import run_benchmark_suite


def test_benchmark_tasks_structure():
    assert len(BENCHMARK_TASKS) == 20
    synthesis_tasks = [t for t in BENCHMARK_TASKS if t["category"] == "synthesis"]
    repair_tasks = [t for t in BENCHMARK_TASKS if t["category"] == "repair"]
    sec_tasks = [t for t in BENCHMARK_TASKS if t["category"] == "security_regression"]

    assert len(synthesis_tasks) == 10
    assert len(repair_tasks) == 5
    assert len(sec_tasks) == 5


def test_benchmark_suite_execution(tmp_path):
    summary = run_benchmark_suite(output_dir=str(tmp_path))
    assert summary["total_tasks"] == 20
    metrics = summary["metrics"]

    # Invariants
    assert metrics["synthesis_accuracy_pct"] == 100.0
    assert metrics["ast_security_catch_rate_mode_a_pct"] == 100.0
    assert metrics["ast_security_catch_rate_mode_b_pct"] == 0.0
    assert metrics["regression_prevention_mode_a_pct"] == 100.0
    assert metrics["regression_prevention_mode_b_pct"] == 0.0
