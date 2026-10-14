"""
Authentication router: Signup, Login, Google OAuth, Refresh (with rotation & replay detection), Logout, Profile, and Sessions.
"""
import os
import sys
import uuid
import re
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import config
from registry.database import get_db_session
from registry.repository import RegistryRepository
from registry.models import User, UserSession
from auth.security import (
    hash_password,
    verify_password,
    create_access_token,
    generate_refresh_token,
)
from auth.google import verify_google_credential
from auth.dependencies import get_current_user, get_optional_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ============================================================
# Request / Response Schemas
# ============================================================

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


# ============================================================
# Helpers
# ============================================================

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
    # Forwarded header support
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    return user_agent, client_ip


# ============================================================
# Endpoints
# ============================================================

@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    req: SignupRequest,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
):
    """Register a new user with email, username, and password."""
    # Basic email format check
    email_clean = req.email.strip().lower()
    if not re.match(r"^[^@]+@[^@]+\.[^@]+$", email_clean):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format.",
        )

    # Username character check (alphanumeric + underscore/hyphen)
    username_clean = req.username.strip()
    if not re.match(r"^[a-zA-Z0-9_\-]+$", username_clean):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username may only contain letters, numbers, underscores, and hyphens.",
        )

    # Check email collision
    existing_email = await RegistryRepository.get_user_by_email(db, email_clean)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    # Check username collision
    existing_username = await RegistryRepository.get_user_by_username(db, username_clean)
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This username is already taken.",
        )

    pwd_hash = hash_password(req.password)
    user = await RegistryRepository.create_user(
        db,
        email=email_clean,
        username=username_clean,
        password_hash=pwd_hash,
        auth_provider="local",
    )

    access_token = create_access_token(str(user.id), user.email)
    refresh_token = generate_refresh_token()
    user_agent, ip_address = extract_client_info(request)

    await RegistryRepository.create_session(
        db,
        user_id=str(user.id),
        refresh_token=refresh_token,
        user_agent=user_agent,
        ip_address=ip_address,
        expires_in_days=config.JWT_REFRESH_TOKEN_EXPIRE_DAYS,
    )

    return AuthResponse(
        token=access_token,
        refresh_token=refresh_token,
        user=format_user_profile(user),
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    req: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
):
    """Authenticate with email or username and password."""
    user = await RegistryRepository.get_user_by_login(db, req.login)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/username or password.",
        )

    if not user.password_hash or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/username or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact system administrator.",
        )

    access_token = create_access_token(str(user.id), user.email)
    refresh_token = generate_refresh_token()
    user_agent, ip_address = extract_client_info(request)

    await RegistryRepository.create_session(
        db,
        user_id=str(user.id),
        refresh_token=refresh_token,
        user_agent=user_agent,
        ip_address=ip_address,
        expires_in_days=config.JWT_REFRESH_TOKEN_EXPIRE_DAYS,
    )

    return AuthResponse(
        token=access_token,
        refresh_token=refresh_token,
        user=format_user_profile(user),
    )


@router.post("/google", response_model=AuthResponse)
async def google_auth(
    req: GoogleAuthRequest,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Authenticate via Google Identity Services ID token.
    Provisions a new user or links to an existing account.
    """
    id_info = verify_google_credential(req.credential)
    if not id_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Google credential.",
        )

    email = id_info.get("email", "").strip().lower()
    google_id = id_info.get("sub")
    if not email or not google_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google profile is missing required email or subject ID.",
        )

    name = id_info.get("name") or email.split("@")[0]
    picture = id_info.get("picture")

    # 1. Lookup by Google ID
    user = await RegistryRepository.get_user_by_google_id(db, google_id)

    # 2. If not found by google_id, check if existing account matches email
    if not user:
        user = await RegistryRepository.get_user_by_email(db, email)
        if user:
            # Link google account to existing local account
            user = await RegistryRepository.link_google_account(
                db, user, google_id=google_id, avatar_url=picture
            )

    # 3. If still not found, provision brand new user
    if not user:
        # Generate safe unique username
        base_username = re.sub(r"[^a-zA-Z0-9_\-]", "", name.replace(" ", "_")).lower()
        if not base_username:
            base_username = email.split("@")[0][:20]
        
        candidate_username = base_username
        suffix_counter = 1
        while await RegistryRepository.get_user_by_username(db, candidate_username):
            candidate_username = f"{base_username}_{suffix_counter}"
            suffix_counter += 1

        user = await RegistryRepository.create_user(
            db,
            email=email,
            username=candidate_username,
            password_hash=None,
            auth_provider="google",
            google_id=google_id,
            avatar_url=picture,
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated.",
        )

    access_token = create_access_token(str(user.id), user.email)
    refresh_token = generate_refresh_token()
    user_agent, ip_address = extract_client_info(request)

    await RegistryRepository.create_session(
        db,
        user_id=str(user.id),
        refresh_token=refresh_token,
        user_agent=user_agent,
        ip_address=ip_address,
        expires_in_days=config.JWT_REFRESH_TOKEN_EXPIRE_DAYS,
    )

    return AuthResponse(
        token=access_token,
        refresh_token=refresh_token,
        user=format_user_profile(user),
    )


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_tokens(
    req: RefreshRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Rotate tokens: consumes old refresh token, generates a new pair.
    Includes replay attack detection: if a revoked token is presented, all sessions
    for that user are immediately invalidated for account safety.
    """
    session = await RegistryRepository.get_session_by_token(db, req.refresh_token)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token.",
        )

    # Replay attack detection: token was already revoked!
    if session.is_revoked:
        await RegistryRepository.revoke_all_user_sessions(db, session.user_id)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Security violation: Revoked token reuse detected. All active sessions have been terminated. Please log in again.",
        )

    # Check expiration
    now = datetime.now(timezone.utc)
    # Ensure session.expires_at is timezone-aware
    expires_at = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired. Please log in again.",
        )

    # Fetch user
    user = await RegistryRepository.get_user_by_id(db, session.user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive or not found.",
        )

    # Token rotation: invalidate old session, generate new refresh token and session
    new_refresh = generate_refresh_token()
    await RegistryRepository.rotate_session(
        db,
        old_session=session,
        new_refresh_token=new_refresh,
        expires_in_days=config.JWT_REFRESH_TOKEN_EXPIRE_DAYS,
    )

    new_access = create_access_token(str(user.id), user.email)
    return RefreshResponse(
        token=new_access,
        refresh_token=new_refresh,
    )


@router.post("/logout")
async def logout(
    req: LogoutRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Revoke the provided refresh token session in the database.
    """
    if req.refresh_token:
        await RegistryRepository.revoke_session(db, req.refresh_token)

    return {"message": "Logged out successfully."}


@router.get("/me", response_model=UserProfile)
async def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve the currently authenticated user's profile."""
    return format_user_profile(current_user)


@router.get("/sessions", response_model=List[SessionInfo])
async def list_active_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """List all active, unrevoked sessions for the current user."""
    sessions = await RegistryRepository.list_user_sessions(db, str(current_user.id))
    return [
        SessionInfo(
            id=str(s.id),
            user_agent=s.user_agent,
            ip_address=s.ip_address,
            created_at=s.created_at.isoformat() if s.created_at else None,
            last_used_at=s.last_used_at.isoformat() if s.last_used_at else None,
            expires_at=s.expires_at.isoformat() if s.expires_at else None,
        )
        for s in sessions
    ]
