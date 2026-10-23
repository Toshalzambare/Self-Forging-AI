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
