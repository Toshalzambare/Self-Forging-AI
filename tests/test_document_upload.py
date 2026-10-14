"""
Automated Test Suite for Document Upload, S3 Storage & Text Extraction Pipeline.
Tests PDF & text extraction, MinIO persistence, PostgreSQL attachment metadata,
multi-tenant isolation, and cascade deletion.
"""

import io
import uuid
import os
import sys
import pytest

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from pypdf import PdfWriter
from httpx import AsyncClient, ASGITransport

from main import app
from registry import get_db, User
from registry.models import Conversation, ConversationAttachment
from auth.security import create_access_token, hash_password
from storage.extractor import extract_text_from_document, extract_text_from_pdf
from conversation.service import ConversationService


async def _create_test_user(identifier: str) -> tuple[User, str]:
    """Helper creating test user in PostgreSQL and returning (User, access_token)."""
    uid = uuid.uuid4().hex[:6]
    async with get_db() as db:
        user = User(
            email=f"{identifier}_{uid}@example.com",
            username=f"{identifier}_{uid}",
            password_hash=hash_password("DocPass123!"),
            is_active=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    token = create_access_token(user_id=str(user.id), email=user.email)
    return user, token


def test_extractor_text_formats():
    """Verify text extractor handles markdown, csv, json, and plaintext."""
    # Plain text
    txt_content = b"Financial report quarterly metrics:\nRevenue: $1.2M\nGrowth: 15%"
    extracted = extract_text_from_document("report.txt", txt_content, "text/plain")
    assert "Revenue: $1.2M" in extracted

    # Markdown
    md_content = b"# Architecture Overview\n\n- Node 1: Worker\n- Node 2: Sandbox"
    extracted_md = extract_text_from_document("arch.md", md_content, "text/markdown")
    assert "Architecture Overview" in extracted_md
    assert "Node 1: Worker" in extracted_md

    # JSON formatted
    json_content = b'{"status": "ok", "items": [1, 2, 3]}'
    extracted_json = extract_text_from_document("data.json", json_content, "application/json")
    assert '"status": "ok"' in extracted_json


def test_extractor_pdf():
    """Verify PDF extractor parses pages using pypdf."""
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    buf = io.BytesIO()
    writer.write(buf)
    pdf_bytes = buf.getvalue()

    extracted = extract_text_from_pdf(pdf_bytes)
    # Blank PDF page returns notice or empty text without raising exception
    assert isinstance(extracted, str)
    assert len(extracted) > 0


@pytest.mark.asyncio
async def test_upload_attachment_unauthorized():
    """Verify uploading without auth token returns 401."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        fake_conv_id = str(uuid.uuid4())
        files = {"file": ("test.txt", b"Hello", "text/plain")}
        res = await ac.post(f"/api/conversations/{fake_conv_id}/attachments", files=files)
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_upload_attachment_success_and_list():
    """Verify authenticated user can upload document and retrieve attachment list."""
    user, token = await _create_test_user("doc_uploader")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create conversation
    async with get_db() as db:
        conv = await ConversationService.create_conversation(db, user_id=str(user.id), title="Doc Test Conv")
        await db.commit()
        conv_id = str(conv.id)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 2. Upload text attachment
        file_payload = b"Quarterly Tool Metrics: Success Rate 98.5% over 150 runs."
        files = {"file": ("metrics.txt", file_payload, "text/plain")}
        res = await ac.post(
            f"/api/conversations/{conv_id}/attachments",
            files=files,
            headers=headers,
        )
        assert res.status_code == 201, res.text
        data = res.json()["attachment"]
        assert data["filename"] == "metrics.txt"
        assert data["conversation_id"] == conv_id
        assert "Quarterly Tool Metrics" in data["extracted_text_preview"]
        attachment_id = data["id"]

        # 3. List attachments for conversation
        list_res = await ac.get(f"/api/conversations/{conv_id}/attachments", headers=headers)
        assert list_res.status_code == 200
        attachments = list_res.json()["attachments"]
        assert len(attachments) == 1
        assert attachments[0]["id"] == attachment_id
        assert attachments[0]["filename"] == "metrics.txt"

        # 4. Delete attachment
        del_res = await ac.delete(
            f"/api/conversations/{conv_id}/attachments/{attachment_id}",
            headers=headers,
        )
        assert del_res.status_code == 204

        # 5. Verify deleted from list
        list_after = await ac.get(f"/api/conversations/{conv_id}/attachments", headers=headers)
        assert list_after.status_code == 200
        assert len(list_after.json()["attachments"]) == 0


@pytest.mark.asyncio
async def test_attachment_multi_tenant_isolation():
    """Verify User B cannot access or list User A's attachments."""
    user_a, token_a = await _create_test_user("user_a_docs")
    user_b, token_b = await _create_test_user("user_b_docs")

    async with get_db() as db:
        conv_a = await ConversationService.create_conversation(db, user_id=str(user_a.id), title="Conv A")
        await db.commit()
        conv_a_id = str(conv_a.id)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # User A uploads doc
        files = {"file": ("secret_spec.txt", b"Confidential Algorithm Spec", "text/plain")}
        res_a = await ac.post(
            f"/api/conversations/{conv_a_id}/attachments",
            files=files,
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res_a.status_code == 201

        # User B attempts to upload into User A's conversation -> 404
        res_b_upload = await ac.post(
            f"/api/conversations/{conv_a_id}/attachments",
            files={"file": ("injected.txt", b"Hack", "text/plain")},
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert res_b_upload.status_code == 404

        # User B attempts to list User A's conversation attachments -> returns empty list
        res_b_list = await ac.get(
            f"/api/conversations/{conv_a_id}/attachments",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert res_b_list.status_code == 200
        assert len(res_b_list.json()["attachments"]) == 0


@pytest.mark.asyncio
async def test_cascade_delete_conversation_removes_attachments():
    """Verify deleting conversation cascades and deletes all attachments in DB."""
    user, token = await _create_test_user("cascade_user")
    headers = {"Authorization": f"Bearer {token}"}

    async with get_db() as db:
        conv = await ConversationService.create_conversation(db, user_id=str(user.id), title="Cascade Conv")
        await db.commit()
        conv_id = str(conv.id)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Upload attachment
        files = {"file": ("data.csv", b"id,val\n1,100", "text/csv")}
        up_res = await ac.post(f"/api/conversations/{conv_id}/attachments", files=files, headers=headers)
        assert up_res.status_code == 201
        att_id = up_res.json()["attachment"]["id"]

        # Delete conversation
        del_conv = await ac.delete(f"/api/conversations/{conv_id}", headers=headers)
        assert del_conv.status_code == 204

    # Verify attachment record was cascade deleted
    async with get_db() as db:
        stmt = ConversationAttachment.__table__.select().where(ConversationAttachment.id == att_id)
        res = await db.execute(stmt)
        assert res.scalar_one_or_none() is None
