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
    LLM_REQUEST_TIMEOUT: int = int(os.getenv("LLM_REQUEST_TIMEOUT", "60"))
    LLM_MAX_RETRIES: int = int(os.getenv("LLM_MAX_RETRIES", "3"))

    # Autonomous Web Research & Documentation Retrieval
    SEARCH_PROVIDER: str = os.getenv("SEARCH_PROVIDER", "duckduckgo")
    SEARCH_MAX_RESULTS: int = int(os.getenv("SEARCH_MAX_RESULTS", "3"))
    SEARCH_TIMEOUT_SECONDS: int = int(os.getenv("SEARCH_TIMEOUT_SECONDS", "10"))
    SEARCH_USER_AGENT: str = os.getenv(
        "SEARCH_USER_AGENT",
        "SelfForgingAI/1.0 (Autonomous Documentation Research; +https://github.com/Toshalzambare/Self-Forging-AI)"
    )

    # Novel Hybrid Tool Search Algorithm Weights & Thresholds
    HYBRID_SEARCH_THRESHOLD: float = float(os.getenv("HYBRID_SEARCH_THRESHOLD", "0.65"))
    HYBRID_WEIGHT_INTENT: float = float(os.getenv("HYBRID_WEIGHT_INTENT", "0.50"))
    HYBRID_WEIGHT_STRUCT: float = float(os.getenv("HYBRID_WEIGHT_STRUCT", "0.35"))
    HYBRID_WEIGHT_PERF: float = float(os.getenv("HYBRID_WEIGHT_PERF", "0.15"))

    # Docker Sandbox
    DOCKER_SANDBOX_IMAGE: str = os.getenv("DOCKER_SANDBOX_IMAGE", "sfa-sandbox:latest")
    DOCKER_SANDBOX_TIMEOUT: int = int(os.getenv("DOCKER_SANDBOX_TIMEOUT", "60"))
    DOCKER_SANDBOX_MEMORY_LIMIT: str = os.getenv("DOCKER_SANDBOX_MEMORY_LIMIT", "512m")
    DOCKER_SANDBOX_NETWORK: str = os.getenv("DOCKER_SANDBOX_NETWORK", "bridge")

    # PostgreSQL 16
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "sfa_db")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "sfa_user")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "changeme")
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT: int = int(os.getenv("POSTGRES_PORT", "5432"))
    POSTGRES_URL: str = os.getenv(
        "POSTGRES_URL",
        "postgresql+asyncpg://sfa_user:changeme@localhost:5432/sfa_db"
    )

    # MinIO S3 Object Storage
    MINIO_ENDPOINT: str = os.getenv("MINIO_ENDPOINT", "localhost:9000")
    MINIO_ACCESS_KEY: str = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
    MINIO_SECRET_KEY: str = os.getenv("MINIO_SECRET_KEY", "minioadmin123")
    MINIO_BUCKET_TOOLS: str = os.getenv("MINIO_BUCKET_TOOLS", "tool-archives")
    MINIO_BUCKET_DOCS: str = os.getenv("MINIO_BUCKET_DOCS", "user-documents")
    MINIO_USE_SSL: bool = os.getenv("MINIO_USE_SSL", "false").lower() == "true"
    MINIO_PORT: int = int(os.getenv("MINIO_PORT", "9000"))
    MINIO_CONSOLE_PORT: int = int(os.getenv("MINIO_CONSOLE_PORT", "9001"))

    # Legacy Tool Registry Database (SQLite - deprecated)
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

    # LLM Request Timeout
    LLM_REQUEST_TIMEOUT: int = int(os.getenv("LLM_REQUEST_TIMEOUT", "60"))
    LLM_MAX_RETRIES: int = int(os.getenv("LLM_MAX_RETRIES", "2"))

    # JWT & Session Security
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "sfa_jwt_dev_secret_change_in_production_key_128bit")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "7"))

    # Google OAuth 2.0
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    ALLOW_MOCK_GOOGLE_AUTH: bool = os.getenv("ALLOW_MOCK_GOOGLE_AUTH", "false").lower() == "true"
    _mock_domains_str: str = os.getenv("MOCK_GOOGLE_DOMAINS", "@example.test,@example.com,@test.local")
    MOCK_GOOGLE_DOMAINS: tuple[str, ...] = tuple(x.strip() for x in _mock_domains_str.split(",") if x.strip())

    # Trusted Proxies for client IP extraction
    _trusted_proxies_str: str = os.getenv("TRUSTED_PROXIES", "127.0.0.1,::1,localhost")
    TRUSTED_PROXIES: set[str] = {x.strip() for x in _trusted_proxies_str.split(",") if x.strip()}

    @classmethod
    def validate(cls) -> list[str]:
        """Check for missing critical configuration. Returns list of warnings."""
        warnings = []
        if not cls.OMNIROUTE_API_KEY:
            warnings.append("OMNIROUTE_API_KEY is not set. LLM calls will fail.")
        if not cls.OMNIROUTE_BASE_URL:
            warnings.append("OMNIROUTE_BASE_URL is not set.")
        if not cls.POSTGRES_URL or "changeme" in cls.POSTGRES_URL:
            warnings.append("POSTGRES_URL uses default credentials - update before production use.")
        if cls.JWT_SECRET_KEY in (
            "sfa_jwt_dev_secret_change_in_production_key_128bit",
            "generate_a_random_32_char_secret_key_here",
        ) or len(cls.JWT_SECRET_KEY) < 32:
            warnings.append("JWT_SECRET_KEY uses a default or weak value - tokens can be forged.")
        if cls.ALLOW_MOCK_GOOGLE_AUTH:
            warnings.append("ALLOW_MOCK_GOOGLE_AUTH is enabled. Never enable it in production.")
        return warnings


config = Config()
