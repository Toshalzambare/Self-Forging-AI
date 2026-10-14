# Google OAuth 2.0 Setup Guide for Google Cloud Platform (GCP)

This guide walks you through setting up Google OAuth 2.0 credentials in the Google Cloud Console for the **Self-Forging AI Agent** platform.

---

## Prerequisites
- A Google account (Gmail or Google Workspace).
- Access to the [Google Cloud Console](https://console.cloud.google.com/).

---

## Step 1: Create a Google Cloud Project

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Click on the project dropdown in the top-left navigation bar (next to the Google Cloud logo).
3. Click **"New Project"** in the top-right of the modal.
4. Enter project details:
   - **Project Name**: `Self-Forging-AI` (or your preferred name)
   - **Location**: No organization (default) or your organization.
5. Click **"CREATE"**.
6. Ensure your newly created project is selected in the top navigation dropdown.

---

## Step 2: Configure the OAuth Consent Screen

Before creating OAuth credentials, Google requires configuring the consent screen that users see when signing in.

1. In the left navigation menu, navigate to **APIs & Services > OAuth consent screen** (or search "OAuth consent screen" in the search bar).
2. Choose **User Type**:
   - **External**: Select this if any Google user should be able to log into your app (Recommended for development/personal projects).
   - **Internal**: Select this only if you are using Google Workspace and only want users in your organization to access it.
3. Click **"CREATE"**.

4. **App Information**:
   - **App name**: `Self-Forging AI Agent`
   - **User support email**: Select your email address from the dropdown.
   - **App logo**: Optional (leave blank for now).
   - **Developer contact information**: Enter your email address.
   - Click **"SAVE AND CONTINUE"**.

5. **Scopes**:
   - Click **"ADD OR REMOVE SCOPES"**.
   - Check the following 3 standard non-sensitive scopes:
     - `.../auth/userinfo.email` (See your primary Google Account email address)
     - `.../auth/userinfo.profile` (See your personal info, including any personal info you've made publicly available)
     - `openid` (Associate you with your personal info on Google)
   - Click **"UPDATE"**.
   - Click **"SAVE AND CONTINUE"**.

6. **Test Users** *(Crucial for development)*:
   - Because your app is initially in "Testing" publishing status, Google will only allow explicitly listed test accounts to sign in.
   - Click **"+ ADD USERS"**.
   - Enter your Gmail address (and any team members' emails testing the app).
   - Click **"ADD"**.
   - Click **"SAVE AND CONTINUE"**.

7. Review the summary and click **"BACK TO DASHBOARD"**.

---

## Step 3: Create OAuth 2.0 Client ID Credentials

1. In the left navigation menu, navigate to **APIs & Services > Credentials**.
2. Click **"+ CREATE CREDENTIALS"** at the top, then select **"OAuth client ID"**.
3. Fill out the credential form:
   - **Application type**: Select **"Web application"**.
   - **Name**: `Self-Forging AI Web Client`

4. **Authorized JavaScript origins**:
   Click **"+ ADD URI"** and add both local frontend origins:
   ```text
   http://localhost:5173
   http://127.0.0.1:5173
   ```
   *(If your frontend runs on a different port in production, add that domain here as well).*

5. **Authorized redirect URIs**:
   Click **"+ ADD URI"** and add:
   ```text
   http://localhost:5173
   http://localhost:8000/api/auth/google/callback
   ```

6. Click **"CREATE"**.
7. A modal will pop up with:
   - **Your Client ID** (e.g., `1234567890-abcdef123456.apps.googleusercontent.com`)
   - **Your Client Secret** (e.g., `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx`)
8. Copy both values.

---

## Step 4: Configure Project Environment Variables

### 1. Backend Configuration
Open the root `.env` file (and `.env.example`) and add your credentials:

```bash
# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=1234567890-abcdef123456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
```

### 2. Frontend Configuration
In `frontend/.env` (or `frontend/.env.example`):

```bash
VITE_GOOGLE_CLIENT_ID=1234567890-abcdef123456.apps.googleusercontent.com
```

---

## Step 5: How It Works in Self-Forging AI

1. When a user clicks **"Sign in with Google"** on the Login page:
   - Google opens a secure popup/consent dialog.
   - Google returns a signed ID token (`credential`) to the frontend.
2. The frontend sends `{"credential": token}` to the backend at `POST /api/auth/google`.
3. The backend validates the cryptographic signature using Google's public certificates via `google-auth`.
4. If this is a first-time Google user, a new account is automatically created in PostgreSQL. If the email matches an existing account, the Google ID is linked.
5. The backend returns standard access and refresh tokens, granting immediate access to the AI workspace.

---

## Troubleshooting & Common Pitfalls

| Issue | Cause | Solution |
|-------|-------|----------|
| **`Error 400: origin_mismatch`** | The URL you opened in the browser does not match the **Authorized JavaScript origins**. | If opening `http://localhost:5173`, make sure `http://localhost:5173` is added (exact match, no trailing slash). |
| **`Error 403: access_denied`** | The Google account you're testing with is not listed under **Test Users**. | Go to **OAuth consent screen > Test users**, add your email address, and retry. |
| **`Invalid Google credential` (Backend 401)** | `GOOGLE_CLIENT_ID` in `.env` does not match the Client ID used by the frontend. | Ensure `GOOGLE_CLIENT_ID` in backend `.env` matches `VITE_GOOGLE_CLIENT_ID` in frontend `.env`. |
| **Working Offline / Without GCP Credentials** | You don't have Google Cloud credentials yet. | The backend includes a mock bypass in dev mode when `GOOGLE_CLIENT_ID` is empty, allowing you to test local email/password authentication without GCP. |
