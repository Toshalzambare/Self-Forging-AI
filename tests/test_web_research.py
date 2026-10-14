"""
Unit test suite for the Autonomous Web Research Engine (Plan 04-02).
Tests:
- Search client querying with mock and DuckDuckGo fallbacks
- HTML cleaning and documentation extraction
- ResearchEngine core error extraction, capability grounding, and error resolution
- Forge and Repair nodes augmented with autonomous web research
"""
import pytest
import os
import sys
from unittest.mock import patch, AsyncMock, MagicMock

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from config import config
from agents.research.search_client import search_web, _get_mock_search_results
from agents.research.doc_extractor import clean_html_to_markdown, extract_documentation
from agents.research.engine import ResearchEngine
from agents.nodes.forge import forge_node
from agents.nodes.repair import repair_node
from langchain_core.messages import AIMessage


@pytest.mark.asyncio
async def test_search_web_empty_query():
    """Verify search_web safely returns empty list on blank or whitespace query."""
    res = await search_web("")
    assert res == []
    res_ws = await search_web("   ")
    assert res_ws == []


@pytest.mark.asyncio
async def test_search_web_mock_provider():
    """Verify search_web with mock provider returns structured mock data adhering to limit."""
    original_provider = config.SEARCH_PROVIDER
    try:
        config.SEARCH_PROVIDER = "mock"
        results = await search_web("python json validation", max_results=2)
        assert len(results) == 2
        for r in results:
            assert "title" in r
            assert "url" in r
            assert "snippet" in r
            assert "python json validation" in r["title"]
    finally:
        config.SEARCH_PROVIDER = original_provider


def test_clean_html_to_markdown_basic_and_filtering():
    """Verify scripts, styles, navigation, and boilerplate tags are removed and technical text preserved."""
    html = """
    <html>
        <head><title>Test Documentation</title></head>
        <nav><a href="/home">Home</a></nav>
        <script>console.log('noise');</script>
        <style>body { color: red; }</style>
        <main>
            <h1>FastAPI Tutorial</h1>
            <p>FastAPI is a modern, fast web framework.</p>
            <pre>from fastapi import FastAPI
app = FastAPI()</pre>
            <ul>
                <li>High performance</li>
                <li>Easy to learn</li>
            </ul>
        </main>
        <footer>Copyright 2026</footer>
    </html>
    """
    md = clean_html_to_markdown(html)
    assert "FastAPI Tutorial" in md
    assert "FastAPI is a modern, fast web framework." in md
    assert "```python" in md
    assert "from fastapi import FastAPI" in md
    assert "High performance" in md
    # Stripped tags
    assert "console.log" not in md
    assert "color: red" not in md
    assert "Copyright 2026" not in md


def test_clean_html_to_markdown_empty_and_truncation():
    """Verify empty input and truncation at max_chars limit."""
    assert clean_html_to_markdown("") == ""

    long_html = "<div>" + "<p>Extremely long documentation text paragraph.</p>" * 200 + "</div>"
    result = clean_html_to_markdown(long_html, max_chars=300)
    assert len(result) <= 350
    assert "... [documentation truncated]" in result


@pytest.mark.asyncio
async def test_extract_documentation_invalid_url():
    """Verify invalid or non-HTTP URLs return an empty string safely."""
    assert await extract_documentation("") == ""
    assert await extract_documentation("not_a_url") == ""
    assert await extract_documentation("ftp://example.com") == ""


def test_research_engine_extract_core_error():
    """Verify regex extraction of python exceptions from tracebacks."""
    assert ResearchEngine._extract_core_error("") == ""

    traceback_1 = """
Traceback (most recent call last):
  File "test_tool.py", line 12, in <module>
    res = execute(0)
  File "tool.py", line 4, in execute
    return 100 / divisor
ZeroDivisionError: division by zero
    """
    assert ResearchEngine._extract_core_error(traceback_1) == "ZeroDivisionError: division by zero"

    traceback_2 = """
Traceback (most recent call last):
  File "sandbox.py", line 40, in run
KeyError: 'missing_key'
    """
    assert ResearchEngine._extract_core_error(traceback_2) == "KeyError: 'missing_key'"

    fallback_text = "Custom failure occurred during execution"
    assert ResearchEngine._extract_core_error(fallback_text) == fallback_text


