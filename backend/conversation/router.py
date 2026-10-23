"""
Conversation API router: Endpoints for listing, creating, retrieving,
updating, and deleting persistent multi-tenant chat conversations.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from registry.database import get_db_session
from registry.models import User
from auth.dependencies import get_current_user
from conversation.schemas import (
    ConversationCreate,
    ConversationUpdate,
    ConversationSummary,
    ConversationDetail,
    MessageResponse,
    ChatStreamRequest,
)
from conversation.service import ConversationService
from conversation.stream_service import stream_conversation_events

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.get("", response_model=dict)
async def list_conversations(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """List all conversations for the authenticated user."""
    conversations = await ConversationService.list_conversations(
        db,
        user_id=str(current_user.id),
        limit=limit,
        offset=offset,
    )
    return {"conversations": conversations}


@router.post("", response_model=ConversationDetail, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    req: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Create a new conversation for the authenticated user."""
    conv = await ConversationService.create_conversation(
        db,
        user_id=str(current_user.id),
        title=req.title or "New Conversation",
    )
    return ConversationDetail(
        id=str(conv.id),
        user_id=str(conv.user_id),
        title=conv.title,
        is_pinned=conv.is_pinned,
        created_at=conv.created_at.isoformat() if conv.created_at else None,
        updated_at=conv.updated_at.isoformat() if conv.updated_at else None,
        messages=[],
    )


@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Retrieve a conversation and all its messages, enforcing tenant isolation."""
    conv = await ConversationService.get_conversation(
        db,
        conversation_id=conversation_id,
        user_id=str(current_user.id),
    )
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied.",
        )

    formatted_messages = [
        MessageResponse(
            id=str(m.id),
            conversation_id=str(m.conversation_id),
            role=m.role,
            content=m.content,
            forge_data=m.forge_data,
            created_at=m.created_at.isoformat() if m.created_at else None,
        )
        for m in (conv.messages or [])
    ]

    return ConversationDetail(
        id=str(conv.id),
        user_id=str(conv.user_id),
        title=conv.title,
        is_pinned=conv.is_pinned,
        created_at=conv.created_at.isoformat() if conv.created_at else None,
        updated_at=conv.updated_at.isoformat() if conv.updated_at else None,
        messages=formatted_messages,
    )


@router.patch("/{conversation_id}", response_model=ConversationDetail)
async def update_conversation(
    conversation_id: str,
    req: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Update title or pinned status for a conversation."""
    conv = await ConversationService.update_conversation(
        db,
        conversation_id=conversation_id,
        user_id=str(current_user.id),
        title=req.title,
        is_pinned=req.is_pinned,
    )
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied.",
        )

    return ConversationDetail(
        id=str(conv.id),
        user_id=str(conv.user_id),
        title=conv.title,
        is_pinned=conv.is_pinned,
        created_at=conv.created_at.isoformat() if conv.created_at else None,
        updated_at=conv.updated_at.isoformat() if conv.updated_at else None,
        messages=[],
    )


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Delete a conversation and all its messages."""
    deleted = await ConversationService.delete_conversation(
        db,
        conversation_id=conversation_id,
        user_id=str(current_user.id),
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied.",
        )
    return None


@router.post("/{conversation_id}/stream")
async def stream_conversation_message(
    conversation_id: str,
    req: ChatStreamRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Stream agent conversation lifecycle events and word-by-word token chunks
    via Server-Sent Events (SSE).
    """
    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
        "Content-Type": "text/event-stream",
    }
    return StreamingResponse(
        stream_conversation_events(
            conversation_id=conversation_id,
            user_prompt=req.message,
            user_id=str(current_user.id),
            model=req.model,
        ),
        headers=headers,
        media_type="text/event-stream",
    )
