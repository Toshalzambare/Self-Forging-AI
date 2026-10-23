"""
Authentication router: Signup, Login, Google OAuth, and Profile.
Includes session_router for atomic refresh token rotation and session management.
"""
import os
import sys
import re
import asyncio
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import config
from registry.database import get_db_session
from registry.repository import RegistryRepository
from registry.models import User
from auth.security import hash_password, verify_password, create_access_token, generate_refresh_token
from auth.google import verify_google_credential
from auth.dependencies import get_current_user
from auth.schemas import (
    SignupRequest, LoginRequest, GoogleAuthRequest,
    UserProfile, AuthResponse, format_user_profile, extract_client_info,
)
from auth.session_router import router as session_router

router = APIRouter(prefix="/api/auth", tags=["auth"])
router.include_router(session_router)


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    req: SignupRequest,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
):
    """Register a new user with email, username, and password."""
    email_clean = req.email.strip().lower()
    if not re.match(r"^[^@]+@[^@]+\.[^@]+$", email_clean):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format.",
        )

    username_clean = req.username.strip()
    if not re.match(r"^[a-zA-Z0-9_\-]+$", username_clean):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username may only contain letters, numbers, underscores, and hyphens.",
        )

    if await RegistryRepository.get_user_by_email(db, email_clean):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    if await RegistryRepository.get_user_by_username(db, username_clean):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is already taken.",
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
    """Authenticate with username/email and password."""
    login_ident = req.login.strip().lower()

    if "@" in login_ident:
        user = await RegistryRepository.get_user_by_email(db, login_ident)
    else:
        user = await RegistryRepository.get_user_by_username(db, req.login.strip())

    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )

    if not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
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


@router.post("/google", response_model=AuthResponse)
async def google_auth(
    req: GoogleAuthRequest,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
):
    """Verify Google ID token and log in or provision account."""
    id_info = await asyncio.to_thread(verify_google_credential, req.credential)
    if not id_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Google credential.",
        )

    email = id_info.get("email")
    google_id = id_info.get("sub")
    if not email or not google_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google profile is missing required email or subject ID.",
        )

    if id_info.get("email_verified") is not True:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google account email address is not verified.",
        )

    name = id_info.get("name") or email.split("@")[0]
    picture = id_info.get("picture")

    # 1. Lookup by Google ID
    user = await RegistryRepository.get_user_by_google_id(db, google_id)

    # 2. Check existing account by email and link securely
    if not user:
        user = await RegistryRepository.get_user_by_email(db, email)
        if user:
            # Revoke existing sessions and bump updated_at to invalidate prior access JWTs
            user.updated_at = datetime.now(timezone.utc)
            await RegistryRepository.revoke_all_user_sessions(db, str(user.id))
            user = await RegistryRepository.link_google_account(
                db, user, google_id=google_id, avatar_url=picture
            )

    # 3. If still not found, provision brand new user
    if not user:
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


@router.get("/me", response_model=UserProfile)
async def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve the currently authenticated user's profile."""
    return format_user_profile(current_user)
