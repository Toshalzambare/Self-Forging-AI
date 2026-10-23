import os
from langchain_openai import ChatOpenAI
from config import config


def normalize_model_name(model: str | None) -> str:
    """Normalize user-typed model names to OmniRoute combo or provider formats."""
    raw = (model or "").strip()
    if not raw:
        return config.OMNIROUTE_MODEL or "auto"
    low = raw.lower()
    if low in ("auto", "default", "omniroute", "omniroute auto"):
        return "auto"
    if "/" in raw:
        return raw
    if "haiku" in low:
        return "auto/claude-haiku"
    if "sonnet" in low or "opus" in low:
        return "auto/claude-sonnet"
    if "coding" in low:
        return "auto/best-coding"
    if "reasoning" in low:
        return "auto/best-reasoning"
    if "fast" in low:
        return "auto/best-fast"
    return raw


def get_llm(temperature: float = 0.0, model: str | None = None) -> ChatOpenAI:
    """Instantiate a ChatOpenAI client with configured timeout, retries, and endpoint."""
    model_name = normalize_model_name(model)
    return ChatOpenAI(
        base_url=config.OMNIROUTE_BASE_URL,
        api_key=config.OMNIROUTE_API_KEY,
        model=model_name,
        temperature=temperature,
        timeout=config.LLM_REQUEST_TIMEOUT,
        max_retries=config.LLM_MAX_RETRIES,
    )


# Default singleton instance (temperature=0.0 for deterministic agent tasks)
llm = get_llm(temperature=0.0)

