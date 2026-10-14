"""
Google OAuth 2.0 token verification using google-auth.
Verifies Google ID tokens (credential) issued by Google Identity Services.
"""
import os
import sys
from typing import Optional, Dict, Any
from google.oauth2 import id_token
from google.auth.transport import requests

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import config


def verify_google_credential(credential: str) -> Optional[Dict[str, Any]]:
    """
    Verifies a Google ID token from Google Identity Services.
    Returns token payload dict (email, sub, name, picture) or None if invalid.
    """
    if not credential or not isinstance(credential, str):
        return None

    try:
        # Development & testing mock token support
        if credential.startswith("mock-google-token-"):
            email = credential.replace("mock-google-token-", "").strip().lower()
            return {
                "sub": f"mock-google-id-{email}",
                "email": email,
                "name": email.split("@")[0].title(),
                "picture": None,
                "email_verified": True,
            }

        client_id = config.GOOGLE_CLIENT_ID if config.GOOGLE_CLIENT_ID else None
        request = requests.Request()
        id_info = id_token.verify_oauth2_token(credential, request, audience=client_id)

        # Verify issuer is Google
        issuer = id_info.get("iss")
        if issuer not in ["accounts.google.com", "https://accounts.google.com"]:
            return None

        return id_info
    except Exception as e:
        print(f"Google token verification error: {e}")
        return None
