"""
Resilient JSON extraction utility for LLM agent outputs.
Extracts valid JSON objects from markdown fences, conversational preambles,
and dirty LLM generation traces.
"""
import re
import json
from typing import Any, Dict, Optional


class JSONExtractionError(ValueError):
    """Raised when JSON cannot be extracted or parsed from LLM output."""
    def __init__(self, message: str, raw_text: str = ""):
        super().__init__(message)
        self.raw_text = raw_text


def _find_balanced_json(text: str) -> Optional[str]:
    """
    Locates the outermost balanced { ... } block in text,
    ignoring braces inside quoted strings.
    """
    start_idx = text.find("{")
    if start_idx == -1:
        return None

    in_string = False
    escape = False
    depth = 0
    candidate_start = -1

    for i in range(start_idx, len(text)):
        char = text[i]

        if escape:
            escape = False
            continue

        if char == "\\":
            if in_string:
                escape = True
            continue

        if char == '"':
            in_string = not in_string
            continue

        if not in_string:
            if char == "{":
                if depth == 0:
                    candidate_start = i
                depth += 1
            elif char == "}":
                depth -= 1
                if depth == 0 and candidate_start != -1:
                    return text[candidate_start : i + 1]

    return None


def extract_json_from_text(text: str) -> Dict[str, Any]:
    """
    Extracts and parses a JSON object from text.
    Handles markdown fences (```json ... ```), raw objects, and conversational wrappers.
    """
    if not text or not isinstance(text, str):
        raise JSONExtractionError("Empty or non-string input provided for JSON extraction.", raw_text=str(text))

    cleaned = text.strip()

    # 1. First, attempt to match markdown code blocks ```json ... ``` or ``` ... ```
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, re.IGNORECASE)
    if fence_match:
        fence_content = fence_match.group(1).strip()
        try:
            parsed = json.loads(fence_content)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            # Fall through to brace extraction on fence content
            cleaned = fence_content

    # 2. Direct JSON decode if entire string is valid JSON
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    # 3. Balanced brace extraction
    balanced_candidate = _find_balanced_json(cleaned)
    if balanced_candidate:
        try:
            parsed = json.loads(balanced_candidate)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            # Try gentle sanitization of unescaped control characters in string literals
            sanitized = re.sub(r'(?<!\\)[\r\n\t]+', ' ', balanced_candidate)
            try:
                parsed = json.loads(sanitized)
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                pass

    # 4. Fallback: regex search for outermost curly braces
    regex_match = re.search(r"(\{[\s\S]*\})", cleaned)
    if regex_match:
        candidate = regex_match.group(1).strip()
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

    snippet = (text[:120] + "...") if len(text) > 120 else text
    raise JSONExtractionError(
        f"Failed to extract valid JSON object from LLM response snippet: '{snippet}'",
        raw_text=text,
    )
