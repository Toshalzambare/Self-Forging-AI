# SELF-FORGING AI AGENT: COMPLETE UNIFIED PROJECT CONTEXT

> **Consolidated Technical Specification, Architecture Blueprint & Research Documentation**
> Generated from 9 modular context documents in `C:\devlopment\Final Year Project\Self-Forging-AI\context`



================================================================================

<!-- FILE START: context/README.md -->

# Self-Forging AI Agent: Comprehensive Architecture & Context Suite

Welcome to the definitive architecture and technical documentation suite for the **Self-Forging AI Agent** platform. This directory contains an exhaustive, deep-dive breakdown of every tier, algorithm, model, pipeline node, and security mechanism powering the project.

---

## 📑 Context Suite Index

| Document | Topic | Key Contents |
|---|---|---|
| [**01. Project Vision & Problem Statement**](file:///c:/devlopment/Final%20Year%20Project/Self-Forging-AI/context/01_PROJECT_VISION_AND_PROBLEM_STATEMENT.md) | Vision & Novelty | Limits of static tools, the "Registration-Only" fallacy, academic significance, patent focus, and target use cases. |
| [**02. Architecture & System Design**](file:///c:/devlopment/Final%20Year%20Project/Self-Forging-AI/context/02_ARCHITECTURE_AND_SYSTEM_DESIGN.md) | System Blueprint | 6-tier system architecture, ASCII diagrams, sequence diagrams for Cold Forge, Fast-Path Reuse, Self-Repair, and Multi-Tenant data isolation. |
| [**03. LangGraph Agent Pipeline**](file:///c:/devlopment/Final%20Year%20Project/Self-Forging-AI/context/03_LANGGRAPH_AGENT_PIPELINE.md) | State Machine | `AgentState` schema, deep dive into each LangGraph node (`core`, `forge`, `tester`, `verify`, `repair`, `register`, and `runtime_exec`). |
| [**04. Patent Algorithms: Dual-Gate & Hybrid Search**](file:///c:/devlopment/Final%20Year%20Project/Self-Forging-AI/context/04_PATENT_ALGORITHMS_DUAL_GATE_AND_HYBRID_SEARCH.md) | Novel Algorithms | Mathematical formulations for the **Dual-Gate Admission Algorithm** (Gate 1 + Gate 2) and the **3-Signal Hybrid Tool Search Algorithm** ($S_{\text{intent}}, S_{\text{struct}}, S_{\text{perf}}$). |
| [**05. Backend API & Security Architecture**](file:///c:/devlopment/Final%20Year%20Project/Self-Forging-AI/context/05_BACKEND_API_AND_SECURITY.md) | Backend & Security | Complete FastAPI endpoint catalog, Dual-token JWT with replay defense, AST Security Profiler denylists, and Dynamic Model Dispatch. |
| [**06. Frontend Architecture & UX**](file:///c:/devlopment/Final%20Year%20Project/Self-Forging-AI/context/06_FRONTEND_ARCHITECTURE_AND_UX.md) | UI/UX & React 19 | Glassmorphic design tokens, component hierarchy (<250 lines), WebSocket hooks, `ModelModal` custom model typing, and live Activity Drawer. |
| [**07. Infrastructure, Database & Storage**](file:///c:/devlopment/Final%20Year%20Project/Self-Forging-AI/context/07_INFRASTRUCTURE_DATABASE_AND_STORAGE.md) | Data & Devops | Docker Compose topology, PostgreSQL 16 schema & ERD, MinIO S3 document extraction, pre-cached Docker sandbox, `run.bat` & `stop.bat`. |
| [**08. Empirical Benchmarks & Testing Guide**](file:///c:/devlopment/Final%20Year%20Project/Self-Forging-AI/context/08_EMPIRICAL_BENCHMARKS_AND_EVALUATION.md) | Benchmarks & Guide | 20-task research benchmark results, 100% AST & regression catch rates, 4000x reuse speedup, 116 automated tests, and step-by-step demo guide. |

---

## 🏛️ System Architecture At A Glance

```
       [ Client Browser: React 19 + Vite (Port 5173) ]
                              │
                    HTTP REST │ WebSocket
                              ▼
        [ FastAPI Backend API Gateway (Port 8000) ]
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
  [ LangGraph Graph ]  [ PostgreSQL 16 ]   [ MinIO S3 Object Store ]
  (Core, Forge,        (Tools, Users,      (Buckets: user-documents,
   Tester, Repair)      Logs, Messages)     tool-archives)
          │
          ├───────────────────────────────────────┐
          ▼                                       ▼
[ Docker Test Sandbox ]             [ LLM Proxy / OmniRoute Gateway ]
(sfa-sandbox:latest,                (Claude 3.5 Haiku, Claude 3.7 Sonnet,
 AST Security Profiler)              GPT-4o, DeepSeek, DuckDuckGo Research)
```

---

## 📖 Key Terminology Glossary

* **Self-Forging AI Agent**: An autonomous agent capable of detecting missing capabilities during conversation, synthesizing new Python tools, verifying them in a sandbox, and registering them into memory without developer intervention.
* **Dual-Gate Admission Algorithm (Patent Focus)**: A continuous qualification framework that verifies both static AST safety (Gate 1) and lightweight sandbox regression (Gate 2) on **every tool reuse**, preventing tool decay and parameter drift.
* **3-Signal Hybrid Tool Search**: A custom search algorithm combining Contextual Semantic Intent ($S_{\text{intent}}$), Structural Schema Compatibility ($S_{\text{struct}}$), and Bayesian Historical Reliability ($S_{\text{perf}}$).
* **In-Memory Dynamic MCP Hot-Swapping**: Compiling and injecting executable tool callables into memory immediately upon verification, bypassing server restarts or module reload limitations.
* **AST Static Security Profiler**: A pre-execution parser that analyzes the Python Abstract Syntax Tree to reject banned modules (`os`, `sys`, `socket`, `subprocess`) and private dunder exploits (`__subclasses__`, `__globals__`).
* **`.sfatool` Bundle**: A standardized JSON archive format allowing users to export tools from their private registry and share or import them into other registries with full AST validation.

---

## ⚡ Quick Operational Cheat Sheet

* **Launch Entire Stack**: Double-click [run.bat](file:///c:/devlopment/Final%20Year%20Project/Self-Forging-AI/run.bat) in the project root.
* **Graceful Shutdown**: Double-click [stop.bat](file:///c:/devlopment/Final%20Year%20Project/Self-Forging-AI/stop.bat).
* **Frontend Web App**: `http://localhost:5173`
* **Backend API Docs (Swagger UI)**: `http://localhost:8000/docs`
* **MinIO Object Console**: `http://localhost:9001` (Credentials: `minioadmin` / `minioadmin123`)
* **Run Automated Test Suite**:
  ```powershell
  .\backend\.venv\Scripts\python.exe -m pytest tests/
  ```

<!-- FILE END: context/README.md -->


================================================================================

<!-- FILE START: context/01_PROJECT_VISION_AND_PROBLEM_STATEMENT.md -->

# 01. Project Vision & Problem Statement

## 1. Executive Summary

The **Self-Forging AI Agent** is an autonomous, self-improving AI agent architecture capable of detecting missing operational capabilities during open-ended human conversation, synthesizing brand-new executable Python tools at runtime, adversarially verifying them within an isolated Docker sandbox, and dynamically registering them into an in-memory Model Context Protocol (MCP) registry—**all without human developer intervention or server restarts**.

Unlike conventional tool-calling systems (e.g., OpenAI Function Calling or LangChain static toolkits), which depend on pre-compiled, static APIs hardcoded at build time, the Self-Forging AI Agent treats **tools as dynamic, runtime-synthesized software artifacts**. 

The platform serves two purposes:
1. **Academic & Research Vehicle**: Proving the efficacy of the novel **Dual-Gate Admission Algorithm** (patent focus) and a novel **3-Signal Hybrid Tool Search Algorithm**, which together eliminate the silent decay, semantic drift, and security vulnerabilities inherent in LLM-synthesized code.
2. **Production-Ready Multi-Tenant Workspace**: Providing users with an intuitive, glassmorphic conversational interface backed by PostgreSQL 16, MinIO S3 document storage, real-time WebSocket observability, and isolated per-user tool ecosystems.

---

## 2. Problem Statement & Motivation

### 2.1 The Limits of Static Tool Repositories
Modern Large Language Models (LLMs) excel at reasoning and conversational dialogue, but are fundamentally constrained by:
* **Knowledge Cutoffs**: Inability to perform novel transformations or interface with specialized schemas invented after model training.
* **Arithmetic & Algorithmic Hallucination**: LLMs notoriously fail at exact multi-step calculations (e.g., computing the 45th Fibonacci number, precise compound interest, GPS Haversine distances, or complex string tokenization) when computing directly in their neural weights.
* **Static Tool Sets**: Existing agent frameworks require a software engineer to anticipate every conceivable tool in advance, write the Python/TypeScript wrapper, define the JSON schema, and redeploy the agent. If an agent encounters a problem without an existing tool, it either fails or hallucinates an incorrect answer.

### 2.2 The Dangers of Autonomous Code Generation
While allowing an LLM to generate Python code on the fly solves the static tool problem, naive runtime code execution introduces critical vulnerabilities:
1. **Security Vulnerabilities & Sandbox Escapes**: Untrusted generated code may attempt socket exfiltration, file system traversal (`os.system("rm -rf /")`), fork bombs, or dynamic code execution via `eval()`, `exec()`, or Python's `__subclasses__` dunder introspection.
2. **The "Registration-Only" Fallacy**: Current research frameworks (such as ToolCoder or Voyager) only test a tool once when it is created. In real-world multi-turn environments:
   * Future prompts supply unexpected arguments or different data types.
   * Tool definitions experience semantic drift.
   * A tool that worked for $N=5$ may crash with an off-by-one error or recursion limit for $N=45$.
3. **Silent Failure & Absence of Observability**: In many agent architectures, when code fails or an exception occurs, the agent hallucinates a generic conversational response or crashes the request with internal 500 errors.

---

## 3. Core Philosophy & Design Principles

### Principle 1: Never Fail Silently
Every single action—tool detection, code forging, adversarial test generation, sandbox execution, AST security profiling, and repair attempts—must be:
* **Observable**: Streamed in real-time over WebSockets to the client UI.
* **Auditable**: Persisted to PostgreSQL with full stdout, stderr, execution timings, and error traces.
* **Deterministic**: Clear boundary limits and fallback responses so the user is never left hanging.

### Principle 2: Re-Evaluate on Every Reuse (The Dual-Gate Mandate)
A tool is never trusted forever simply because it passed its initial tests. The **Dual-Gate Admission Algorithm** ensures that every time an existing tool is retrieved from the registry, it must re-pass both **Gate 1 (Static AST Security & Structural Parameter Fit)** and **Gate 2 (Lightweight Sandbox Regression)** before runtime execution is permitted.

### Principle 3: Multi-Tenant Zero-Trust Isolation
Each user has their own cryptographically isolated workspace:
* User A cannot see, execute, or rehydrate tools belonging to User B.
* Untrusted code executes inside an unprivileged Docker sandbox with strict CPU, memory (512MB), execution timeout (60s), and disabled networking (`network_mode="none"`).

### Principle 4: Dynamic Model Flexibility
The architecture is model-agnostic. The user can dynamically select any LLM endpoint—from ultra-fast models like **Claude 3.5 Haiku** to deep-reasoning models like **Claude 3.7 Sonnet**, **GPT-4o**, or **DeepSeek V3**—either via quick presets or by typing any custom model identifier.

---

## 4. Academic & Research Significance

| Dimension | Conventional Static Agent | Naive Self-Generating Agent | Self-Forging AI (Our Project) |
|---|---|---|---|
| **Tool Availability** | Pre-programmed only | Generates code on prompt | Generates, reuses, and repairs dynamic MCP tools |
| **Verification Gate** | Manual code review | None or simple execution | **Adversarial Edge-Case Pytest Suite + AST Profiling** |
| **Tool Reuse Policy** | Static invocation | Direct call without checks | **Novel Dual-Gate Re-evaluation on every reuse** |
| **Search Mechanism** | Basic string match | Dense embeddings only | **Novel 3-Signal Hybrid Search (Intent + Structure + Reliability)** |
| **Safety Assurance** | Controlled environment | High risk of arbitrary code execution | **100% AST Security Catch Rate + Container Isolation** |
| **Observability** | Standard server logs | Opaque terminal output | **User-scoped WebSocket stream & Deep Trace Inspector** |

---

## 5. Target Audience & Use Cases

1. **CS Researchers & AI Engineers**: Studying autonomous software synthesis, continuous validation algorithms, and safe agent execution.
2. **Data Analysts & Scientists**: Uploading complex financial/scientific documents (PDF, CSV, JSON) and requesting calculations that require dynamic algorithms without manual script writing.
3. **Enterprise Automation**: Teams needing an intelligent agent that continuously expands its own internal API toolkit while guaranteeing strict multi-tenant boundaries and auditability.

<!-- FILE END: context/01_PROJECT_VISION_AND_PROBLEM_STATEMENT.md -->


================================================================================

<!-- FILE START: context/02_ARCHITECTURE_AND_SYSTEM_DESIGN.md -->

# 02. Architecture & System Design

## 1. High-Level System Architecture

The Self-Forging AI platform consists of six distinct, decoupled architectural tiers:
1. **Presentation Tier (React 19 + Vite)**: Glassmorphic, mobile-responsive SPA with real-time WebSocket telemetry.
2. **API & Orchestration Gateway (FastAPI)**: Async REST endpoints, JWT/OAuth authentication, and session handling.
3. **Agent State Machine (LangGraph)**: Cyclic multi-agent graph directing tool detection, code generation, testing, and self-repair.
4. **Isolated Execution Sandbox (Docker Engine)**: Ephemeral, unprivileged Linux containers enforcing resource limits and security boundaries.
5. **Persistence & Cache Tier (PostgreSQL 16 + In-Memory Registry)**: Multi-tenant relational storage with on-demand Python bytecode hot-swapping.
6. **Object Storage Tier (MinIO S3)**: Distributed S3-compatible storage for user attachments and zipped tool archives.

```
                           ┌─────────────────────────────────────────┐
                           │      Client Frontend (React 19 + Vite)  │
                           │  - Conversation Chat & Markdown Stream  │
                           │  - Real-Time WebSocket Activity Drawer   │
                           │  - Tool Registry & .sfatool Marketplace │
                           │  - Dynamic Model Selector (Haiku, etc.) │
                           └──────────────────┬──────────────────────┘
                                              │ HTTP / WS
                                              ▼
                           ┌─────────────────────────────────────────┐
                           │      FastAPI Backend Gateway (Port 8000)│
                           │  - JWT Dual-Token & OAuth2 Auth        │
                           │  - Multi-Tenant Row-Level Scoping      │
                           │  - Document Extractor (PDF/CSV/JSON)    │
                           │  - WebSocket Lifecycle Broadcaster      │
                           └──────────────────┬──────────────────────┘
                                              │
                      ┌───────────────────────┴────────────────────────┐
                      ▼                                                ▼
         ┌─────────────────────────┐                     ┌─────────────────────────┐
         │ LangGraph Agent Machine │                     │ Multi-Tenant Storage    │
         │ - Core Node (Router)    │                     │ - PostgreSQL 16 (Port 5432)
         │ - Forge Node (Codegen)  │                     │   (Tools, Users, Logs)  │
         │ - Tester Node (Pytest)  │                     │ - MinIO S3 (Port 9000)  │
         │ - Verify Node (Gate)    │                     │   (Documents, Archives) │
         │ - Repair Node (Fixer)   │                     └─────────────────────────┘
         │ - Register Node (MCP)   │
         │ - Runtime Exec (Runner) │
         └────────────┬────────────┘
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
┌─────────────────────────┐  ┌─────────────────────────────────────────┐
│ Isolated Docker Sandbox │  │ External LLM Routing Mesh               │
│ - Base: sfa-sandbox     │  │ - OmniRoute Proxy Gateway (Port 20128)  │
│ - Strict AST Profiler   │  │ - Anthropic (Claude 3.5 Haiku / Sonnet) │
│ - 512MB RAM, 60s timeout│  │ - OpenAI (GPT-4o) / DeepSeek V3 / Groq  │
│ - Network: "none"       │  │ - Autonomous Web Research (DuckDuckGo)  │
└─────────────────────────┘  └─────────────────────────────────────────┘
```

---

## 2. End-to-End Execution Lifecycles

### 2.1 Cold Tool Synthesis Flow (New Capability Needed)
When the user submits a task requiring computational, algorithmic, or data transformations not present in the registry:

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Client UI)
    participant Core as Core Node
    participant Search as Hybrid Tool Searcher
    participant Forge as Forge Node
    participant Research as Web Research Engine
    participant Tester as Adversarial Tester
    participant Verify as Verify Node (Sandbox)
    participant Register as Register Node
    participant MCP as Dynamic MCP Registry
    participant Exec as Runtime Executor

    User->>Core: "Calculate the 35th Fibonacci number"
    Core->>Search: Query user tool registry
    Search-->>Core: No match found (Score < 0.65)
    Core->>Forge: Tool needed: missing_capability="calculate_fibonacci"
    opt External Research Required
        Forge->>Research: Query technical docs & API specifications
        Research-->>Forge: Return code patterns & edge cases
    end
    Forge->>Tester: Synthesized Python script (def execute(n: int))
    Tester->>Verify: 3-5 Adversarial Edge-Case Pytest functions
    Verify->>Verify: Pass 1: AST Static Security Profiler check
    Verify->>Verify: Pass 2: Docker Container ephemeral execution
    Verify-->>Register: Tests PASSED (0 regressions, 0 security errors)
    Register->>Register: Persist tool record into PostgreSQL 16
    Register->>MCP: Hot-swap compiled callable into memory cache
    Register->>Core: Tool active (registered_tool_id="calculate_fibonacci")
    Core->>Exec: Extract arguments from prompt & invoke execute(n=35)
    Exec-->>Core: Tool execution result: 9,227,465
    Core-->>User: Final grounded natural language answer
```

---

### 2.2 Fast-Path Tool Reuse Flow (Novel Dual-Gate Admission)
When the user subsequently requests an operation matching an existing tool (e.g., *"Now calculate the 45th Fibonacci number"*):

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Client UI)
    participant Core as Core Node
    participant Search as Hybrid Tool Searcher
    participant Gate1 as Gate 1: Semantic & AST Profiler
    participant Gate2 as Gate 2: Sandbox Regression
    participant MCP as Dynamic MCP Registry
    participant Exec as Runtime Executor

    User->>Core: "Now calculate the 45th Fibonacci number"
    Core->>Search: Hybrid Search (Intent + Structure + Reliability)
    Search-->>Core: Match found: 'calculate_fibonacci' (Score: 0.94)
    Note over Core,Gate1: Dual-Gate Re-Evaluation Commences
    Core->>Gate1: Evaluate schema compatibility & AST security
    Gate1-->>Core: Gate 1 Admitted (Valid parameters, 0 banned modules)
    Core->>Gate2: Run cached adversarial regression tests in sandbox
    Gate2-->>Core: Gate 2 Admitted (Pytest suite passed)
    Note over Core,MCP: Tool Qualified for Runtime Reuse
    Core->>MCP: Retrieve compiled in-memory callable
    Core->>Exec: Extract parameters: {"n": 45} & execute callable
    Exec-->>Core: Result: 1,134,903,170 (Latency: < 50ms)
    Core-->>User: Grounded answer delivered (4000x speedup vs cold forge)
```

---

### 2.3 The Self-Repair Loop Flow
If the generated tool fails adversarial sandbox verification:

```mermaid
stateDiagram-v2
    [*] --> ForgeNode: Synthesize Initial Code
    ForgeNode --> TesterNode: Generate Adversarial Tests
    TesterNode --> VerifyNode: Execute in Sandbox
    
    state VerifyNode {
        [*] --> ASTCheck
        ASTCheck --> DockerRun: Security Passed
        ASTCheck --> SecurityViolation: Banned Import/Call
        DockerRun --> PytestPassed: Exit Code 0
        DockerRun --> PytestFailed: AssertionError/Exception
    }

    VerifyNode --> RegisterNode: All Tests Passed
    VerifyNode --> RepairNode: Pytest Failed (Attempts < 3)
    VerifyNode --> TesterNode: Test Security Rejected (Attempts < 2)
    VerifyNode --> EndFailure: Infra Error or Max Attempts Exceeded

    state RepairNode {
        [*] --> ErrorDiagnosis
        ErrorDiagnosis --> WebResearch: Query DuckDuckGo for StackTrace
        WebResearch --> PatchSynthesis: Synthesize Fix
        PatchSynthesis --> [*]
    }

    RepairNode --> VerifyNode: Re-test Repaired Code
    RegisterNode --> [*]
    EndFailure --> [*]
```

---

## 3. Component Deep Dive

### 3.1 Backend Gateway (FastAPI)
The backend gateway handles all incoming network traffic:
* **Stateless Token Verification**: Verifies JWT access tokens (15-minute lifespan) on every authenticated endpoint.
* **Database Session Scoping**: Uses SQLAlchemy 2.0 `async_sessionmaker` yielding isolated database transactions.
* **WebSocket Connection Hub**: Manages bidirectional real-time event distribution with per-connection output queues and timeout-guarded message broadcasts.
* **Safe Error Handling**: Converts internal domain exceptions into clean HTTP status codes (400, 401, 403, 404, 422) with machine-readable detail messages.

### 3.2 Dynamic In-Memory MCP Registry
Traditional Python applications require a process restart or complex `importlib.reload` mechanics to load newly written Python code. 
The Self-Forging AI platform implements a **Multi-Tenant In-Memory Dynamic Registry** (`registry/mcp_manager.py`):
1. **Isolated Namespaces**: Stored in a nested dictionary `_user_registries[user_id][tool_id]`.
2. **Safe Compilation**: Uses Python's `compile(code, f"<dynamic_{name}>", "exec")` within a restricted local namespace dictionary.
3. **Callable Extraction**: Extracts the top-level `execute` function and binds it as an asynchronous callable.
4. **On-Demand Rehydration**: If a worker process restarts, any active tool is lazily rehydrated from PostgreSQL on its very first invocation.

### 3.3 Docker Sandbox Security Barrier
The untrusted code execution environment runs inside Docker:
* **Pre-Cached Image (`sfa-sandbox:latest`)**: Pre-installs `pytest`, `pydantic`, `numpy`, `scipy`, and standard libraries, reducing test startup latency from 30s to under 500ms.
* **Ephemeral Workspaces**: Each test execution creates a unique temporary directory mounted into the container at `/workspace`.
* **Zero Network Access**: `network_mode="none"` guarantees that untrusted code cannot connect to the internet, open reverse shells, or exfiltrate environment variables.
* **Strict Cgroups Limits**: 512MB RAM cap prevents memory exhaustion; 60s hard timeout kills infinite loops or fork bombs.

---

## 4. Multi-Tenant Data Isolation Strategy

Data isolation is enforced at four distinct levels:
1. **Database Schema**: All sensitive tables (`tools`, `conversations`, `activity_logs`, `conversation_attachments`, `user_sessions`) enforce foreign keys with `ondelete="CASCADE"` tied to `users.id`.
2. **Route Dependency Injection**: Every protected FastAPI route injects `user: User = Depends(get_current_user)`. Queries unconditionally filter by `where(Model.user_id == user.id)`.
3. **In-Memory Cache Keying**: The dynamic MCP registry indexes all compiled functions under `user_id`. An attacker attempting to call `execute_tool(user_id="user_b", tool_id="tool_of_user_a")` triggers a tenant violation and is rejected.
4. **MinIO S3 Key Prefixing**: Uploaded files and tool archives are keyed as:
   `user-documents/{user_id}/{conversation_id}/{uuid}_{filename}`.

<!-- FILE END: context/02_ARCHITECTURE_AND_SYSTEM_DESIGN.md -->


================================================================================

<!-- FILE START: context/03_LANGGRAPH_AGENT_PIPELINE.md -->

# 03. LangGraph Agent Pipeline Deep Dive

## 1. Overview of the State Machine

The core intelligence and self-forging capabilities of the system are implemented as a cyclic state machine using **LangGraph** (`backend/agents/graph.py`). Unlike sequential or linear chains (e.g. LangChain SequentialChain), a cyclic graph allows the agent to iteratively loop between code generation, testing, error research, and code repair until the software artifact passes verification.

---

## 2. Agent State Schema (`AgentState`)

All nodes in the graph communicate by reading and mutating a shared state dictionary defined in `backend/agents/state.py`:

```python
class AgentState(TypedDict):
    # Conversational & Session Context
    messages: list[Any]                 # Raw conversational message objects
    task: str                           # Normalized task prompt
    user_id: Optional[str]              # Tenant user ID for multi-tenant isolation
    session_id: Optional[str]           # Active conversation or trace ID
    model: Optional[str]                # Dynamic model identifier (e.g. haiku, sonnet, gpt-4o)
    document_context: Optional[str]     # In-memory text extracted from attached files

    # Forging & Code Generation State
    missing_capability: str             # Non-empty string if tool forging is needed
    generated_code: str                 # Synthesized Python script containing execute()
    generated_schema: dict              # JSON Schema describing execute() parameter types
    documentation_context: Optional[str]# Real-time web research retrieved for the task

    # Testing & Verification State
    adversarial_tests: str              # Synthesized Pytest suite containing 3-5 edge case tests
    tests_passed: bool                  # True if pytest exited with exit code 0
    sandbox_results: str                # Stdout, stderr, and failure trace from Docker sandbox
    sandbox_error: bool                 # True if Docker daemon or host infrastructure failed
    test_security_rejected: bool        # True if generated test violated AST profiler rules
    test_suite_missing: bool            # True if test generation failed to produce def test_*

    # Self-Repair State
    repair_attempts: int                # Counter tracking code repair iterations (max 3)
    test_repair_attempts: int           # Counter tracking test generation retries (max 2)

    # Registration & Runtime Execution State
    is_registered: bool                 # Set to True once tool is persisted in PostgreSQL
    registered_tool_id: Optional[str]   # UUID of newly registered tool
    tool_arguments: Optional[dict]      # Extracted kwargs for runtime tool execution
```

---

## 3. Node-by-Node Detailed Breakdown

### 3.1 Core Node (`core_node`) — Intent Routing & Decision Engine
* **Source File**: `backend/agents/nodes/core.py`
* **Purpose**: Serves as the primary entry point for every user request. Evaluates whether the request is a simple conversational query, can be answered by an existing tool in the registry, or requires forging a new tool.
* **Key Mechanisms**:
  1. **Prompt Isolation**: Isolates the newest user prompt from dirty conversation history using `_extract_user_prompt()`. This guarantees that previous assistant prose does not contaminate the LLM's strict JSON output contract.
  2. **Mandatory Computational Rule**: Enforces:
     > *"If the user asks for ANY mathematical calculation, formula, sequence (e.g. Fibonacci, prime numbers, factorials, powers, statistics), algorithm, sorting, data transformation, or unit conversion, you MUST set `is_tool_needed: true`. NEVER calculate math or sequences in your head."*
  3. **Resilient Keyword Fallback**: If an LLM ever outputs conversational text rather than valid JSON, `core_node` checks for computational keywords (`fibonacci`, `calculate`, `algorithm`, `prime`, `factorial`, `convert`, `sort`, `tool`). If detected, it automatically forces `is_tool_needed: true` with an inferred capability description, preventing any `Error parsing reasoning` crash.
  4. **Hybrid Tool Search Dispatch**: Checks PostgreSQL via `HybridToolSearcher.search()`. If a matching tool is found (Score $\ge 0.65$), it invokes the **Dual-Gate Admission Engine**.
  5. **Post-Registration Execution**: If `state.get("is_registered")` is True, delegates to `runtime_exec.py` to run the tool and ground the final response.

---

### 3.2 Forge Node (`forge_node`) — Autonomous Tool Synthesizer
* **Source File**: `backend/agents/nodes/forge.py`
* **Purpose**: Synthesizes clean, secure Python code implementing the requested missing capability along with its corresponding JSON parameter schema.
* **Key Mechanisms**:
  1. **Autonomous Web Research Context**: If the user task references unfamiliar external APIs, complex math, or specific libraries, the `ResearchEngine` runs a background query and injects verified documentation snippets into the forge prompt.
  2. **Standardized Entrypoint**: Strictly mandates the `def execute(**kwargs)` function signature:
     ```python
     def execute(n: int) -> int:
         # Pure computational algorithm
         ...
         return result
     ```
  3. **Structured JSON Output**: Uses `extract_json_from_text` to extract both `python_code` and `parameters_schema`.

---

### 3.3 Tester Node (`tester_node`) — Adversarial Edge-Case Generator
* **Source File**: `backend/agents/nodes/tester.py`
* **Purpose**: Generates an isolated Pytest file containing 3 to 5 edge-case tests designed ruthlessly to break the synthesized code before it ever touches production.
* **Adversarial Rules**:
  * Tests boundary conditions (e.g. $N=0$, negative numbers, very large values).
  * Tests type deviations (strings passed to numeric functions, floating point inputs).
  * Imports the code as a module: `from generated_tool import execute`.
  * **Strict Isolation**: Allowed to import *only* `pytest`, `generated_tool`, and safe computational libraries (`math`, `re`, `json`, `datetime`, `decimal`, `statistics`). Banned from importing `os`, `sys`, `socket`, `subprocess`, or file I/O modules.

---

### 3.4 Verify Node (`verify_node`) — The Sandbox Gate
* **Source File**: `backend/agents/graph.py`
* **Purpose**: Executes the adversarial test suite against the forged code inside an isolated Docker sandbox.
* **Three-Step Verification Pipeline**:
  1. **AST Static Security Check**: Runs `check_security(code)` and `check_security(tests)`. Rejects any code with banned imports or dangerous AST nodes before starting a container.
  2. **Test Function Validation**: Ensures the test string contains at least one runnable pytest function (`def test_*`).
  3. **Containerized Execution**: Invokes `execute_in_sandbox()` via `asyncio.to_thread()`, spinning up an isolated container from `sfa-sandbox:latest` with `/workspace` mounted.
  4. **Error Classification**: Distinguishes between **Infrastructure Errors** (Docker daemon down, out of disk) and **Code Failures** (AssertionError, ValueError). Infrastructure errors abort immediately (`end_failure`) to prevent wasting LLM tokens on broken hosts.

---

### 3.5 Repair Node (`repair_node`) — Autonomous Bug Doctor
* **Source File**: `backend/agents/nodes/repair.py`
* **Purpose**: If adversarial tests fail, the repair node analyzes the Pytest failure trace and autonomously generates a patched version of the code.
* **Key Mechanisms**:
  1. **Stack Trace Web Research**: Calls `ResearchEngine.research_error(errors, code)`. If the error is a known library quirk or algorithmic failure, DuckDuckGo searches retrieve diagnostic advice.
  2. **Signature Preservation**: Strictly instructs the LLM to preserve the original `def execute()` parameter signature so existing callers and schemas remain compatible.
  3. **Loop Bounding**: Limits repairs to a maximum of 3 iterations. If the code still fails after 3 repair attempts, the pipeline halts gracefully.

---

### 3.6 Register Node (`register_node`) — Dynamic MCP Hot-Swapping
* **Source File**: `backend/agents/nodes/register.py`
* **Purpose**: Persists verified tools and immediately exposes them to the active agent environment without server restarts.
* **Key Mechanisms**:
  1. **Database Persistence**: Writes tool metadata (`name`, `description`, `code`, `schema_json`, `tests_code`, `gate_score=0.90`) to PostgreSQL 16.
  2. **In-Memory Dynamic Hot-Swapping**: Calls `dynamic_mcp_registry.register_dynamic_tool()`:
     * Compiles the code using `compile(code, f"<dynamic_{name}>", "exec")`.
     * Caches the executable function in memory under `_user_registries[user_id][tool_id]`.
  3. **Graph Loopback**: Routes back to `core_node` with `is_registered=True` so the newly forged tool can immediately execute to satisfy the user's initiating prompt.

---

### 3.7 Runtime Execution Helper (`handle_runtime_execution`)
* **Source File**: `backend/agents/nodes/runtime_exec.py`
* **Purpose**: Executes the newly forged or reused tool to formulate the final grounded natural language answer.
* **Three-Step Execution**:
  1. **Argument Extraction**: Uses `extract_tool_arguments()` grounded in the tool's JSON schema to infer exact keyword arguments from the user's prompt.
  2. **Timeout-Guarded Invocation**: Invokes `execute_tool()` with a 15-second execution timeout. Supports both synchronous and asynchronous functions.
  3. **Grounded Response Formulation**: Feeds the real computed execution result into the LLM system prompt to generate a concise, human-friendly explanation containing the exact mathematical or algorithmic output.

<!-- FILE END: context/03_LANGGRAPH_AGENT_PIPELINE.md -->


================================================================================

<!-- FILE START: context/04_PATENT_ALGORITHMS_DUAL_GATE_AND_HYBRID_SEARCH.md -->

# 04. Patent Algorithms: Dual-Gate & Hybrid Tool Search

## 1. Introduction & Academic Novelty

A critical vulnerability in autonomous self-programming agent architectures is the **"Registration-Only" Fallacy**: existing systems (e.g. Voyager, ToolCoder, Cradle) execute unit tests on a synthesized tool *once* during registration. If the tool passes, it is stamped as permanently reliable and stored in a static database.

In real-world deployment, this assumption collapses due to:
1. **Parameter Boundary Shift**: A tool generated for small inputs ($N=10$) is invoked with inputs that trigger stack overflow or timeout ($N=1000$).
2. **Schema Drift**: Subsequent agent turns pass unexpected property structures.
3. **Environment Volatility**: Under-the-hood dependencies, system time, or host behavior shift.

To address these vulnerabilities, this project introduces two novel algorithms designed from scratch:
* **The Dual-Gate Admission Algorithm (Patent Focus)**: A continuous qualification framework that re-evaluates both safety and functional regression on **every reuse**, dynamically adjusting tool reliability scores and automatically quarantining degraded tools.
* **The 3-Signal Hybrid Tool Search Algorithm**: A context-aware search engine combining semantic intent coverage, schema structural compatibility, and Bayesian performance reliability.

---

## 2. The Dual-Gate Admission Algorithm (Patent Focus)

The Dual-Gate Engine (`backend/agents/evaluation/dual_gate.py`) acts as a runtime gatekeeper. When a tool in the registry is identified as a candidate match for a user prompt, it cannot execute until it satisfies both gates:

```
Candidate Tool Matched
         │
         ▼
┌──────────────────────────────────────────────┐
│ Gate 1: Semantic & Structural Admission      │
│ - Validate required parameter presence       │
│ - Run AST Static Security Profiler           │
│ - Reject banned modules & dangerous calls    │
└──────────────────────┬───────────────────────┘
                       │ Admitted
                       ▼
┌──────────────────────────────────────────────┐
│ Gate 2: Sandbox Regression Verification      │
│ - Execute cached adversarial test suite      │
│   in isolated Docker sandbox                 │
│ - Verify 0 regressions on original logic     │
└──────────────────────┬───────────────────────┘
                       │ Admitted
                       ▼
┌──────────────────────────────────────────────┐
│ Promote Metrics & Grant Execution            │
│ - Increment reuse_count                      │
│ - Update last_used_at timestamp              │
│ - Confirm 'active' status                    │
│ - Dispatch compiled callable to Runtime Exec │
└──────────────────────────────────────────────┘
```

---

### 2.1 Gate 1: Semantic & Structural Schema Matching
* **Implementation**: `backend/agents/evaluation/gate_one.py` (`evaluate_effectiveness()`)
* **Checks Executed**:
  1. **Required Parameter Completeness**: Compares incoming extracted arguments against `schema.get("required", [])`. If required arguments are missing, Gate 1 rejects execution with a non-penalizing message so the agent can ask for clarification or forge an alternative.
  2. **Static AST Security Profiler Check**: Parses both the tool code and stored test suite through `check_security(code)`:
     * Disallows banned modules (`os`, `sys`, `socket`, `subprocess`, `pickle`, `ctypes`).
     * Disallows banned calls (`eval`, `exec`, `open`, `__import__`).
     * Disallows private dunder traversal (`__subclasses__`, `__globals__`).
  3. **Score Calculation**: Returns an effectiveness score $S_{\text{eff}} \in [0.0, 1.0]$ and an admissibility boolean.

---

### 2.2 Gate 2: Lightweight Sandbox Regression Verification
* **Implementation**: `backend/agents/evaluation/gate_two.py` (`evaluate_regression()`)
* **Checks Executed**:
  1. **Isolated Execution**: Spins up an ephemeral Docker container using `sfa-sandbox:latest`.
  2. **Regression Assertion**: Mounts the tool code alongside its previously passed adversarial test suite and runs `pytest`.
  3. **Infrastructure Guard**: If the Docker daemon fails or host resources are exhausted, Gate 2 flags an `INFRASTRUCTURE_FAILURE` and safely aborts reuse *without* decaying the tool's historical quality score.
  4. **Functional Regression**: If the tool fails its own original test suite (e.g. Due to an unhandled runtime error), it is flagged as a genuine regression.

---

### 2.3 Dynamic Bayesian Score Decay & Quarantine State Machine

Tools in PostgreSQL maintain a floating-point **`gate_score`** initialized to `0.90`. On every reuse attempt, the score dynamically updates:

#### Penalty on Gate 1 Failure (Security Violation or Misalignment):
$$\text{gate\_score}_{\text{new}} = \max\left(0.0, \, 0.70 \times \text{gate\_score}_{\text{initial}} + 0.30 \times S_{\text{eff}}\right)$$

#### Severe Penalty on Gate 2 Failure (Functional Regression):
$$\text{gate\_score}_{\text{new}} = \max\left(0.0, \, 0.60 \times \text{gate\_score}_{\text{initial}}\right)$$

#### Quarantine State Machine:
* **Active Status (`gate_score` $\ge 0.65$)**: Tool is healthy and eligible for fast-path reuse.
* **Degraded Status ($0.40 \le \text{gate\_score} < 0.65$)**: Tool is flagged for review; hybrid search applies a penalty to its ranking.
* **Quarantined Status (`gate_score` $< 0.40$)**: The tool is immediately locked. `HybridToolSearcher` will never return quarantined tools to the agent, completely preventing corrupted or unsafe code from running.

---

## 3. The 3-Signal Hybrid Tool Search Algorithm

Traditional tool-calling systems rely either on simple keyword matching (which misses semantic synonyms) or pure vector embeddings (which suffer from "semantic blindness" to parameter requirements and historical error rates).

We formulated a novel **3-Signal Hybrid Tool Search Algorithm** (`backend/agents/search/hybrid_search.py`):

$$\text{Score} = w_{\text{intent}} \cdot S_{\text{intent}} + w_{\text{struct}} \cdot S_{\text{struct}} + w_{\text{perf}} \cdot S_{\text{perf}}$$

Where default weights are calibrated as:
* $w_{\text{intent}} = 0.50$ (Contextual Semantic Intent)
* $w_{\text{struct}} = 0.35$ (Structural Schema Compatibility)
* $w_{\text{perf}} = 0.15$ (Bayesian Historical Reliability)
* Candidate Admission Threshold: $\text{Score} \ge 0.65$

---

### 3.1 Signal 1: Contextual Semantic Intent Score ($S_{\text{intent}}$)
Measures how closely the user's conversational intent matches the tool's functional identity:

$$S_{\text{intent}} = 0.50 \cdot C_{\text{tokens}} + 0.30 \cdot C_{\text{ngrams}} + 0.20 \cdot M_{\text{name}}$$

1. **Token Coverage ($C_{\text{tokens}}$)**: Proportion of non-stopword query tokens matching tool name and description tokens with hyphen/underscore normalization and stemming.
2. **Character 3-Gram Coverage ($C_{\text{ngrams}}$)**: Captures sub-word morphological patterns (e.g., matching "fib" in "fibonacci"):
   $$C_{\text{ngrams}} = \frac{|\text{ngrams}(\text{query}) \cap \text{ngrams}(\text{tool})|}{|\text{ngrams}(\text{query})|}$$
3. **Direct Name Match Bonus ($M_{\text{name}}$)**: $1.0$ if normalized tool name is contained within the query; otherwise, ratio of matched underscore-separated name parts.

---

### 3.2 Signal 2: Structural Schema Compatibility ($S_{\text{struct}}$)
Evaluates whether the user's prompt actually contains the necessary arguments expected by the tool's parameter signature:

$$S_{\text{struct}} = \frac{\text{matched\_parameters} + 1.0}{\text{total\_parameters} + 1.0}$$

* Employs **Laplace smoothing** to avoid zero-probability collapse on zero-parameter tools.
* A tool with parameters `[n]` receives a higher score when the prompt contains numbers or words indicating $n$.

---

### 3.3 Signal 3: Bayesian Performance Prior ($S_{\text{perf}}$)
Prevents newly minted, unproven tools from outranking established, battle-tested tools with proven track records:

$$S_{\text{perf}} = \text{gate\_score} \cdot (0.75 + 0.25 \cdot R)$$

Where the Reliability Growth factor $R$ is formulated as a monotonic logarithmic function:

$$R = 1.0 - \frac{1}{1 + \ln(1 + \text{reuse\_count})}$$

* When $\text{reuse\_count} = 0$, $R = 0.0 \implies S_{\text{perf}} = 0.75 \times \text{gate\_score}$.
* As $\text{reuse\_count} \to \infty$, $R \to 1.0 \implies S_{\text{perf}} = 1.00 \times \text{gate\_score}$.
* Heavily reused tools with high gate scores gain a substantial, justifiable ranking advantage.

---

## 4. Autonomous Web Research Engine (`agents/research/`)

When synthesizing unfamiliar tools or repairing complex compiler errors, LLMs often hallucinate outdated API methods or incorrect mathematical parameters.

The **Research Engine** (`backend/agents/research/engine.py`):
1. **Zero-API-Key Web Queries**: Queries DuckDuckGo HTML endpoints via `http_client.py` using rotated user-agents.
2. **Automated Error Diagnosis**: When Pytest throws an exception (e.g. `TypeError: unsupported operand type`), `ResearchEngine.research_error()` extracts the error signature, queries developer documentation, and injects actionable repair guidance directly into the repair prompt.
3. **Rate Limiting & Safety**: Enforces a 10-second timeout and 3-result maximum to ensure agent latency remains fast and deterministic.

<!-- FILE END: context/04_PATENT_ALGORITHMS_DUAL_GATE_AND_HYBRID_SEARCH.md -->


================================================================================

<!-- FILE START: context/05_BACKEND_API_AND_SECURITY.md -->

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

<!-- FILE END: context/05_BACKEND_API_AND_SECURITY.md -->


================================================================================

<!-- FILE START: context/06_FRONTEND_ARCHITECTURE_AND_UX.md -->

# 06. Frontend Architecture & User Experience (UX)

## 1. Frontend Technology Stack & Aesthetic Philosophy

The client interface is built as a responsive Single Page Application (SPA):
* **Framework**: React 19 (Hooks, Concurrent Mode)
* **Build Tool**: Vite 6 (sub-second HMR, optimized asset chunking)
* **Styling**: Tailwind CSS with custom design tokens
* **Typography & Icons**: Inter Font & Google Material Symbols Outlined
* **Audio & Visual Feedback**: Canvas Confetti for verified tool forge celebrations
* **HTTP & WebSocket Client**: Centralized `api.js` client with automatic silent token refresh

### Design Aesthetics: Dark Glassmorphism
The interface implements a cohesive dark glassmorphic design system:
* Curated HSL color palette avoiding plain RGB primitives: deep obsidian backgrounds (`#0B0F17`), translucent surface cards (`bg-surface-container-low/70` with `backdrop-blur-md`), and emerald/indigo accent highlights.
* Subtle micro-animations on hover, active states, and drawer transitions.
* **Full Mobile Responsiveness**: Gracefully scales from mobile screens (320px) to ultra-wide displays without horizontal scrollbars or clipping.
* **Strict Code Quality Rule**: Every frontend file is strictly modularized to remain **under 250 lines of code**.

---

## 2. Component Hierarchy & File Structure

```
frontend/src/
├── App.jsx                     # Master application shell, router, and modal providers
├── config.js                   # Environment configuration (VITE_API_BASE_URL, DEFAULT_MODEL)
├── utils/
│   └── api.js                  # Centralized fetch wrapper, token refresh interceptor, auth helpers
├── components/
│   ├── Header.jsx              # Navigation header, model indicator, activity toggle, user profile
│   ├── Toast.jsx               # Non-blocking floating status notification
│   ├── CodeModal.jsx           # Monospace code viewer for inspecting synthesized tool scripts
│   ├── ModelModal.jsx          # Custom model text input & quick preset selector
│   ├── ActivityDrawer.jsx      # Slide-out drawer showing real-time agent reasoning steps
│   ├── LogTraceModal.jsx       # Deep execution trace inspector for audit logs
│   └── conversation/
│       ├── ConversationSidebar.jsx     # Collapsible ChatGPT-style conversation drawer
│       ├── ConversationItem.jsx        # Pinned & unpinned conversation list item with actions
│       ├── ChatArea.jsx                # Scrollable message feed and empty-state starters
│       ├── ChatMessage.jsx             # Markdown message bubble with tool execution badge
│       ├── ChatInput.jsx               # Textarea, file attachment trigger, and send button
│       ├── ForgeStateBanner.jsx        # Animated status bar (detecting -> forging -> testing -> verified)
│       ├── CodeArtifactCard.jsx        # Expandable code widget embedded within assistant replies
│       ├── EmptyChatStarters.jsx       # Quick starter suggestions for new users
│       ├── useConversationManager.js   # Master conversation state and chat orchestrator
│       ├── conversationCrud.js         # REST operations for conversation management
│       └── useConversationAttachments.js # Drag-and-drop S3 file upload hook
└── pages/
    ├── LoginPage.jsx           # Sign-in and sign-up with password validation & Google OAuth
    ├── ConversationPage.jsx    # Primary conversational workspace and tool forge environment
    ├── EcosystemToolsPage.jsx  # Per-user tool catalog, metrics, and .sfatool export/import
    ├── ActivityLogsPage.jsx    # Audit log table with deep execution trace inspection
    └── ApiSettingsPage.jsx     # Modular settings tabs for providers, sandbox, and MCP servers
```

---

## 3. Core State Management & Custom Hooks

### 3.1 Conversation Orchestrator (`useConversationManager.js`)
* **Auto-Creation**: If a user submits a prompt with no active conversation selected, a new conversation is automatically created in the background, titled using the first 36 characters of the user prompt.
* **Optimistic Rendering**: The user prompt and an animated AI loading placeholder are immediately appended to the message array for zero perceived latency.
* **Model Injection**: Reads the user's selected model (from React state or `localStorage.getItem('sfa_selected_model')`) and bundles it in the `/api/chat` payload.
* **Forge State Animation**: Detects `is_tool_forged` in the response and drives the visual `ForgeStateBanner` progression (`detecting` $\to$ `forging` $\to$ `testing` $\to$ `verified`), triggering celebratory confetti when tests pass.

---

### 3.2 Real-Time WebSocket Telemetry (`useActivityWebSocket.js`)
Connects to `ws://localhost:8000/ws/activity?token={access_token}`:
* **Resilient Connection Lifecycle**: Automatically re-establishes connection using exponential backoff (1s, 2s, 4s, 8s up to 30s) if the backend restarts.
* **Heartbeat Keepalive**: Transmits periodic ping frames to prevent corporate firewall timeouts.
* **Clean Cleanup**: Closes sockets cleanly on component unmount to eliminate memory leaks.
* **State Updates**: Ingests incoming agent lifecycle events and streams them directly into the slide-out **Activity Drawer**, allowing users to watch the agent think, forge code, and run tests in real time.

---

### 3.3 Document Attachments (`useConversationAttachments.js`)
* Supports multi-file drag-and-drop and native file picking.
* Validates file size (25MB cap) and file extensions (PDF, CSV, JSON, TXT, PY, MD).
* Streams the binary data to `/api/conversations/{id}/attachments` via `multipart/form-data`.
* Displays interactive attachment chips above the chat input with one-click deletion.

---

## 4. Key Interactive Modals & UX Innovations

### 4.1 Custom Model Selection (`ModelModal.jsx`)
Users can easily switch intelligence models without touching configuration files:
* **Custom Input Field**: A text input allowing the user to type **any arbitrary model string** (e.g. `claude-3-5-haiku-20241022`, `gpt-4o`, `deepseek-chat`, or `auto`).
* **One-Click Presets**: Quick-select chips for OmniRoute Auto, Claude 3.5 Haiku, Claude 3.7 Sonnet, GPT-4o, and DeepSeek V3.
* **Instant Persistence**: Automatically saves the selection to `localStorage` (`sfa_selected_model`) so page reloads retain the preferred model.

### 4.2 Tool Code Inspector (`CodeModal.jsx`)
When an assistant response indicates that a tool was synthesized or reused:
* A sleek "View Tool Code" chip appears inside the message bubble.
* Clicking opens `CodeModal`, presenting the raw, verified Python script with syntax highlighting, parameter schemas, and a one-click copy button.

### 4.3 Deep Trace Inspector (`LogTraceModal.jsx`)
Accessible via the **Activity Logs** page or the direct log shortcut in the conversation header:
* Shows complete audit logs for every forge, test, and repair attempt.
* Displays the initiating prompt, the generated code, the adversarial test suite, and the exact stdout/stderr logs produced by the Docker sandbox.

<!-- FILE END: context/06_FRONTEND_ARCHITECTURE_AND_UX.md -->


================================================================================

<!-- FILE START: context/07_INFRASTRUCTURE_DATABASE_AND_STORAGE.md -->

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

<!-- FILE END: context/07_INFRASTRUCTURE_DATABASE_AND_STORAGE.md -->


================================================================================

<!-- FILE START: context/08_EMPIRICAL_BENCHMARKS_AND_EVALUATION.md -->

# 08. Empirical Benchmarks & Testing Guide

## 1. Research Benchmark Suite Overview

To empirically validate the academic and patent claims of the **Dual-Gate Admission Algorithm**, we developed an automated 20-task research evaluation benchmark (`backend/benchmarks/benchmark_suite.py`).

### 1.1 Methodology
The benchmark suite compares two operational modes across identical prompts:
* **Mode A (Dual-Gate Enabled - Our System)**: Every tool reuse must pass Gate 1 (AST static security + parameter compatibility) and Gate 2 (lightweight sandbox regression).
* **Mode B (Bypassed Baseline - Prior Art)**: Simulates the standard "registration-only" approach of existing frameworks (Voyager, ToolCoder) where registered tools are invoked directly without continuous verification.

---

## 2. Benchmark Results & Key Performance Indicators (KPIs)

| Research Metric | Mode A (Dual-Gate Enabled) | Mode B (Bypassed Baseline) | Significance |
|---|---|---|---|
| **AST Security Catch Rate** | **100.0%** | 0.0% (No security check) | Completely prevents arbitrary code execution & socket exfiltration |
| **Regression Catch Rate** | **100.0%** | 0.0% (No regression check)| Eliminates silent logic degradation and parameter schema drift |
| **Gate Verification Rate** | **100.0%** | N/A (no gates) | Consistent admission across numeric, text, and data structures |
| **Average Gate Latency** | **663.7 ms** | 0.1 ms (Unchecked call) | Sub-second safety qualification overhead |
| **Tool Reuse Speedup** | **> 4,000x** | > 4,000x | Fast-path execution (<50ms) vs cold LLM synthesis (~15s) |

---

## 3. The 20 Standardized Benchmark Tasks

### 3.1 Cold Tool Synthesis (Tasks 1–10)
Demonstrates the agent's ability to forge clean, valid Python tools across diverse mathematical, algorithmic, and data domains:
1. `task_01`: **Compound Interest Calculator** (Financial exponentiation)
2. `task_02`: **Standard Deviation Compute** (Statistical variance)
3. `task_03`: **Word Frequency Tokenizer** (Text processing and punctuation handling)
4. `task_04`: **Haversine GPS Distance** (Trigonometric spherical distance calculation)
5. `task_05`: **Markdown Table Parser** (String parsing into structured JSON)
6. `task_06`: **HTML Injection Sanitizer** (Regex-based XSS defense)
7. `task_07`: **Base64 Payload Validator** (Binary decoding and integrity check)
8. `task_08`: **Hex to RGB Color Converter** (Bitwise hex string mapping)
9. `task_09`: **Matrix Transpose Operator** (2D array linear algebra)
10. `task_10`: **Roman Numeral Converter** (Bi-directional numeric numeral parsing)

### 3.2 Self-Repair Loop (Tasks 11–15)
Simulates buggy code and evaluates the agent's autonomous diagnosis and patching loop:
11. `task_11`: **Syntax Error Repair** (Missing colons and mismatched parentheses)
12. `task_12`: **Zero Division Guard Repair** (Handling boundary $N=0$ division)
13. `task_13`: **Type Boundary Repair** (Handling floating point and string types)
14. `task_14`: **Missing Import Repair** (Automatically identifying missing dependencies)
15. `task_15`: **Off-by-One Array Slice Repair** (Correcting boundary indexing errors)

### 3.3 Security & Regression Defenses (Tasks 16–20)
Tests the Dual-Gate's ability to block malicious and broken tools:
16. `task_16`: **OS System Payload Rejection** — Tool injecting `os.system("rm -rf /")` is caught by Gate 1 AST profiler (**100% blocked**).
17. `task_17`: **Eval/Exec Dynamic Injection** — Code attempting `eval()` execution is caught by Gate 1 AST profiler (**100% blocked**).
18. `task_18`: **Socket Network Exfiltration** — Code importing `socket` to open outbound ports is caught by Gate 1 AST profiler (**100% blocked**).
19. `task_19`: **Schema Missing Parameter** — Invocation missing required arguments is halted before container startup (**100% caught**).
20. `task_20`: **Regression Test Failure** — Tool with broken regression logic fails Gate 2 sandbox execution and is quarantined (**100% caught**).

---

## 4. Full Automated Test Suite (116 Tests)

The repository includes 116 automated pytest tests:
* `tests/test_auth.py`: Sign-up, login, dual-token JWT, Google OAuth, session revocation (9 tests).
* `tests/test_benchmarks.py`: 20-task benchmark framework execution (2 tests).
* `tests/test_conversations.py`: Conversation CRUD, title generation, cascading delete (6 tests).
* `tests/test_document_upload.py`: MinIO S3 upload, text extraction, context injection (6 tests).
* `tests/test_dual_gate.py`: Gate 1, Gate 2, Bayesian score decay, and quarantine states (6 tests).
* `tests/test_forge_execution.py`: Sync/async tool runner, timeouts, execution loop (8 tests).
* `tests/test_hybrid_search.py`: 3-signal scoring, name bonus, token coverage, and tool reuse (6 tests).
* `tests/test_infrastructure.py`: PostgreSQL 16 connection pool and MinIO bucket health (6 tests).
* `tests/test_json_parser.py`: Regex extraction from dirty LLM prose, markdown blocks (9 tests).
* `tests/test_multitenancy.py`: Strict cross-tenant isolation and 401 unauthenticated defenses (3 tests).
* `tests/test_observability_pipeline.py`: WebSocket event distribution and deep traces (5 tests).
* `tests/test_profiler.py`: AST static security profiler against all exploit vectors (20 tests).
* `tests/test_registry.py`: PostgreSQL tool persistence and .sfatool export/import (16 tests).
* `tests/test_sandbox.py`: Ephemeral Docker execution, resource limits, and error handling (5 tests).

---

## 5. Step-by-Step Operator & Demonstration Guide

### Demonstration Case 1: Pure Conversational Turn (No Tool Needed)
* **Prompt**: *"What are the primary advantages of an asynchronous ASGI architecture in Python?"*
* **Behavior**: `core_node` determines `is_tool_needed: false`. Returns direct conversational response without forging any tools or invoking Docker.

### Demonstration Case 2: Cold Tool Synthesis (Math / Algorithm)
* **Prompt**: *"Calculate the 35th Fibonacci number using an iterative algorithm."*
* **Behavior**:
  1. `core_node` triggers `is_tool_needed: true` with capability `calculate_fibonacci`.
  2. `forge_node` writes `def execute(n: int = 35): ...`.
  3. `tester_node` writes 3–5 edge case tests (`test_zero`, `test_one`, `test_large`).
  4. `verify_node` passes AST check and executes inside Docker (`sfa-sandbox:latest`).
  5. `register_node` saves tool to PostgreSQL and MCP memory.
  6. `runtime_exec` executes `execute(n=35)` and returns: **9,227,465**.
  7. Client displays animated Forge Banner, celebratory confetti, and a "View Tool Code" button.

### Demonstration Case 3: Fast-Path Tool Reuse via Dual-Gate
* **Prompt**: *"Now calculate the 45th Fibonacci number."*
* **Behavior**:
  1. `HybridToolSearcher` matches existing tool `calculate_fibonacci` (Score > 0.90).
  2. Gate 1 admits schema arguments `{ "n": 45 }`.
  3. Gate 2 verifies cached regression tests in Docker sandbox.
  4. Tool executes in **< 50ms** (vs 15s for re-synthesis).
  5. Returns grounded answer: **1,134,903,170**.

### Demonstration Case 4: Document Upload & Context Grounding
* **Action**: Drag and drop a CSV file containing monthly sales or financial metrics into the conversation.
* **Prompt**: *"Analyze this document and compute the total revenue and standard deviation across all quarters."*
* **Behavior**:
  1. Document bytes stream to MinIO `user-documents`.
  2. `storage/extractor.py` extracts text and injects it into `state["document_context"]`.
  3. Agent writes a tool parsing the extracted table, tests it, and computes exact revenue metrics without hallucination.

<!-- FILE END: context/08_EMPIRICAL_BENCHMARKS_AND_EVALUATION.md -->


---

# 09. Test Prompts & Live Verification Guide

This guide provides a curated collection of verified test prompts designed to showcase all major capabilities of the **Self-Forging AI Agent** platform:
1. **Cold Tool Synthesis** (automatic capability detection, AST safety scan, Docker sandbox verification, and dynamic DB registration).
2. **Fast-Path Tool Reuse** (instant tool match via 3-Signal Hybrid Search, Dual-Gate admission, and parameter extraction).
3. **Autonomous Self-Repair** (catching buggy code or failing assertions in sandbox, feeding error trace to repair node, and re-verifying).
4. **Document-Grounded Forging** (attaching user files to ground custom tools).

---

## 🚀 Pre-Flight Checklist: Starting the Stack

1. **Launch the Stack**:
   Run the one-click startup script from the project root:
   ```cmd
   run.bat
   ```
2. **Access the Web Interface**:
   - Open your browser to: [**http://localhost:5173**](http://localhost:5173)
   - Ensure the backend is reachable at [**http://localhost:8000/health**](http://localhost:8000/health)
3. **Select Active Model**:
   - In the top header bar, click the **Model Badge** (default is `auto`).
   - You can leave it on `auto` or select `auto/claude-haiku` for fast, cost-effective tool synthesis.

---

## 🧪 Scenario 1: The Gold Standard (Cold Forge &rarr; Fast-Path Reuse)

*This two-turn conversation demonstrates the core lifecycle: initial synthesis from scratch followed by sub-second tool reuse on Turn 2.*

### Turn 1: Cold Tool Synthesis
**Prompt to Copy & Paste:**
```text
Calculate the 35th Fibonacci number using an iterative algorithm.
```

**Expected Agent Behavior:**
1. **Detection**: `core_node` detects that the prompt requires mathematical/algorithmic computation and flags `is_tool_needed: true` with missing capability: `"A Python function that computes the nth Fibonacci number using an iterative algorithm"`.
2. **Tool Forge**: `forge_node` writes `execute(n: int = 35) -> int` and generates its JSON Schema.
3. **Adversarial Pytest**: `tester_node` generates 5 adversarial test cases (base cases, large n, invalid types).
4. **Docker Sandbox**: `verify_node` runs the code inside `sfa-sandbox:latest` with network disabled.
5. **Registration**: Once tests pass, `register_node` stores the code in PostgreSQL and archives it in MinIO S3.
6. **Execution & Grounding**: `handle_runtime_execution` executes the tool in the sandbox and replies:
   > *"The 35th Fibonacci number is **9,227,465**."*
7. **UI Visuals**: You will see a glowing **"Forged New Tool"** badge on the message. Clicking it opens the Tool Drawer showing the Python code, JSON schema, and execution metrics.

---

### Turn 2: Fast-Path Tool Reuse
*In the exact same conversation thread, immediately send:*

**Prompt to Copy & Paste:**
```text
Now calculate the 45th Fibonacci number.
```

**Expected Agent Behavior:**
1. **Hybrid Search**: `core_node` executes the 3-Signal Hybrid Tool Search across the user's tool registry. It finds `FibonacciTool` with high semantic and structural similarity ($S > 0.65$).
2. **Dual-Gate Admission**:
   - **Gate 1**: Re-scans the AST for malicious imports.
   - **Gate 2**: Runs a fast sandbox evaluation.
3. **Execution**: The tool is admitted and executed with parameter `{"n": 44}` or `{"n": 45}` in **~0.3s** (bypassing the 15-20s forge pipeline).
4. **Agent Reply**:
   > *"The 45th Fibonacci number is **701,408,733** (or 1,134,903,170)."*
5. **UI Visuals**: A distinct **"Reused Tool: FibonacciTool"** badge appears, demonstrating the 4000x cost and latency savings of the registry.

---

## 🧮 Scenario 2: Number Theory & Algorithmic Computation

*LLMs typically hallucinate when computing prime factors or large divisors mentally. This prompt forces the agent to synthesize an algorithmic tool.*

**Prompt to Copy & Paste:**
```text
Find the prime factorization, distinct prime factors, and total count of divisors for 49,500.
```

**Expected Agent Behavior:**
- **Synthesized Function**: `execute(n: int = 49500) -> dict`
- **Output Data**:
  ```json
  {
    "number": 49500,
    "factors": [2, 2, 3, 3, 5, 5, 5, 11],
    "distinct_factors": [2, 3, 5, 11],
    "divisor_count": 36
  }
  ```
- **Grounding**: The agent gives the exact mathematical breakdown without mental math errors.

---

## 🔐 Scenario 3: Cryptography & Deterministic Password Generation

*Requires standard library cryptographic utilities (`secrets`, `string`, `hashlib`).*

**Prompt to Copy & Paste:**
```text
Generate a secure 16-character password containing at least 2 uppercase letters, 2 lowercase letters, 2 digits, and 2 symbols, and output its SHA-256 hash.
```

**Expected Agent Behavior:**
- **Synthesized Function**: Uses `secrets.choice` to ensure cryptographic randomness, then passes the resulting string through `hashlib.sha256()`.
- **Output**: Returns both the generated password and the 64-character hexadecimal SHA-256 checksum.

---

## 📊 Scenario 4: Financial Amortization Schedule

*Forces synthesis of complex financial formulas involving exponential compounding.*

**Prompt to Copy & Paste:**
```text
Calculate the monthly loan payment, total payment, and total interest for a $25,000 car loan at 6.5% annual interest over a 5-year loan term.
```

**Expected Agent Behavior:**
- **Formula Implemented**:
  $$M = P \frac{r(1+r)^n}{(1+r)^n - 1}$$
  where $P = 25000$, $r = 0.065 / 12$, $n = 60$.
- **Synthesized Function**: Computes exact values rounded to two decimal places:
  - Monthly Payment: **~$489.15**
  - Total Paid: **~$29,349.00**
  - Total Interest: **~$4,349.00**

---

## 🔧 Scenario 5: Self-Repair Loop (Error Recovery)

*To see the autonomous repair loop in action, test a prompt that has tricky edge cases or potential pitfalls (like integer overflow or zero division).*

**Prompt to Copy & Paste:**
```text
Create a tool that calculates the harmonic mean of a list of numbers, and safely handles zeroes and negative numbers by skipping or raising an informative error. Test it on [10, 20, 0, 40, -5].
```

**Expected Agent Behavior:**
1. If the initial code divides by zero without a guard, `tester_node` generates a test case with `0` that fails in the sandbox.
2. `verify_node` catches `ZeroDivisionError` and records `tests_passed: false`.
3. `repair_node` receives the error traceback and code, fixes the zero-check logic, and re-submits to the sandbox.
4. The repaired tool passes verification and registers cleanly.

---

## 📎 Scenario 6: Document-Grounded Tool Forging (Phase 7 Feature)

*Attach your own document (PDF, TXT, MD, or Python specification) to create domain-specific tools.*

1. In the chat UI, click the **Paperclip / Attachment** button next to the input box.
2. Upload any technical text file or sample API schema (e.g. a table of tax rates, custom formulas, or proprietary calculation rules).
3. Send this prompt:
   ```text
   Read the attached document and synthesize a tool that calculates the final penalty score based on the formula specified in Section 2.
   ```
4. **Behavior**: The backend stores the document in MinIO, extracts the raw text into `document_context`, and passes it directly to `forge_node` to synthesize the tool strictly following the uploaded guidelines.

---

## 🔍 How to Inspect the Verification Evidence in the UI

1. **Tool Code Drawer**:
   - On any message where a tool was forged or reused, click the **Tool Badge** (e.g. `FibonacciTool`).
   - A side drawer opens displaying:
     - The complete generated Python source code.
     - The JSON Schema parameter contract.
     - The generated adversarial Pytest unit tests.
     - The Docker sandbox execution time and memory consumption.
2. **Activity & Audit Logs (`/logs`)**:
   - Navigate to the **Activity Logs** tab in the navigation bar.
   - Filter by event type (`FORGE_STARTED`, `TOOL_VERIFIED`, `TOOL_REUSED`, `TOOL_REPAIRED`).
   - Click any trace ID to open the **Log Trace Modal**, which reveals the exact JSON payloads, AST profiler results, and execution output.
3. **Tool Registry (`/tools`)**:
   - Visit the **Tool Registry** tab to see all your active synthesized tools.
   - Inspect their **Gate Score**, **Reuse Count**, and average execution latency.
   - Click **Export (.sfatool)** to download the standalone portable bundle of any tool.
