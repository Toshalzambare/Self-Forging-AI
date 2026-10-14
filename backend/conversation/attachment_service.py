"""
Conversation Attachment Service.
Handles PostgreSQL persistence, listing, and cascade operations for conversation document attachments.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from registry.models import ConversationAttachment, Conversation


class AttachmentService:
    """Service layer for document attachment database operations."""

    @staticmethod
    def _is_valid_uuid(val: str) -> bool:
        try:
            uuid.UUID(str(val))
            return True
        except (ValueError, AttributeError, TypeError):
            return False

    @staticmethod
    async def add_attachment(
        db: AsyncSession,
        conversation_id: str,
        user_id: str,
        filename: str,
        content_type: str,
        size_bytes: int,
        s3_key: str,
        extracted_text: Optional[str] = None,
    ) -> Optional[ConversationAttachment]:
        """Validate conversation ownership and insert attachment record."""
        if not AttachmentService._is_valid_uuid(conversation_id) or not AttachmentService._is_valid_uuid(user_id):
            return None

        # Verify conversation belongs to user
        stmt = select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
        )
        res = await db.execute(stmt)
        conv = res.scalar_one_or_none()
        if not conv:
            return None

        attachment = ConversationAttachment(
            id=str(uuid.uuid4()),
            conversation_id=conversation_id,
            user_id=user_id,
            filename=filename,
            content_type=content_type,
            size_bytes=size_bytes,
            s3_key=s3_key,
            extracted_text=extracted_text,
            created_at=datetime.now(timezone.utc),
        )
        db.add(attachment)
        await db.flush()
        return attachment

    @staticmethod
    async def list_attachments(
        db: AsyncSession,
        conversation_id: str,
        user_id: str,
    ) -> List[ConversationAttachment]:
        """List all attachments for a specific conversation belonging to the user."""
        if not AttachmentService._is_valid_uuid(conversation_id) or not AttachmentService._is_valid_uuid(user_id):
            return []

        stmt = (
            select(ConversationAttachment)
            .where(
                ConversationAttachment.conversation_id == conversation_id,
                ConversationAttachment.user_id == user_id,
            )
            .order_by(ConversationAttachment.created_at.asc())
        )
        res = await db.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def get_attachment(
        db: AsyncSession,
        attachment_id: str,
        user_id: str,
    ) -> Optional[ConversationAttachment]:
        """Fetch single attachment record enforcing user tenant isolation."""
        if not AttachmentService._is_valid_uuid(attachment_id) or not AttachmentService._is_valid_uuid(user_id):
            return None

        stmt = select(ConversationAttachment).where(
            ConversationAttachment.id == attachment_id,
            ConversationAttachment.user_id == user_id,
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def delete_attachment(
        db: AsyncSession,
        attachment_id: str,
        user_id: str,
    ) -> Optional[ConversationAttachment]:
        """Remove attachment record from database if user is owner."""
        attachment = await AttachmentService.get_attachment(db, attachment_id, user_id)
        if not attachment:
            return None

        await db.delete(attachment)
        await db.flush()
        return attachment
