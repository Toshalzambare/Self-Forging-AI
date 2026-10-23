"""
Session management & token rotation router.
Handles token refresh with atomic rotation, replay detection, grace windows, and session revocation.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from config import config
from registry.database import get_db_session
from registry.repository import RegistryRepository
from registry.models import User
from auth.security import create_access_token, generate_refresh_token
from auth.dependencies import get_current_user, get_optional_current_user
from auth.schemas import (
    RefreshRequest,
    RefreshResponse,
    LogoutRequest,
    SessionInfo,
)

router = APIRouter()


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_tokens(
    req: RefreshRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Rotate tokens atomically: consumes old refresh token, generates a new pair.
    Includes replay attack detection with a 15-second grace window to handle concurrent browser tabs.
    """
    session = await RegistryRepository.get_session_by_token(db, req.refresh_token)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token.",
        )

    now = datetime.now(timezone.utc)

    # Replay attack detection with concurrent request grace window
    if session.is_revoked:
        last_used = session.last_used_at
        if last_used and last_used.tzinfo is None:
            last_used = last_used.replace(tzinfo=timezone.utc)

        grace_window_seconds = 15
        if last_used and (now - last_used).total_seconds() <= grace_window_seconds:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token recently rotated by concurrent request. Please retry with latest token.",
            )

        # Outside the grace window: treat as malicious replay attack
        await RegistryRepository.revoke_all_user_sessions(db, session.user_id)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Security violation: Revoked token reuse detected. All active sessions have been terminated. Please log in again.",
        )

    # Check expiration
    expires_at = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired. Please log in again.",
        )

    user = await RegistryRepository.get_user_by_id(db, session.user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive or not found.",
        )

    # Atomic token rotation: atomically revokes old session and generates successor
    new_refresh = generate_refresh_token()
    new_session = await RegistryRepository.rotate_session(
        db,
        old_session=session,
        new_refresh_token=new_refresh,
        expires_in_days=config.JWT_REFRESH_TOKEN_EXPIRE_DAYS,
    )
    if not new_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token recently rotated by concurrent request. Please retry with latest token.",
        )

    await db.commit()
    new_access = create_access_token(str(user.id), user.email)
    return RefreshResponse(token=new_access, refresh_token=new_refresh)


@router.post("/logout")
async def logout(
    req: LogoutRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Revoke the provided refresh token session in the database."""
    if req.refresh_token:
        session = await RegistryRepository.get_session_by_token(db, req.refresh_token)
        if session:
            if current_user and str(session.user_id) != str(current_user.id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot revoke a session belonging to another user.",
                )
            await RegistryRepository.revoke_session(db, req.refresh_token)
            await db.commit()

    return {"message": "Logged out successfully."}


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


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_session_by_id(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Revoke a specific session belonging to the authenticated user."""
    sessions = await RegistryRepository.list_user_sessions(db, str(current_user.id))
    matched = next((s for s in sessions if str(s.id) == session_id), None)
    if not matched:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or already revoked.",
        )
    matched.is_revoked = True
    await db.flush()
    await db.commit()
    return None


@router.delete("/sessions", status_code=status.HTTP_200_OK)
async def revoke_all_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Revoke all active sessions for the authenticated user."""
    count = await RegistryRepository.revoke_all_user_sessions(db, str(current_user.id))
    await db.commit()
    return {"message": f"Successfully revoked {count} active sessions."}
