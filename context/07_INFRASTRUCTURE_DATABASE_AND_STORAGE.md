# 07. Infrastructure, Database & Storage Architecture

## 1. Container & Infrastructure Topology

The system orchestrates its supporting data services using Docker Compose (`docker-compose.yml`):

```
                   ┌───────────────────────────────────────┐
                   │         Docker Compose Services       │
                   └──────────────────┬────────────────────┘
                                      │
     ┌────────────────────────────────┼────────────────────────────────┐
     ▼                                ▼                                ▼
┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐
│     sfa_postgres      │  │       sfa_minio       │  │  sfa_sandbox_builder  │
│  - Image: 16-alpine   │  │  - Image: chainguard  │  │  - Context: /sandbox  │
│  - Port: 5432         │  │  - Port: 9000 (API)   │  │  - Tag: sfa-sandbox   │
│  - Volume: pg_data    │  │  - Port: 9001 (Web)   │  │  - Python 3.11 +      │
│  - Health: pg_isready │  │  - Volume: minio_data │  │    pytest, pydantic   │
└───────────────────────┘  └───────────┬───────────┘  └───────────────────────┘
                                       │ depends_on
                                       ▼
                           ┌───────────────────────┐
                           │    sfa_minio_init     │
                           │  - Image: minio/mc    │
                           │  - Creates buckets:   │
                           │    * user-documents   │
                           │    * tool-archives    │
                           │  - Exits with 0       │
                           └───────────────────────┘
```

---

## 2. PostgreSQL 16 Relational Schema

Database persistence is managed through **SQLAlchemy 2.0 Async** ORM with **Alembic** migrations. All tables enforce foreign keys with `ondelete="CASCADE"` linked to the tenant `users.id`.

### 2.1 Entity Relationship Diagram

```
┌──────────────────┐       1:N       ┌──────────────────┐
│      users       ├────────────────►│  user_sessions   │
└────────┬─────────┘                 └──────────────────┘
         │
         │ 1:N                       1:N
         ├──────────────────────────────────────────────┐
         ▼                                              ▼
┌──────────────────┐       1:N       ┌──────────────────┴───────────────┐
│  conversations   ├────────────────►│ conversation_attachments         │
└────────┬─────────┘                 └──────────────────────────────────┘
         │
         │ 1:N
         ▼
┌──────────────────┐
│     messages     │
└──────────────────┘

┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│      tools       │       │  activity_logs   │       │    providers     │
│  (gate_score,    │       │  (action, audit  │       │  (LLM provider   │
│   reuse_count)   │       │   traces)        │       │   configs)       │
└──────────────────┘       └──────────────────┘       └──────────────────┘
```

---

### 2.2 Schema Definitions

#### `users`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID (string) | Primary Key | Unique user identifier |
| `email` | VARCHAR(255) | Unique, Indexed, NOT NULL | User email address |
| `username` | VARCHAR(100) | Unique, Indexed, NOT NULL | Display username |
| `password_hash` | VARCHAR(255) | Nullable | Bcrypt password hash (null for OAuth) |
| `auth_provider` | VARCHAR(50) | NOT NULL, Default 'local' | 'local' or 'google' |
| `google_id` | VARCHAR(255) | Unique, Indexed, Nullable | Google OAuth Subject ID |
| `avatar_url` | VARCHAR(1024) | Nullable | Profile picture URL |
| `is_active` | BOOLEAN | NOT NULL, Default TRUE | Account active state |

#### `tools` (Core Registry Table)
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID (string) | Primary Key | Unique tool identifier |
| `user_id` | UUID (string) | Foreign Key (`users.id`), Index | Multi-tenant owner |
| `name` | VARCHAR(255) | Index, NOT NULL | Function / tool identifier |
| `description` | TEXT | Nullable | Capability summary |
| `code` | TEXT | NOT NULL | Complete Python source code |
| `schema_json` | JSONB | NOT NULL | Parameter JSON schema |
| `tests_code` | TEXT | Nullable | Cached adversarial Pytest suite |
| `status` | VARCHAR(50) | Default 'active', NOT NULL | 'active', 'degraded', 'quarantined' |
| `reuse_count` | INTEGER | Default 0, NOT NULL | Number of successful reuses |
| `gate_score` | FLOAT | Default 0.0, NOT NULL | Rolling Bayesian quality score |
| `last_used_at` | TIMESTAMPTZ | Nullable | Timestamp of most recent execution |

