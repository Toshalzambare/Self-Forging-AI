"""
Test suite for Dual-Gate Admission & Dynamic Re-Evaluation Engine (Plan 04-06).
Tests:
- Gate 1: AST profiling rejection, missing argument detection, and effectiveness scoring
- Gate 2: Sandbox regression execution against stored adversarial tests
- DualGateEngine: End-to-end admission, metrics promotion, Bayesian decay, and quarantine transitions
"""
import pytest
import pytest_asyncio
import os
import sys
import uuid
from datetime import datetime, timezone

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from registry.database import get_db, engine
from registry.repository import RegistryRepository
from registry.models import Tool
from agents.evaluation.gate_one import evaluate_effectiveness
from agents.evaluation.gate_two import evaluate_regression
from agents.evaluation.dual_gate import DualGateEngine


@pytest_asyncio.fixture(autouse=True)
async def cleanup():
    yield
    await engine.dispose()


def test_gate_one_ast_security_rejection():
    """Verify Gate 1 rejects dangerous code containing banned imports."""
    bad_tool = Tool(
        name="malicious_tool",
        code="import os\ndef execute(): os.system('rm -rf /')",
        schema_json={},
    )
    is_admissible, score, msg = evaluate_effectiveness(bad_tool, "clean disk", {})
    assert is_admissible is False
    assert score == 0.0
    assert "Security profiling rejected" in msg
    assert "os" in msg


def test_gate_one_missing_required_arguments():
    """Verify Gate 1 rejects when required arguments are not supplied."""
    schema = {
        "required": ["api_key", "endpoint"],
        "properties": {
            "api_key": {"type": "string"},
            "endpoint": {"type": "string"},
        }
    }
    tool = Tool(
        name="api_fetcher",
        code="def execute(api_key, endpoint): return 'ok'",
        schema_json=schema,
    )
    is_admissible, score, msg = evaluate_effectiveness(
        tool,
        "Fetch data from endpoint",
        arguments={"api_key": "123"} # missing endpoint
    )
    assert is_admissible is False
    assert "Missing required parameters" in msg
    assert "endpoint" in msg


def test_gate_one_healthy_admission():
    """Verify Gate 1 admits compatible tool with valid arguments."""
    schema = {
        "required": ["text"],
        "properties": {"text": {"type": "string"}}
    }
    tool = Tool(
        name="word_counter",
        code="def execute(text: str) -> int: return len(text.split())",
        schema_json=schema,
    )
    is_admissible, score, msg = evaluate_effectiveness(
        tool,
        "Count words in this text",
        arguments={"text": "Hello world from test"}
    )
    assert is_admissible is True
    assert score >= 0.65
    assert "Gate 1 passed" in msg


def test_gate_two_passing_and_failing_regression():
    """Verify Gate 2 runs tests and catches code regressions."""
    # 1. Passing tests
    healthy_tool = Tool(
        name="doubler",
        code="def execute(n: int) -> int: return n * 2",
        tests_code="""
from generated_tool import execute
def test_doubler():
    assert execute(5) == 10
    assert execute(0) == 0
""",
    )
    passed, logs = evaluate_regression(healthy_tool)
    assert passed is True

    # 2. Failing tests (regression)
    broken_tool = Tool(
        name="broken_tool",
        code="def execute(n: int) -> int: return n + 999",  # regression!
        tests_code="""
from generated_tool import execute
def test_doubler():
    assert execute(5) == 10
""",
    )
    failed, fail_logs = evaluate_regression(broken_tool)
    assert failed is False
    assert "assert" in fail_logs.lower() or "failed" in fail_logs.lower()


@pytest.mark.asyncio
async def test_dual_gate_engine_success_promotion():
    """Verify Dual-Gate passes healthy tool and increments metrics in PostgreSQL."""
    user_id = str(uuid.uuid4())
    async with get_db() as db:
        user = await RegistryRepository.create_user(
            db,
            email=f"gate_user_{user_id[:8]}@example.com",
            username=f"gate_user_{user_id[:8]}",
            password_hash="fakehash",
        )
        tool = await RegistryRepository.add_tool(
            db,
            name="string_trimmer",
            description="Trims whitespace from string",
            code="def execute(s: str) -> str: return s.strip()",
            schema={"properties": {"s": {"type": "string"}}},
            tests_code="from generated_tool import execute\ndef test_trim(): assert execute('  hi  ') == 'hi'",
            user_id=user.id,
        )
        tool.gate_score = 0.85
        tool.reuse_count = 0
        await db.commit()

        # Execute Dual-Gate reuse admission
        admitted, msg = await DualGateEngine.evaluate_tool_reuse(
            db=db,
            tool=tool,
            task="Trim this string '  hello  '",
            arguments={"s": "  hello  "},
        )

        assert admitted is True
        assert "passed" in msg.lower()
        assert tool.reuse_count == 1
        assert tool.status == "active"
        assert tool.gate_score >= 0.85
        assert tool.success_rate == 1.0
        assert tool.last_used_at is not None


@pytest.mark.asyncio
async def test_dual_gate_engine_regression_penalty_and_quarantine():
    """Verify Gate 2 regression decays score and transitions tool to degraded/quarantined."""
    user_id = str(uuid.uuid4())
    async with get_db() as db:
        user = await RegistryRepository.create_user(
            db,
            email=f"gate_decay_{user_id[:8]}@example.com",
            username=f"gate_decay_{user_id[:8]}",
            password_hash="fakehash",
        )
        # Broken tool with failing tests
        tool = await RegistryRepository.add_tool(
            db,
            name="broken_calc",
            description="Calculation tool with broken logic",
            code="def execute(x): return x - 10",
            schema={"properties": {"x": {"type": "integer"}}},
            tests_code="from generated_tool import execute\ndef test_calc(): assert execute(5) == 5",
            user_id=user.id,
        )
        tool.gate_score = 0.80
        await db.commit()

        # 1. First failure -> decays score (0.80 * 0.6 = 0.48 >= 0.40), sets status to 'degraded'
        admitted, msg = await DualGateEngine.evaluate_tool_reuse(
            db=db,
            tool=tool,
            task="run calc on 5",
            arguments={"x": 5},
        )
        assert admitted is False
        assert "Regression Failed" in msg
        assert tool.status == "degraded"
        assert tool.gate_score == 0.48

        # 2. Second failure -> decays score (0.48 * 0.6 = 0.288 < 0.40), sets status to 'quarantined'
        admitted_2, msg_2 = await DualGateEngine.evaluate_tool_reuse(
            db=db,
            tool=tool,
            task="run calc on 5",
            arguments={"x": 5},
        )
        assert admitted_2 is False
        assert tool.status == "quarantined"
        assert tool.gate_score == 0.288
