"""
FastAPI authentication dependencies for protecting routes and enforcing multi-tenancy.
"""
import os
import sys
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from registry.database import get_db_session
from registry.repository import RegistryRepository
from registry.models import User
from auth.security import decode_access_token

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db_session),
) -> User:
    """
    Validates the Bearer JWT access token and returns the authenticated User.
    Raises 401 if missing, invalid, or expired.
    Raises 403 if user account is deactivated.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Bearer token missing.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token: missing user identifier.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await RegistryRepository.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )

    # Invalidate tokens issued before an account takeover recovery / security update
    token_iat = payload.get("iat")
    if token_iat and user.updated_at:
        user_updated_ts = int(user.updated_at.timestamp())
        if token_iat < user_updated_ts:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked due to account security updates.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    return user


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db_session),
) -> Optional[User]:
    """
    Optionally extracts the authenticated User if valid Bearer token is provided.
    Returns None if token is omitted, invalid, or expired without raising 401.
    """
    if not credentials or not credentials.credentials:
        return None

    payload = decode_access_token(credentials.credentials)
    if not payload or not payload.get("sub"):
        return None

    return await RegistryRepository.get_user_by_id(db, payload.get("sub"))
