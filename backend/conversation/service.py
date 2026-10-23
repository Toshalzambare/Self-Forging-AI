"""
ConversationService: Encapsulates database queries and business logic
for persistent chat sessions and multi-tenant message isolation.
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import select, desc, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from registry.models import Conversation, Message

logger = logging.getLogger(__name__)


class ConversationService:
    """Service layer for conversation and message persistence."""

    @staticmethod
    async def create_conversation(
        db: AsyncSession,
        user_id: str,
        title: str = "New Conversation",
    ) -> Conversation:
        """Create a new conversation belonging to the specified user."""
        conversation = Conversation(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=title.strip() if title else "New Conversation",
            is_pinned=False,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(conversation)
        await db.flush()
        return conversation

    @staticmethod
    def _is_valid_uuid(val: Any) -> bool:
        """Check if a value is a valid UUID string to prevent asyncpg DataError."""
        try:
            uuid.UUID(str(val))
            return True
        except (ValueError, AttributeError, TypeError):
            return False

    @staticmethod
    async def get_conversation(
        db: AsyncSession,
        conversation_id: str,
        user_id: str,
    ) -> Optional[Conversation]:
        """Fetch a conversation and its messages, enforcing tenant isolation."""
        if not ConversationService._is_valid_uuid(conversation_id) or not ConversationService._is_valid_uuid(user_id):
            return None

        stmt = (
            select(Conversation)
            .options(selectinload(Conversation.messages))
            .where(
                Conversation.id == conversation_id,
                Conversation.user_id == user_id,
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def list_conversations(
        db: AsyncSession,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        List all conversations for a user, sorted by pinned status then updated_at descending.
        Includes message count and preview of the last message.
        """
        msg_count_subq = (
            select(func.count(Message.id))
            .where(Message.conversation_id == Conversation.id)
            .scalar_subquery()
        )
        latest_msg_subq = (
            select(func.substr(Message.content, 1, 60))
            .where(Message.conversation_id == Conversation.id)
            .order_by(Message.created_at.desc())
            .limit(1)
            .scalar_subquery()
        )

        safe_limit = max(1, min(limit, 100))
        stmt = (
            select(Conversation, msg_count_subq.label("msg_count"), latest_msg_subq.label("last_preview"))
            .where(Conversation.user_id == user_id)
            .order_by(Conversation.is_pinned.desc(), Conversation.updated_at.desc())
            .limit(safe_limit)
            .offset(max(0, offset))
        )
        result = await db.execute(stmt)
        rows = result.all()

        summaries = []
        for conv, msg_count, last_preview in rows:
            summaries.append({
                "id": str(conv.id),
                "user_id": str(conv.user_id),
                "title": conv.title,
                "is_pinned": conv.is_pinned,
                "created_at": conv.created_at.isoformat() if conv.created_at else None,
                "updated_at": conv.updated_at.isoformat() if conv.updated_at else None,
                "message_count": msg_count or 0,
                "last_message_preview": last_preview,
            })
        return summaries

    @staticmethod
    async def update_conversation(
        db: AsyncSession,
        conversation_id: str,
        user_id: str,
        title: Optional[str] = None,
        is_pinned: Optional[bool] = None,
    ) -> Optional[Conversation]:
        """Update conversation title or pinned status."""
        if not ConversationService._is_valid_uuid(conversation_id) or not ConversationService._is_valid_uuid(user_id):
            return None

        stmt = select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
        )
        result = await db.execute(stmt)
        conversation = result.scalar_one_or_none()
        if not conversation:
            return None

        if title is not None:
            conversation.title = title.strip()[:255]
        if is_pinned is not None:
            conversation.is_pinned = is_pinned

        conversation.updated_at = datetime.now(timezone.utc)
        await db.flush()
        return conversation

    @staticmethod
    async def delete_conversation(
        db: AsyncSession,
        conversation_id: str,
        user_id: str,
    ) -> bool:
        """Delete a conversation and all its cascaded messages."""
        if not ConversationService._is_valid_uuid(conversation_id) or not ConversationService._is_valid_uuid(user_id):
            return False

        stmt = select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
        )
        result = await db.execute(stmt)
        conversation = result.scalar_one_or_none()
        if not conversation:
            return False

        # CodeRabbit Finding 20: Collect and cleanup S3 objects for deleted attachments
        import asyncio
        from config import config
        from registry.models import ConversationAttachment
        from storage.service import delete_file

        stmt_att = select(ConversationAttachment.s3_key).where(
            ConversationAttachment.conversation_id == conversation_id
        )
        res_att = await db.execute(stmt_att)
        s3_keys = [r[0] for r in res_att.fetchall() if r[0]]

        await db.delete(conversation)
        await db.commit()

        for key in s3_keys:
            try:
                await asyncio.to_thread(delete_file, config.MINIO_BUCKET_DOCS, key)
            except Exception as exc:
                logger.warning(f"Non-fatal: failed to delete S3 attachment {key}: {exc}")
        return True

    @staticmethod
    async def add_message(
        db: AsyncSession,
        conversation_id: str,
        role: str,
        content: str,
        forge_data: Optional[Dict[str, Any]] = None,
    ) -> Message:
        """Add a message to a conversation and update conversation updated_at timestamp."""
        now = datetime.now(timezone.utc)
        message = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation_id,
            role=role,
            content=content,
            forge_data=forge_data,
            created_at=now,
        )
        db.add(message)

        # Update conversation updated_at
        stmt = select(Conversation).where(Conversation.id == conversation_id)
        res = await db.execute(stmt)
        conv = res.scalar_one_or_none()
        if conv:
            conv.updated_at = now
            # If default title, auto-infer title from first user message
            if conv.title == "New Conversation" and role == "user":
                inferred = content.strip().split("\n")[0][:40]
                if inferred:
                    conv.title = inferred

        await db.flush()
        return message

    @staticmethod
    async def get_or_create_conversation(
        db: AsyncSession,
        user_id: str,
        conversation_id: Optional[str] = None,
        initial_prompt: str = "",
    ) -> Conversation:
        """Fetch existing conversation or create a new one with auto-inferred title."""
        if conversation_id:
            conv = await ConversationService.get_conversation(db, conversation_id, user_id)
            if conv:
                return conv

        # Generate title from prompt if provided
        title = "New Conversation"
        if initial_prompt:
            first_line = initial_prompt.strip().split("\n")[0][:40]
            if first_line:
                title = first_line

        return await ConversationService.create_conversation(db, user_id, title=title)
