"""
Conversation & Message Persistence Test Suite:
- Full conversation lifecycle (create, fetch, list, update title, pin, delete cascade)
- Multi-tenant data isolation (User A vs User B)
- Automated conversation provisioning and message persistence via /api/chat
"""
import pytest
import uuid
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from fastapi.testclient import TestClient
from main import app
from registry import get_db
from registry.database import engine
from conversation.service import ConversationService


@pytest.fixture(autouse=True)
async def cleanup_engine():
    yield
    await engine.dispose()


def create_test_user(client: TestClient, prefix: str) -> tuple[dict, dict]:
    uid = uuid.uuid4().hex[:8]
    email = f"{prefix}_{uid}@example.com"
    username = f"{prefix}_{uid}"
    res = client.post("/api/auth/signup", json={
        "email": email,
        "username": username,
        "password": "StrongPassword123!",
    })
    assert res.status_code == 201
    data = res.json()
    headers = {"Authorization": f"Bearer {data['token']}"}
    return data["user"], headers


def test_conversation_lifecycle():
    """Verify conversation creation, listing, updating, and deleting."""
    with TestClient(app) as client:
        user, headers = create_test_user(client, "conv_user")

        # 1. Create conversation
        create_res = client.post(
            "/api/conversations",
            headers=headers,
            json={"title": "Data Analysis Project"}
        )
        assert create_res.status_code == 201
        conv_data = create_res.json()
        conv_id = conv_data["id"]
        assert conv_data["title"] == "Data Analysis Project"
        assert conv_data["is_pinned"] is False
        assert conv_data["user_id"] == user["id"]

        # 2. List conversations
        list_res = client.get("/api/conversations", headers=headers)
        assert list_res.status_code == 200
        conv_list = list_res.json()["conversations"]
        assert len(conv_list) >= 1
        assert any(c["id"] == conv_id for c in conv_list)

        # 3. Update title and pin
        patch_res = client.patch(
            f"/api/conversations/{conv_id}",
            headers=headers,
            json={"title": "Machine Learning Research", "is_pinned": True}
        )
        assert patch_res.status_code == 200
        patched = patch_res.json()
        assert patched["title"] == "Machine Learning Research"
        assert patched["is_pinned"] is True

        # 4. Get detail
        get_res = client.get(f"/api/conversations/{conv_id}", headers=headers)
        assert get_res.status_code == 200
        detail = get_res.json()
        assert detail["id"] == conv_id
        assert detail["title"] == "Machine Learning Research"
        assert detail["is_pinned"] is True

        # 5. Delete conversation
        del_res = client.delete(f"/api/conversations/{conv_id}", headers=headers)
        assert del_res.status_code == 204

        # 6. Verify 404 after deletion
        get_after = client.get(f"/api/conversations/{conv_id}", headers=headers)
        assert get_after.status_code == 404


@pytest.mark.asyncio
async def test_message_persistence_and_ordering():
    """Verify messages persist to PostgreSQL in chronological order with forge_data."""
    with TestClient(app) as client:
        user, headers = create_test_user(client, "msg_user")

        async with get_db() as db:
            conv = await ConversationService.create_conversation(db, user_id=user["id"], title="Coding Session")
            conv_id = str(conv.id)

            # Add user message
            await ConversationService.add_message(
                db,
                conversation_id=conv_id,
                role="user",
                content="Please write a Python script to calculate Fibonacci numbers.",
            )

            # Add assistant reply with forge data
            await ConversationService.add_message(
                db,
                conversation_id=conv_id,
                role="assistant",
                content="Here is the tested Fibonacci generator function.",
                forge_data={
                    "is_tool_forged": True,
                    "forged_tool": {
                        "name": "fibonacci_calc",
                        "code": "def fib(n): return n if n <= 1 else fib(n-1) + fib(n-2)",
                    },
                    "tests_passed": True,
                }
            )

        # Retrieve through REST API
        detail_res = client.get(f"/api/conversations/{conv_id}", headers=headers)
        assert detail_res.status_code == 200
        messages = detail_res.json()["messages"]
        assert len(messages) == 2
        assert messages[0]["role"] == "user"
        assert "Fibonacci" in messages[0]["content"]
        assert messages[1]["role"] == "assistant"
        assert messages[1]["forge_data"]["tests_passed"] is True


