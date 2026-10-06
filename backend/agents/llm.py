import os
from langchain_openai import ChatOpenAI
from config import config

# Initialize the LLM pointing to the OmniRoute proxy/endpoint
llm = ChatOpenAI(
    base_url=config.OMNIROUTE_BASE_URL,
    api_key=config.OMNIROUTE_API_KEY,
    model=config.OMNIROUTE_MODEL,
    temperature=0.0
)
