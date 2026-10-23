"""
Pydantic schemas for the Settings API.
"""
from typing import Optional
import re
from pydantic import BaseModel, Field, field_validator
from config import config

ALLOWED_SANDBOX_IMAGES = {"sfa-sandbox:latest", getattr(config, "DOCKER_SANDBOX_IMAGE", "sfa-sandbox:latest")}
ALLOWED_NETWORK_MODES = {"none", "bridge"}
MAX_SANDBOX_TIMEOUT = max(60, getattr(config, "DOCKER_SANDBOX_TIMEOUT", 60))


class ProviderUpdate(BaseModel):
    api_key: Optional[str] = None
    is_active: Optional[bool] = None


class SandboxUpdate(BaseModel):
    image: Optional[str] = None
    memory_limit: Optional[str] = None
    timeout_seconds: Optional[int] = Field(None, ge=1, le=MAX_SANDBOX_TIMEOUT)
    network_mode: Optional[str] = None

    @field_validator("image")
    @classmethod
    def validate_image(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip() not in ALLOWED_SANDBOX_IMAGES:
            raise ValueError(f"Image '{v}' not allowed. Must be one of {sorted(ALLOWED_SANDBOX_IMAGES)}")
        return v.strip() if v else None

    @field_validator("network_mode")
    @classmethod
    def validate_network_mode(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v.strip().lower() not in ALLOWED_NETWORK_MODES:
            raise ValueError(f"Network mode '{v}' not allowed. Must be one of {sorted(ALLOWED_NETWORK_MODES)}")
        return v.strip().lower() if v else None

    @field_validator("memory_limit")
    @classmethod
    def validate_memory_limit(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            clean = v.strip().lower()
            m = re.match(r"^(\d+)(m|g)$", clean)
            if not m:
                raise ValueError("Memory limit must be formatted as e.g. '256m' or '1g'")
            val, unit = int(m.group(1)), m.group(2)
            mb = val * 1024 if unit == "g" else val
            if mb < 64 or mb > 4096:
                raise ValueError("Memory limit must be between 64m and 4096m")
            return clean
        return None


class McpServerCreate(BaseModel):
    name: str
    url: str


class McpServerTest(BaseModel):
    url: str
