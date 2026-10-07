"""
Self-Forging AI Agent - Backend Configuration

Loads environment variables and provides a centralized config object
for the entire backend application.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root
PROJECT_ROOT = Path(__file__).parent.parent
load_dotenv(PROJECT_ROOT / ".env")


class Config:
    """Centralized configuration loaded from environment variables."""

    # OmniRoute / LLM
    OMNIROUTE_BASE_URL: str = os.getenv("OMNIROUTE_BASE_URL", "http://localhost:20128/v1")
    OMNIROUTE_API_KEY: str = os.getenv("OMNIROUTE_API_KEY", "")
    OMNIROUTE_MODEL: str = os.getenv("OMNIROUTE_MODEL", "auto")

    # Docker Sandbox
    DOCKER_SANDBOX_IMAGE: str = os.getenv("DOCKER_SANDBOX_IMAGE", "python:3.11-slim")
    DOCKER_SANDBOX_TIMEOUT: int = int(os.getenv("DOCKER_SANDBOX_TIMEOUT", "60"))
    DOCKER_SANDBOX_MEMORY_LIMIT: str = os.getenv("DOCKER_SANDBOX_MEMORY_LIMIT", "512m")
    DOCKER_SANDBOX_NETWORK: str = os.getenv("DOCKER_SANDBOX_NETWORK", "bridge")

    # Tool Registry Database
    REGISTRY_DB_PATH: str = os.getenv("REGISTRY_DB_PATH", "./data/registry.db")

    # FastAPI Backend
    APP_NAME: str = os.getenv("APP_NAME", "Self-Forging AI Agent")
    APP_VERSION: str = os.getenv("APP_VERSION", "0.1.0")
    BACKEND_HOST: str = os.getenv("BACKEND_HOST", "0.0.0.0")
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))
    
    # Parse comma-separated CORS origins
    _cors_str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    CORS_ORIGINS: list[str] = [x.strip() for x in _cors_str.split(",") if x.strip()]

    # Forge settings
    MAX_REPAIR_RETRIES: int = int(os.getenv("MAX_REPAIR_RETRIES", "3"))
    MAX_ADVERSARIAL_TESTS: int = int(os.getenv("MAX_ADVERSARIAL_TESTS", "5"))

    @classmethod
    def validate(cls) -> list[str]:
        """Check for missing critical configuration. Returns list of warnings."""
        warnings = []
        if not cls.OMNIROUTE_API_KEY:
            warnings.append("OMNIROUTE_API_KEY is not set. LLM calls will fail.")
        if not cls.OMNIROUTE_BASE_URL:
            warnings.append("OMNIROUTE_BASE_URL is not set.")
        return warnings


config = Config()
