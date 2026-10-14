"""
Tests for resilient JSON extraction and LLM client resilience.
"""
import os
import sys
import pytest

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from agents.utils.json_parser import extract_json_from_text, JSONExtractionError
from agents.llm import get_llm, llm
from config import config


def test_pure_json_extraction():
    text = '{"is_tool_needed": true, "task": "hash_generator"}'
    result = extract_json_from_text(text)
    assert result["is_tool_needed"] is True
    assert result["task"] == "hash_generator"


def test_markdown_fence_json_extraction():
    text = """```json
{
  "python_code": "def execute(): return 42",
  "json_schema": {"type": "object"}
}
```"""
    result = extract_json_from_text(text)
    assert "def execute(): return 42" in result["python_code"]
    assert result["json_schema"]["type"] == "object"


def test_generic_code_fence_json_extraction():
    text = """```
{
  "pytest_code": "def test_answer(): assert True"
}
```"""
    result = extract_json_from_text(text)
    assert "def test_answer():" in result["pytest_code"]


def test_conversational_preamble_and_postamble():
    text = """Here is the tool you requested:

```json
{
  "is_tool_needed": false,
  "response_to_user": "Hello from agent!"
}
```

Let me know if you need anything else!"""
    result = extract_json_from_text(text)
    assert result["is_tool_needed"] is False
    assert result["response_to_user"] == "Hello from agent!"


def test_nested_json_structures():
    text = """
    Result data:
    {
        "status": "success",
        "nested": {
            "depth": 2,
            "items": ["a", "b", "c"],
            "inner": {"flag": true}
        }
    }
    """
    result = extract_json_from_text(text)
    assert result["status"] == "success"
    assert result["nested"]["inner"]["flag"] is True
    assert len(result["nested"]["items"]) == 3


def test_json_with_escaped_quotes_and_brackets():
    text = '{"code": "def test(): text = \\"a {b} c\\"; return text", "valid": true}'
    result = extract_json_from_text(text)
    assert result["valid"] is True
    assert "a {b} c" in result["code"]


def test_invalid_json_raises_extraction_error():
    with pytest.raises(JSONExtractionError):
        extract_json_from_text("This is plain text with no valid json at all.")


def test_empty_input_raises_extraction_error():
    with pytest.raises(JSONExtractionError):
        extract_json_from_text("")

    with pytest.raises(JSONExtractionError):
        extract_json_from_text(None)


def test_llm_client_resilience_configuration():
    """Verify that get_llm instantiates ChatOpenAI with configured timeouts and retries."""
    custom_llm = get_llm(temperature=0.7)
    assert custom_llm.temperature == 0.7
    assert custom_llm.request_timeout == config.LLM_REQUEST_TIMEOUT
    assert custom_llm.max_retries == config.LLM_MAX_RETRIES

    # Default singleton has temperature 0.0
    assert llm.temperature == 0.0
    assert llm.request_timeout == config.LLM_REQUEST_TIMEOUT
    assert llm.max_retries == config.LLM_MAX_RETRIES