def test_conversation_tenant_isolation():
    """Verify complete isolation between User A and User B conversations."""
    with TestClient(app) as client:
        _, headers_a = create_test_user(client, "tenant_a")
        _, headers_b = create_test_user(client, "tenant_b")

        # User A creates a secret conversation
        conv_a_res = client.post(
            "/api/conversations",
            headers=headers_a,
            json={"title": "User A Private Notes"}
        )
        assert conv_a_res.status_code == 201
        conv_a_id = conv_a_res.json()["id"]

        # 1. User B lists conversations: must not see User A's conversation
        b_list = client.get("/api/conversations", headers=headers_b).json()["conversations"]
        assert not any(c["id"] == conv_a_id for c in b_list)

        # 2. User B tries to fetch User A's conversation directly: 404
        b_get = client.get(f"/api/conversations/{conv_a_id}", headers=headers_b)
        assert b_get.status_code == 404

        # 3. User B tries to update User A's conversation: 404
        b_patch = client.patch(
            f"/api/conversations/{conv_a_id}",
            headers=headers_b,
            json={"title": "Hacked Title"}
        )
        assert b_patch.status_code == 404

        # 4. User B tries to delete User A's conversation: 404
        b_del = client.delete(f"/api/conversations/{conv_a_id}", headers=headers_b)
        assert b_del.status_code == 404


def test_chat_auto_provisions_conversation():
    """Verify /api/chat automatically creates a conversation if none is provided."""
    with TestClient(app) as client:
        _, headers = create_test_user(client, "chat_user")

        chat_res = client.post(
            "/api/chat",
            headers=headers,
            json={"message": "What is the capital of France?"}
        )
        assert chat_res.status_code == 200
        data = chat_res.json()
        assert "conversation_id" in data
        conv_id = data["conversation_id"]

        # Fetch conversation from API to verify messages were saved
        conv_res = client.get(f"/api/conversations/{conv_id}", headers=headers)
        assert conv_res.status_code == 200
        conv_data = conv_res.json()
        assert len(conv_data["messages"]) == 2
        assert conv_data["messages"][0]["role"] == "user"
        assert conv_data["messages"][1]["role"] == "assistant"


@pytest.mark.asyncio
async def test_registry_repository_conversation_methods():
    """Verify RegistryRepository conversation and message CRUD methods directly."""
    from registry.repository import RegistryRepository

    async with get_db() as db:
        user = await RegistryRepository.create_user(
            db,
            email=f"repo_user_{uuid.uuid4().hex[:6]}@example.com",
            username=f"repo_{uuid.uuid4().hex[:6]}",
        )
        user_id = str(user.id)
        # 1. Create conversation via RegistryRepository
        conv = await RegistryRepository.create_conversation(db, user_id=user_id, title="Direct Repo Conv")
        assert conv.id is not None
        assert conv.title == "Direct Repo Conv"

        # 2. Add messages
        msg1 = await RegistryRepository.add_message(
            db, conversation_id=conv.id, role="user", content="Hello Repo"
        )
        assert msg1.id is not None

        msg2 = await RegistryRepository.add_message(
            db, conversation_id=conv.id, role="assistant", content="Hello User", forge_data={"test": True}
        )
        assert msg2.forge_data == {"test": True}

        # 3. List messages
        msgs = await RegistryRepository.list_messages(db, conversation_id=conv.id)
        assert len(msgs) == 2
        assert msgs[0].role == "user"
        assert msgs[1].role == "assistant"

        # 4. Update conversation
        updated = await RegistryRepository.update_conversation(
            db, conversation_id=conv.id, user_id=user_id, title="Updated Repo Conv", is_pinned=True
        )
        assert updated is not None
        assert updated.title == "Updated Repo Conv"
        assert updated.is_pinned is True

        # 5. List conversations
        convs = await RegistryRepository.list_conversations(db, user_id=user_id)
        assert len(convs) == 1
        assert convs[0].id == conv.id

        # 6. Delete conversation
        deleted = await RegistryRepository.delete_conversation(db, conversation_id=conv.id, user_id=user_id)
        assert deleted is True

        # 7. Confirm deletion
        remaining = await RegistryRepository.get_conversation(db, conversation_id=conv.id, user_id=user_id)
        assert remaining is None