#### `conversations` & `messages`
* `conversations`: Tracks conversation title, pinned status (`is_pinned`), user ownership, and timestamps.
* `messages`: Stores individual chat turns (`role`: "user" | "assistant" | "system", `content`: markdown text). Contains a **`forge_data` JSONB column** storing the exact tool code, test logs, repair counts, and execution metrics associated with that turn.

#### `conversation_attachments`
Tracks files attached to chat sessions. Stores `filename`, `content_type`, `size_bytes`, `s3_key` (MinIO path), and `extracted_text` (indexed plain text extracted at upload time).

---

## 3. MinIO S3 Object Storage & Text Extraction

### 3.1 Bucket Layout
1. **`user-documents`**: Houses uploaded documents. Organized by tenant and conversation:
   `user-documents/{user_id}/{conversation_id}/{uuid}_{filename}`
2. **`tool-archives`**: Houses exported `.sfatool` bundles and compressed Python modules.

### 3.2 In-Memory Document Text Extractor (`backend/storage/extractor.py`)
When a document is uploaded, the backend streams the file into an in-memory byte buffer and extracts text without creating temporary disk files:
* **PDF Extraction**: Reads text streams page by page via `pypdf`.
* **Tabular Data (CSV)**: Parses rows and formats them into a clean markdown table preview.
* **Structured Data (JSON)**: Pretty-prints JSON keys and structures.
* **Plaintext & Source Code**: Decodes UTF-8 with fallback to Latin-1.
* **Safety Bounds**: Text is capped at 100,000 characters to prevent context window exhaustion. Extracted text is stored in PostgreSQL and injected directly into `core_node` and `forge_node` prompts as contextual grounding.

---

## 4. Docker Sandbox Architecture (`Dockerfile.sandbox`)

The sandbox container image (`sfa-sandbox:latest`) is pre-built to ensure zero-latency execution:
```dockerfile
FROM python:3.11-slim
WORKDIR /workspace
RUN pip install --no-cache-dir pytest pydantic numpy scipy
ENTRYPOINT ["pytest"]
```
* **Performance Gain**: Pre-caching Python wheels eliminates the 20–30s `pip install` overhead on every test run. Unit test suites run in under **400ms**.
* **Mounting Protocol**: The backend writes the generated code to `/tmp/sfa_test_{uuid}/generated_tool.py` and the test suite to `/tmp/sfa_test_{uuid}/test_tool.py`, mounting the directory as `/workspace` inside an unprivileged container.
* **Containment**: Enforces `--network none`, `--memory 512m`, and a 60-second execution kill switch.

---

## 5. Development Automation Scripts

### 5.1 [run.bat](file:///c:/devlopment/Final%20Year%20Project/Self-Forging-AI/run.bat) (One-Click Launch)
1. Checks if Docker Engine is running; prompts if inactive.
2. Runs `docker compose up -d` to launch PostgreSQL, MinIO, and build the sandbox.
3. Waits for PostgreSQL (5432) and MinIO (9000) health checks to pass.
4. Activates Python virtual environment (`backend/.venv`) and installs dependencies.
5. Runs Alembic database migrations.
6. Launches FastAPI backend on `http://localhost:8000`.
7. Launches Vite React frontend on `http://localhost:5173`.

### 5.2 [stop.bat](file:///c:/devlopment/Final%20Year%20Project/Self-Forging-AI/stop.bat) (Graceful Shutdown)
1. Kills running Uvicorn and Vite background processes.
2. Runs `docker compose down` to stop all containers cleanly.
