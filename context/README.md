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
| [**09. Test Prompts & Live Verification Guide**](file:///c:/devlopment/Final%20Year%20Project/Self-Forging-AI/context/09_TEST_PROMPTS_AND_VERIFICATION_GUIDE.md) | Prompts & Scenarios | Copy-paste test prompts for Cold Forging, Fast-Path Reuse, Self-Repair, and Document-Grounded tools. |

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
