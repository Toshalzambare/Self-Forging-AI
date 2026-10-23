"""
Benchmark and Unit test suite for the Novel Multi-Signal Hybrid Tool Search Algorithm (Plan 04-05).
Tests:
- S_intent, S_struct, S_perf individual component mathematical properties
- Multi-factor candidate ranking and threshold gating
- Tenant-isolated retrieval in PostgreSQL
- core_node seamless tool reuse without unnecessary re-forging
"""
import pytest
import pytest_asyncio
import os
import sys
import uuid
from unittest.mock import patch, AsyncMock, MagicMock

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from registry.database import get_db, engine
from registry.repository import RegistryRepository
from registry.mcp_manager import dynamic_mcp_registry
from agents.search.hybrid_search import HybridToolSearcher
from agents.nodes.core import core_node
from langchain_core.messages import AIMessage, HumanMessage


@pytest_asyncio.fixture(autouse=True)
async def cleanup():
    dynamic_mcp_registry.clear()
    yield
    dynamic_mcp_registry.clear()
    await engine.dispose()


def test_intent_score_discrimination():
    """Verify semantic intent score discriminates relevant vs irrelevant tools."""
    # Relevant: hash calculation
    score_rel = HybridToolSearcher.compute_intent_score(
        query="Compute SHA-256 hash of text",
        tool_name="sha256_hasher",
        tool_desc="Generates sha256 cryptographic hash of input text string",
    )
    # Irrelevant: weather tool
    score_irrel = HybridToolSearcher.compute_intent_score(
        query="Compute SHA-256 hash of text",
        tool_name="get_weather",
        tool_desc="Fetches current weather temperature for a city",
    )

    assert score_rel > 0.60
    assert score_irrel < 0.20
    assert score_rel > score_irrel * 3


def test_struct_score_evaluation():
    """Verify structural schema compatibility scoring."""
    schema_with_text = {
        "properties": {
            "text": {"type": "string"},
            "encoding": {"type": "string"}
        }
    }
    # Query mentions 'text'
    score_match = HybridToolSearcher.compute_struct_score(
        query="Hash this text please",
        schema=schema_with_text,
    )
    # Query mentions none of the parameters
    score_no_match = HybridToolSearcher.compute_struct_score(
        query="What is the weather outside?",
        schema=schema_with_text,
    )

    assert score_match > score_no_match


def test_perf_score_bayesian_growth():
    """Verify performance prior increases monotonically with validated reuse count."""
    p_zero = HybridToolSearcher.compute_perf_score(gate_score=1.0, reuse_count=0)
    p_one = HybridToolSearcher.compute_perf_score(gate_score=1.0, reuse_count=1)
    p_low = HybridToolSearcher.compute_perf_score(gate_score=1.0, reuse_count=2)
    p_high = HybridToolSearcher.compute_perf_score(gate_score=1.0, reuse_count=20)

    assert 0.0 < p_zero <= 0.8
    assert p_one > p_zero
    assert p_low > p_one
    assert p_high > p_low
    assert p_high <= 1.0


@pytest.mark.asyncio
async def test_hybrid_search_end_to_end_matching():
    """Verify HybridToolSearcher finds top match above threshold and rejects below threshold."""
    user_id = str(uuid.uuid4())
    async with get_db() as db:
        user = await RegistryRepository.create_user(
            db,
            email=f"hybrid_{user_id[:8]}@example.com",
            username=f"hybrid_{user_id[:8]}",
            password_hash="fakehash",
        )
        user_id = user.id

        await RegistryRepository.add_tool(
            db,
            name="markdown_table_formatter",
            description="Formats raw comma separated CSV text into a markdown table",
            code="def execute(csv_data): return '| header |'",
            schema={"properties": {"csv_data": {"type": "string"}}},
            user_id=user_id,
        )
        await RegistryRepository.add_tool(
            db,
            name="currency_converter",
            description="Converts currency amounts between USD, EUR, and GBP",
            code="def execute(amount, from_curr, to_curr): return 100",
            schema={"properties": {"amount": {"type": "number"}}},
            user_id=user_id,
        )

        # 1. Search for markdown formatting task -> should match markdown_table_formatter
        match = await HybridToolSearcher.search(
            db=db,
            task="Please format this CSV data into a markdown table",
            user_id=user_id,
            threshold=0.55,
        )
        assert match is not None
        assert match.tool.name == "markdown_table_formatter"
        assert match.score >= 0.55
        assert match.breakdown["intent"] > 0.5

        # 2. Search for completely unrelated task -> should return None
        no_match = await HybridToolSearcher.search(
            db=db,
            task="Tell me a bedtime story about dragons",
            user_id=user_id,
            threshold=0.60,
        )
        assert no_match is None


