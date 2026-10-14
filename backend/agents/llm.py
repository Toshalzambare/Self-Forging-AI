import os
from langchain_openai import ChatOpenAI
from config import config


def get_llm(temperature: float = 0.0) -> ChatOpenAI:
    """Instantiate a ChatOpenAI client with configured timeout, retries, and endpoint."""
    return ChatOpenAI(
        base_url=config.OMNIROUTE_BASE_URL,
        api_key=config.OMNIROUTE_API_KEY,
        model=config.OMNIROUTE_MODEL,
        temperature=temperature,
        timeout=config.LLM_REQUEST_TIMEOUT,
        max_retries=config.LLM_MAX_RETRIES,
    )


# Default singleton instance (temperature=0.0 for deterministic agent tasks)
llm = get_llm(temperature=0.0)

