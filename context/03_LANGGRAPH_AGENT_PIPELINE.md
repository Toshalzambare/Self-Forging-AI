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