@pytest.mark.asyncio
async def test_research_capability_formatting():
    """Verify research_capability queries web and formats markdown reference."""
    original_provider = config.SEARCH_PROVIDER
    try:
        config.SEARCH_PROVIDER = "mock"
        doc = await ResearchEngine.research_capability("calculate prime numbers")
        assert "Verified External Documentation Reference" in doc
        assert "Mock Documentation: python calculate prime numbers documentation library example" in doc
    finally:
        config.SEARCH_PROVIDER = original_provider


@pytest.mark.asyncio
async def test_research_error_formatting():
    """Verify research_error extracts exception and formats remediation context."""
    original_provider = config.SEARCH_PROVIDER
    try:
        config.SEARCH_PROVIDER = "mock"
        guidance = await ResearchEngine.research_error(
            "TypeError: unsupported operand type(s) for +: 'int' and 'str'"
        )
        assert "Verified Error Resolution Guidance" in guidance
        assert "TypeError: unsupported operand type(s) for +: 'int' and 'str'" in guidance
    finally:
        config.SEARCH_PROVIDER = original_provider


@pytest.mark.asyncio
async def test_forge_node_autonomously_researches_documentation():
    """Verify forge_node triggers web research when documentation_context is empty."""
    original_provider = config.SEARCH_PROVIDER
    try:
        config.SEARCH_PROVIDER = "mock"
        initial_state = {
            "missing_capability": "parse bibtex citations",
            "documentation_context": "",
        }

        mock_llm_response = AIMessage(
            content='```json\n{"python_code": "def execute(): pass", "json_schema": {"type": "object"}}\n```'
        )

        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(return_value=mock_llm_response)

        with patch("agents.nodes.forge.llm", mock_llm):
            result = await forge_node(initial_state)

            assert "generated_code" in result
            assert "documentation_context" in result
            assert "Verified External Documentation Reference" in result["documentation_context"]
            assert result["repair_attempts"] == 0

            # Verify prompt received documentation context
            call_args = mock_llm.ainvoke.call_args[0][0]
            human_msg = call_args[1].content
            assert "parse bibtex citations" in human_msg
            assert "Verified External Documentation Reference" in human_msg
    finally:
        config.SEARCH_PROVIDER = original_provider


@pytest.mark.asyncio
async def test_repair_node_autonomously_researches_error():
    """Verify repair_node triggers web research when sandbox errors are present."""
    original_provider = config.SEARCH_PROVIDER
    try:
        config.SEARCH_PROVIDER = "mock"
        initial_state = {
            "generated_code": "def execute(x): return 10 / x",
            "sandbox_results": "ZeroDivisionError: division by zero",
            "repair_attempts": 0,
        }

        mock_llm_response = AIMessage(
            content='```json\n{"python_code": "def execute(x): return 10 / x if x != 0 else 0"}\n```'
        )

        mock_llm = MagicMock()
        mock_llm.ainvoke = AsyncMock(return_value=mock_llm_response)

        with patch("agents.nodes.repair.llm", mock_llm):
            result = await repair_node(initial_state)

            assert "generated_code" in result
            assert "documentation_context" in result
            assert "Verified Error Resolution Guidance" in result["documentation_context"]
            assert result["repair_attempts"] == 1

            # Verify prompt received the error resolution guidance
            call_args = mock_llm.ainvoke.call_args[0][0]
            human_msg = call_args[1].content
            assert "ZeroDivisionError: division by zero" in human_msg
            assert "Verified Error Resolution Guidance" in human_msg
    finally:
        config.SEARCH_PROVIDER = original_provider


def test_is_safe_url_ssrf_protection():
    """Verify is_safe_url blocks loopback, private, and internal addresses."""
    from agents.research.doc_extractor import is_safe_url

    assert is_safe_url("http://localhost") is False
    assert is_safe_url("http://127.0.0.1:8000/doc") is False
    assert is_safe_url("http://169.254.169.254/latest/meta-data") is False
    assert is_safe_url("http://192.168.1.1/admin") is False
    assert is_safe_url("http://10.0.0.1/internal") is False
    assert is_safe_url("http://[::1]/") is False
    assert is_safe_url("ftp://example.com") is False
    # Valid public domain
    assert is_safe_url("https://docs.python.org/3/") is True

