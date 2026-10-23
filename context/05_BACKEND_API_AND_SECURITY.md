# 05. Backend API & Security Architecture

## 1. Backend Technology Stack

The backend is built as a high-concurrency, asynchronous ASGI service:
* **Framework**: FastAPI (Python 3.11+) with async/await native concurrency
* **Agent Engine**: LangGraph (`StateGraph`) with cyclic loop execution
* **Database Driver**: SQLAlchemy 2.0 with `asyncpg` async PostgreSQL connection pool
* **Schema Validation**: Pydantic v2 with strict type coercion
* **Object Storage**: MinIO Python SDK (S3 API compatible)
* **Real-Time Streaming**: Starlette WebSockets with per-client async queues
* **Container Isolation**: Docker Python SDK interfacing `/var/run/docker.sock`

---

## 2. API Endpoints Catalog

### 2.1 Authentication (`/api/auth`)
* `POST /api/auth/signup`: Create a new user with `email`, `username`, and `password`. Returns JWT access and refresh tokens.
* `POST /api/auth/login`: Authenticate with email/username and password. Generates new active session.
* `POST /api/auth/refresh`: Rotate refresh token and issue a fresh 15-minute access token. Enforces replay attack defense.
* `POST /api/auth/logout`: Revoke active session and refresh token in database.
* `GET /api/auth/me`: Retrieve currently authenticated user profile.
* `POST /api/auth/google`: Authenticate via Google OAuth 2.0 ID token. Automatically links accounts sharing the same email or provisions new users.

---

### 2.2 Chat & Execution (`/api/chat`)
* `POST /api/chat`: Primary endpoint for user dialogue and tool synthesis.
  * **Payload**:
    ```json
    {
      "message": "Calculate the 35th Fibonacci number",
      "conversation_id": "c7a8b9...uuid",
      "model": "claude-3-5-haiku-20241022"
    }
    ```
  * **Response**: Returns assistant text, conversation metadata, and comprehensive `forge_data`:
    ```json
    {
      "response": "The 35th Fibonacci number is 9,227,465.",
      "conversation_id": "c7a8b9...uuid",
      "is_tool_forged": true,
      "is_tool_reused": false,
      "tests_passed": true,
      "tool_id": "calculate_fibonacci",
      "execution_time_ms": 1.24
    }
    ```

---

### 2.3 Conversation Management (`/api/conversations`)
* `GET /api/conversations`: List conversations owned by the authenticated user, ordered by pinned status and updated timestamp.
* `POST /api/conversations`: Create a new conversation thread.
* `GET /api/conversations/{id}/messages`: Fetch ordered chronological message history for a conversation.
* `PATCH /api/conversations/{id}`: Rename conversation title or toggle pinned state.
* `DELETE /api/conversations/{id}`: Delete conversation and cascade delete all associated messages and attachment records.

---

### 2.4 Document Management (`/api/conversations/{id}/attachments`)
* `POST /api/conversations/{id}/attachments`: Upload documents (PDF, CSV, JSON, Markdown, Code) up to 25MB.
  * Streams file bytes directly to MinIO bucket `user-documents`.
  * Runs in-memory text extractor (`storage/extractor.py`) to extract searchable plain text.
  * Stores metadata and extracted text in PostgreSQL `conversation_attachments`.
* `DELETE /api/conversations/{id}/attachments/{att_id}`: Deletes file from MinIO and deletes database record.

---

### 2.5 Tool Registry & Marketplace (`/api/tools`)
* `GET /api/tools`: List all active, degraded, or quarantined tools owned by the authenticated user.
* `GET /api/tools/{id}`: Fetch complete tool details including source code, parameter JSON schema, adversarial tests, and performance metrics.
* `DELETE /api/tools/{id}`: Delete tool from PostgreSQL and purge from in-memory MCP registry.
* `GET /api/tools/{id}/export`: Export tool as a standardized `.sfatool` JSON bundle.
* `POST /api/tools/import`: Import a `.sfatool` bundle. Passes bundle through the AST Security Admission Gate before registering.

---

### 2.6 Real-Time Telemetry & Observability (`/api/logs` & `/ws/activity`)
* `GET /api/logs`: Paginated activity logs with optional filtering by `session_id`, `action`, or `status`.
* `GET /api/logs/{id}/trace`: Deep trace inspector retrieving the full execution record, input task, generated code, pytest logs, and error traces.
* `WebSocket /ws/activity?token={access_token}`: Real-time user-isolated event stream. Pushes lifecycle events:
  * `AGENT_THINKING`: Prompt analysis & routing
  * `TOOL_DETECTED`: Missing capability identified
  * `AGENT_FORGING`: Code synthesis in progress
  * `SANDBOX_TESTING`: Adversarial pytest execution
  * `REPAIR_ATTEMPT`: Autonomous error fixing
  * `TOOL_VERIFIED`: Test suite passed
  * `TOOL_REUSED`: Dual-Gate verified reuse

