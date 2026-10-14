"""
Authentication test suite:
- Cryptographic security utilities (bcrypt work factor 12, JWT access tokens, SHA-256 refresh hashes)
- Google OAuth token verification and account auto-provisioning / linking
- Local signup and login workflows
- Dual-token session management: refresh token rotation and replay attack detection
- Session revocation on logout
- Protected /api/auth/me and /api/auth/sessions endpoints
"""
import pytest
import uuid
import sys
import os
from datetime import timedelta

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from fastapi.testclient import TestClient
from main import app
from auth.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    generate_refresh_token,
    hash_refresh_token,
)
from auth.google import verify_google_credential
from registry.database import engine


@pytest.fixture(autouse=True)
async def cleanup_engine():
    yield
    await engine.dispose()


def test_password_hashing():
    """Verify bcrypt rounds=12 password hashing and verification."""
    password = "SuperSecretPassword123!"
    hashed = hash_password(password)
    assert hashed.startswith("$2b$12$")
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False
    assert verify_password("", hashed) is False


def test_jwt_access_tokens():
    """Verify JWT access token creation and decoding with expiration."""
    user_id = str(uuid.uuid4())
    email = "testuser@example.com"

    token = create_access_token(user_id, email)
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["email"] == email
    assert payload["type"] == "access"

    # Expired token test
    expired_token = create_access_token(user_id, email, expires_delta=timedelta(seconds=-10))
    assert decode_access_token(expired_token) is None

    # Invalid token test
    assert decode_access_token("not-a-real-token") is None


def test_refresh_token_generation():
    """Verify refresh token generation (64 hex characters) and SHA-256 hashing."""
    token = generate_refresh_token()
    assert len(token) == 64
    hashed = hash_refresh_token(token)
    assert len(hashed) == 64
    assert hashed != token
    assert hash_refresh_token(token) == hashed


def test_google_token_verification():
    """Verify Google token verification with mock dev token and invalid tokens."""
    # Invalid token
    assert verify_google_credential("invalid-token") is None
    assert verify_google_credential("") is None

    # Mock dev token
    mock_email = "alex.dev@gmail.com"
    payload = verify_google_credential(f"mock-google-token-{mock_email}")
    assert payload is not None
    assert payload["email"] == mock_email
    assert payload["sub"] == f"mock-google-id-{mock_email}"
    assert payload["email_verified"] is True


def test_signup_and_login_flow():
    """Verify user registration and password authentication via API."""
    client = TestClient(app)
    uid = uuid.uuid4().hex[:8]
    email = f"user_{uid}@example.com"
    username = f"user_{uid}"
    password = "StrongPassword456!"

    # 1. Signup
    signup_res = client.post("/api/auth/signup", json={
        "email": email,
        "username": username,
        "password": password,
    })
    assert signup_res.status_code == 201
    data = signup_res.json()
    assert "token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == email
    assert data["user"]["username"] == username
    assert data["user"]["auth_provider"] == "local"

    # 2. Duplicate signup should fail
    dup_res = client.post("/api/auth/signup", json={
        "email": email,
        "username": f"other_{uid}",
        "password": password,
    })
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"]

    # 3. Login with email
    login_res = client.post("/api/auth/login", json={
        "login": email,
        "password": password,
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "token" in login_data
    assert login_data["user"]["email"] == email

    # 4. Login with username
    login_user_res = client.post("/api/auth/login", json={
        "login": username,
        "password": password,
    })
    assert login_user_res.status_code == 200

    # 5. Login with invalid password
    bad_login = client.post("/api/auth/login", json={
        "login": email,
        "password": "WrongPassword999!",
    })
    assert bad_login.status_code == 401


def test_google_auth_provisioning_and_linking():
    """Verify Google OAuth auto-provisioning and existing account linking."""
    client = TestClient(app)
    uid = uuid.uuid4().hex[:8]
    google_email = f"google_{uid}@gmail.com"
    mock_token = f"mock-google-token-{google_email}"

    # 1. First-time login with Google -> auto provisions user
    res1 = client.post("/api/auth/google", json={"credential": mock_token})
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["user"]["email"] == google_email
    assert data1["user"]["auth_provider"] == "google"
    user_id = data1["user"]["id"]

    # 2. Second-time login with same Google token -> returns same user
    res2 = client.post("/api/auth/google", json={"credential": mock_token})
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["user"]["id"] == user_id

    # 3. Account linking: local signup first, then Google auth with same email
    local_email = f"link_{uid}@gmail.com"
    client.post("/api/auth/signup", json={
        "email": local_email,
        "username": f"link_{uid}",
        "password": "Password123!",
    })
    link_token = f"mock-google-token-{local_email}"
    link_res = client.post("/api/auth/google", json={"credential": link_token})
    assert link_res.status_code == 200
    assert link_res.json()["user"]["email"] == local_email


def test_refresh_token_rotation_and_replay_detection():
    """Verify token rotation and automatic replay attack defense."""
    client = TestClient(app)
    uid = uuid.uuid4().hex[:8]

    # Create account
    signup_res = client.post("/api/auth/signup", json={
        "email": f"rotate_{uid}@example.com",
        "username": f"rotate_{uid}",
        "password": "Password123!",
    })
    refresh_token_1 = signup_res.json()["refresh_token"]

    # 1. Rotate token
    rotate_res = client.post("/api/auth/refresh", json={"refresh_token": refresh_token_1})
    assert rotate_res.status_code == 200
    refresh_token_2 = rotate_res.json()["refresh_token"]
    assert refresh_token_2 != refresh_token_1

    # 2. Rotate again with new token
    rotate_res_2 = client.post("/api/auth/refresh", json={"refresh_token": refresh_token_2})
    assert rotate_res_2.status_code == 200
    refresh_token_3 = rotate_res_2.json()["refresh_token"]

    # 3. Replay attack: attempt to reuse the consumed refresh_token_1
    replay_res = client.post("/api/auth/refresh", json={"refresh_token": refresh_token_1})
    assert replay_res.status_code == 401
    assert "Revoked token reuse detected" in replay_res.json()["detail"]

    # 4. Because replay attack revoked ALL sessions for this user, refresh_token_3 should now also be revoked!
    revoked_res = client.post("/api/auth/refresh", json={"refresh_token": refresh_token_3})
    assert revoked_res.status_code == 401


def test_logout_revocation():
    """Verify logout revokes the session."""
    client = TestClient(app)
    uid = uuid.uuid4().hex[:8]

    signup_res = client.post("/api/auth/signup", json={
        "email": f"logout_{uid}@example.com",
        "username": f"logout_{uid}",
        "password": "Password123!",
    })
    refresh_token = signup_res.json()["refresh_token"]

    # Logout
    logout_res = client.post("/api/auth/logout", json={"refresh_token": refresh_token})
    assert logout_res.status_code == 200

    # Refreshing with logged out token must fail
    refresh_res = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh_res.status_code == 401


def test_protected_profile_and_sessions():
    """Verify /api/auth/me and /api/auth/sessions require valid authentication."""
    client = TestClient(app)
    uid = uuid.uuid4().hex[:8]

    # Without token -> 401
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/sessions").status_code == 401

    # With token
    signup_res = client.post("/api/auth/signup", json={
        "email": f"profile_{uid}@example.com",
        "username": f"profile_{uid}",
        "password": "Password123!",
    })
    access_token = signup_res.json()["token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["username"] == f"profile_{uid}"

    sessions_res = client.get("/api/auth/sessions", headers=headers)
    assert sessions_res.status_code == 200
    sessions = sessions_res.json()
    assert len(sessions) >= 1
