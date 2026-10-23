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
