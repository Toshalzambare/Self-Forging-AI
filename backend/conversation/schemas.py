"""
Pydantic schemas for Conversation and Message payloads.
"""
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=100000)
    role: str = Field(default="user")
    forge_data: Optional[Dict[str, Any]] = None


class ChatStreamRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=100000)
    model: Optional[str] = None


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    forge_data: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None


class ConversationCreate(BaseModel):
    title: Optional[str] = Field(default="New Conversation", max_length=255)


class ConversationUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    is_pinned: Optional[bool] = None


class ConversationSummary(BaseModel):
    id: str
    user_id: str
    title: str
    is_pinned: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    message_count: int = 0
    last_message_preview: Optional[str] = None


class ConversationDetail(BaseModel):
    id: str
    user_id: str
    title: str
    is_pinned: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    messages: List[MessageResponse] = []