---

### 2.7 Modular Settings (`/api/settings`)
* `GET/POST /api/settings/providers`: Manage LLM providers (OmniRoute, OpenAI, Anthropic, Ollama, DeepSeek).
* `GET/POST /api/settings/sandbox`: Read or update Docker sandbox resource limits (timeout, memory, network mode).
* `GET/POST /api/settings/mcp_servers`: Connect or disconnect external MCP micro-servers.
* `GET/POST /api/settings/profile`: Update user profile, default model, and API keys.

---

## 3. Security Architecture & Threat Mitigations

```
                               Incoming Request
                                       │
                                       ▼
                     ┌───────────────────────────────────┐
                     │ Layer 1: JWT & Session Validation │
                     │ - 15-min Access Token (HS256)     │
                     │ - Replay-Protected Refresh Token  │
                     └─────────────────┬─────────────────┘
                                       │
                                       ▼
                     ┌───────────────────────────────────┐
                     │ Layer 2: Multi-Tenant Row Scoping │
                     │ - Where: table.user_id == auth.id │
                     └─────────────────┬─────────────────┘
                                       │
                                       ▼
                     ┌───────────────────────────────────┐
                     │ Layer 3: AST Security Profiler    │
                     │ - Static Abstract Syntax Tree     │
                     │ - Module Denylist (os, sys, etc.) │
                     │ - Banned Calls (eval, exec, open) │
                     └─────────────────┬─────────────────┘
                                       │
                                       ▼
                     ┌───────────────────────────────────┐
                     │ Layer 4: Docker Sandbox Container │
                     │ - Network: "none"                 │
                     │ - Memory: 512MB RAM cap           │
                     │ - Timeout: 60s hard kill          │
                     └───────────────────────────────────┘
```

---

### 3.1 Dual-Token JWT & Replay Attack Defense
1. **Short-Lived Access Token**: Signed with HMAC-SHA256 containing `sub` (user_id) and `exp` (15 minutes).
2. **Cryptographically Rotating Refresh Token**: Stored as a SHA-256 hash in `user_sessions`.
3. **Replay Attack Defense**:
   * When a client refreshes tokens, the current session row is updated to `is_revoked = True` and a new session is created.
   * If a stolen or revoked refresh token is ever presented again, the authentication system flags a security intrusion and **immediately revokes all active sessions for that user**, forcing all devices to re-authenticate.

---

### 3.2 The AST Static Security Profiler (`sandbox/profiler.py`)
Before untrusted generated code or tests are written to disk or sent to Docker, the code is parsed into a Python Abstract Syntax Tree (`ast.parse`) and inspected:

1. **Strict Module Denylist**:
   ```python
   BANNED_MODULES = {
       "os", "sys", "subprocess", "shutil", "pty", "socket",
       "multiprocessing", "threading", "importlib", "builtins",
       "eval", "exec", "compile", "posix", "nt", "ctypes",
       "pathlib", "io", "tempfile", "codecs", "urllib.request",
       "http", "gc", "inspect", "pickle"
   }
   ```
2. **Banned Function Calls**:
   `eval`, `exec`, `compile`, `__import__`, `open`, `globals`, `locals`, `vars`, `breakpoint`, `input`.
3. **Restricted Dunder Traversal**:
   Traversals like `[].__class__.__base__.__subclasses__()` used in sandbox escape exploits are detected and rejected at AST node level (`__subclasses__`, `__globals__`, `__code__`, `__builtins__`).
4. **String Forward-Reference Disallowance**:
   String annotations that could trigger hidden runtime evaluations via typing tools are blocked.

---

### 3.3 Dynamic Model Routing & Proxy Integration
The platform communicates with LLMs through a unified client factory (`backend/agents/llm.py`):
* Reads `state.get("model")` dynamically on every turn.
* Dispatches requests through **OmniRoute** (`http://localhost:20128/v1`) or direct API endpoints.
* Enforces `LLM_REQUEST_TIMEOUT = 60s` and `LLM_MAX_RETRIES = 3` with exponential backoff, preventing network stalls.
