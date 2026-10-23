"""
Conversation Attachment Router: Endpoints for uploading, listing,
and deleting documents attached to conversation sessions.
"""

import asyncio
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession

from registry.database import get_db_session
from registry.models import User
from auth.dependencies import get_current_user
from conversation.attachment_service import AttachmentService
from conversation.service import ConversationService
from storage.service import upload_document, delete_file
from config import config
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/conversations", tags=["attachments"])

MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def _format_attachment(att) -> dict:
    return {
        "id": str(att.id),
        "conversation_id": str(att.conversation_id),
        "filename": att.filename,
        "content_type": att.content_type,
        "size_bytes": att.size_bytes,
        "s3_key": att.s3_key,
        "extracted_text_preview": (att.extracted_text[:300] + "...") if att.extracted_text and len(att.extracted_text) > 300 else att.extracted_text,
        "created_at": att.created_at.isoformat() if att.created_at else None,
    }


@router.post("/{conversation_id}/attachments", status_code=status.HTTP_201_CREATED)
async def upload_conversation_attachment(
    conversation_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Upload a document to MinIO S3 and associate it with a conversation."""
    filename = (file.filename or "uploaded_document")[:200]
    content_type = (file.content_type or "application/octet-stream")[:100]

    try:
        content = await file.read(MAX_ATTACHMENT_SIZE_BYTES + 1)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed reading uploaded file: {str(exc)}"
        )

    if len(content) > MAX_ATTACHMENT_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {MAX_ATTACHMENT_SIZE_BYTES // (1024 * 1024)}MB."
        )

    user_id_str = str(current_user.id)

    # Verify conversation exists and belongs to current user before proceeding with upload
    conv = await ConversationService.get_conversation(db, conversation_id, user_id=user_id_str)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied."
        )

    # 1. Upload to MinIO S3 and extract text
    try:
        s3_key, extracted_text = await asyncio.to_thread(
            upload_document,
            user_id=user_id_str,
            conversation_id=conversation_id,
            filename=filename,
            data=content,
            content_type=content_type,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Storage upload error: {str(exc)}"
        )

    # 2. Persist in PostgreSQL
    try:
        attachment = await AttachmentService.add_attachment(
            db,
            conversation_id=conversation_id,
            user_id=user_id_str,
            filename=filename,
            content_type=content_type,
            size_bytes=len(content),
            s3_key=s3_key,
            extracted_text=extracted_text,
        )
    except Exception:
        try:
            await asyncio.to_thread(delete_file, config.MINIO_BUCKET_DOCS, s3_key)
        except Exception:
            logger.warning("Failed to clean up orphaned S3 object %s", s3_key)
        raise

    if not attachment:
        # Conversation does not exist or does not belong to user
        try:
            await asyncio.to_thread(delete_file, config.MINIO_BUCKET_DOCS, s3_key)
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied."
        )

    await db.commit()
    return {"attachment": _format_attachment(attachment)}


@router.get("/{conversation_id}/attachments")
async def list_conversation_attachments(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """List all attachments associated with a conversation."""
    attachments = await AttachmentService.list_attachments(
        db,
        conversation_id=conversation_id,
        user_id=str(current_user.id),
    )
    return {"attachments": [_format_attachment(att) for att in attachments]}


@router.delete("/{conversation_id}/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation_attachment(
    conversation_id: str,
    attachment_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    """Delete an attachment from PostgreSQL and MinIO S3."""
    attachment = await AttachmentService.delete_attachment(
        db,
        attachment_id=attachment_id,
        user_id=str(current_user.id),
    )
    if not attachment or str(attachment.conversation_id) != str(conversation_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found or access denied."
        )

    s3_key = attachment.s3_key
    await db.commit()

    # Remove from MinIO S3 only after DB commit succeeds
    if s3_key:
        try:
            await asyncio.to_thread(delete_file, config.MINIO_BUCKET_DOCS, s3_key)
        except Exception as exc:
            logger.warning(f"Non-fatal: failed to delete S3 attachment {s3_key}: {exc}")

    return None