@pytest.mark.asyncio
async def test_hybrid_search_tenant_isolation():
    """Verify User B cannot discover or match User A's private tools."""
    user_a_id = str(uuid.uuid4())
    user_b_id = str(uuid.uuid4())

    async with get_db() as db:
        user_a = await RegistryRepository.create_user(
            db,
            email=f"user_a_{user_a_id[:8]}@example.com",
            username=f"user_a_{user_a_id[:8]}",
            password_hash="fakehash",
        )
        user_b = await RegistryRepository.create_user(
            db,
            email=f"user_b_{user_b_id[:8]}@example.com",
            username=f"user_b_{user_b_id[:8]}",
            password_hash="fakehash",
        )
        user_a_id = user_a.id
        user_b_id = user_b.id

        # User A owns a secret tool
        await RegistryRepository.add_tool(
            db,
            name="user_a_proprietary_hash",
            description="Custom secret hashing routine for enterprise auth",
            code="def execute(): return 'secret'",
            schema={},
            user_id=user_a_id,
        )

        # User A searches -> matches
        match_a = await HybridToolSearcher.search(
            db=db,
            task="run proprietary hash routine",
            user_id=user_a_id,
            threshold=0.50,
        )
        assert match_a is not None
        assert match_a.tool.name == "user_a_proprietary_hash"

        # User B searches with identical prompt -> no match found
        match_b = await HybridToolSearcher.search(
            db=db,
            task="run proprietary hash routine",
            user_id=user_b_id,
            threshold=0.50,
        )
        assert match_b is None


@pytest.mark.asyncio
async def test_core_node_reuses_existing_tool_without_forging():
    """Verify core_node automatically reuses an existing tool and executes it."""
    user_id = str(uuid.uuid4())
    async with get_db() as db:
        user = await RegistryRepository.create_user(
            db,
            email=f"core_reuse_{user_id[:8]}@example.com",
            username=f"core_reuse_{user_id[:8]}",
            password_hash="fakehash",
        )
        user_id = user.id

        tool = await RegistryRepository.add_tool(
            db,
            name="text_reverser",
            description="Reverses any input string text",
            code="def execute(text: str) -> str: return text[::-1]",
            schema={"properties": {"text": {"type": "string"}}},
            tests_code="from generated_tool import execute\ndef test_rev(): assert execute('Antigravity') == 'ytivargitnA'",
            user_id=user_id,
        )

    state = {
        "messages": [HumanMessage(content="Please reverse the text 'Antigravity'")],
        "task": "Please reverse the text 'Antigravity'",
        "user_id": user_id,
    }

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(side_effect=[
        # 1. extract_tool_arguments
        AIMessage(content='{"text": "Antigravity"}'),
        # 2. final answer synthesis
        AIMessage(content="The reversed text is 'ytivargitnA'."),
    ])

    with patch("agents.nodes.core.llm", mock_llm):
        with patch("agents.execution.tool_runner.llm", mock_llm):
            result = await core_node(state)

            assert result["missing_capability"] == ""
            assert len(result["messages"]) == 1
            ai_msg = result["messages"][0]
            assert "ytivargitnA" in ai_msg.content

            # Verify forge_data recorded reuse
            forge_data = ai_msg.additional_kwargs.get("forge_data", {})
            assert forge_data.get("is_tool_reused") is True
            assert forge_data.get("tool_name") == "text_reverser"
            assert forge_data.get("result") == "ytivargitnA"
