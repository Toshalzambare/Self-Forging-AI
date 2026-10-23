"""
Authentication schemas and request/response models.
"""
import os
import sys
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import Request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import config
from registry.models import User


class SignupRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    login: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)


class GoogleAuthRequest(BaseModel):
    credential: str = Field(..., min_length=1)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., min_length=1)


class LogoutRequest(BaseModel):
    refresh_token: Optional[str] = None


class UserProfile(BaseModel):
    id: str
    email: str
    username: str
    auth_provider: str
    avatar_url: Optional[str] = None
    created_at: Optional[str] = None


class AuthResponse(BaseModel):
    token: str
    refresh_token: str
    user: UserProfile


class RefreshResponse(BaseModel):
    token: str
    refresh_token: str


class SessionInfo(BaseModel):
    id: str
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: Optional[str] = None
    last_used_at: Optional[str] = None
    expires_at: Optional[str] = None


def format_user_profile(user: User) -> UserProfile:
    return UserProfile(
        id=str(user.id),
        email=user.email,
        username=user.username,
        auth_provider=user.auth_provider,
        avatar_url=user.avatar_url,
        created_at=user.created_at.isoformat() if user.created_at else None,
    )


def extract_client_info(request: Request) -> tuple[Optional[str], Optional[str]]:
    user_agent = request.headers.get("user-agent")
    client_ip = request.client.host if request.client else None
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for and client_ip in config.TRUSTED_PROXIES:
        client_ip = forwarded_for.split(",")[0].strip()
    return user_agent, client_ip
