"""
Authentication and session management package.
"""
from auth.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    generate_refresh_token,
    hash_refresh_token,
)
from auth.dependencies import get_current_user, get_optional_current_user
from auth.google import verify_google_credential
from auth.router import router as auth_router

__all__ = [
    "hash_password",
    "verify_password",
    "create_access_token",
    "decode_access_token",
    "generate_refresh_token",
    "hash_refresh_token",
    "get_current_user",
    "get_optional_current_user",
    "verify_google_credential",
    "auth_router",
]
