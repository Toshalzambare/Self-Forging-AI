# Self-Forging AI - Frontend Feature Inventory

This document provides a comprehensive list of all features, pages, components, and interaction patterns currently designed and implemented in the frontend (`Self-Forging-AI/frontend/src/`).

---

## 1. Main Agent Workspace (`ConversationPage.jsx`)
The core conversational interface for interacting with the autonomous agent.

* **Interactive Chat Stream**:
  * Real-time conversational message feed with user and assistant messages.
  * Markdown rendering with syntax highlighting for code blocks.
  * Message actions: copy response, retry/regenerate, and clear conversation history.
* **Live Reasoning & Forge State Indicators**:
  * Dynamic visual banners reflecting agent loop states:
    * `Detecting Capability`: Agent analyzing if an external tool is required.
    * `Forging Tool`: Real-time indicator showing code synthesis.
    * `Running Adversarial Tests`: Sandbox testing indicator with test progress.
    * `Repair Loop`: Alert banner showing retry count and active error remediation.
    * `Tool Verified & Registered`: Success badge indicating tool admission.
* **In-Chat Artifact Cards**:
  * Expandable code blocks displaying newly forged Python scripts.
  * Collapsible test-run traces and sandbox logs directly within the chat timeline.
* **Quick-Prompt Starters**:
  * Preset prompt suggestions for new sessions (e.g., "Scrape HackerNews top stories", "Analyze CSV file", "Fetch weather API data").
* **Model Selection Indicator**:
  * Active model badge in the chat bar with quick trigger to open the Model Selection Modal.

---

## 2. Forge Activity & Audit Logs (`ActivityLogsPage.jsx`)
A dedicated observatory and auditing page for all agent tool-forging actions.

* **Chronological Action Timeline**:
  * Complete audit trail of every forge, test, repair, and verification step executed by the agent.
* **Status Badges & Filtering**:
  * Filter logs by status:
    * `Success`: Tool passed admission gate and was registered.
    * `Failed`: Tool failed tests after maximum repair retries.
    * `Security Violation`: Rejected by the Semantic AST Profiler.
    * `In Progress`: Active testing or execution in the sandbox.
* **Deep Trace Inspector**:
  * Full-width log viewer showing raw Docker sandbox stdout/stderr and Pytest failure traces.
  * AST security alert viewer displaying banned module imports or restricted function calls.
* **Session ID Filtering & Search**:
  * Search and group activity logs by conversation session or specific tool name.
* **Dynamic Refresh**:
  * Live data fetching from `/api/logs` endpoint with auto-refresh / reload controls.

---

## 3. Ecosystem Tools Registry (`EcosystemToolsPage.jsx`)
A centralized catalog displaying all verified tools available to the agent.

* **Tool Directory Grid**:
  * Cards displaying every registered tool (both bootstrap pre-built tools and dynamically forged tools).
  * Displays tool metadata: Name, Description, Status (`active` / `deprecated`), and Creation Timestamp.
* **Tool Detail & Code Modal (`CodeModal.jsx`)**:
  * Interactive modal to inspect the tool's complete Python source code (`execute(...)`).
  * JSON Schema viewer showing input parameter definitions, types, and required fields.
* **Tool State Controls**:
  * Toggle tool between active and inactive states.
  * Search bar with real-time filtering by tool name or functional tags.
* **Dynamic Data Sync**:
  * Connected to the backend `/api/tools` endpoint for live database synchronization.

---

## 4. API & System Settings (`ApiSettingsPage.jsx`)
A tabbed administration dashboard for managing LLM connections, MCP servers, and sandbox parameters.

* **LLM Providers Management (Tab 1)**:
  * Supported providers: OmniRoute, OpenAI, Anthropic, Ollama, OpenRouter, DeepSeek, Groq.
  * Per-provider configuration: Endpoint URL, API Key (secure masked input), and Active/Inactive toggle.
  * "Test Connection" button for live health checks.
  * Fetches and persists configurations via `/api/settings/providers`.
* **MCP Micro-Servers Management (Tab 2)**:
  * Registry of connected Model Context Protocol (MCP) servers.
  * Displays Server Name, Endpoint URL, Transport Protocol (`stdio`, `sse`, `http`), and Status (`active`, `disconnected`).
  * "Add MCP Server" modal/form for registering external tool endpoints.
  * Fetches and persists configurations via `/api/settings/mcp_servers`.
* **Docker Sandbox Configuration (Tab 3)**:
  * Configuration controls for execution environment:
    * Base Docker Image (e.g., `python:3.11-slim`).
    * Execution timeout limit (seconds).
    * Container memory limits (e.g., `512m`).
    * Network isolation modes (`none`, `bridge`).

---

## 5. Global Shell, Navigation & Shared Modals

* **Global Top Navigation (`Header.jsx`)**:
  * Clean route switcher across Workspace (Chat), Activity Logs, Ecosystem Tools, and API Settings.
  * Live Backend Connection indicator (online/offline heartbeat badge).
  * Quick triggers for the Model Switcher Modal and the Global Activity Drawer.
* **Slide-Out Activity Drawer (`ActivityDrawer.jsx`)**:
  * Global drawer accessible from any page via the header button.
  * Displays a live streaming feed of recent agent actions without leaving the current view.
* **Model Switcher Modal (`ModelModal.jsx`)**:
  * Overlay modal to switch the active LLM router model (Auto, local Ollama models, Claude, GPT-4o, etc.).
  * Shows provider badges, context limits, and token cost indicators.
* **Toast Notification System (`Toast.jsx`)**:
  * Global animated toast alerts for async actions (e.g., settings saved, connection tests, error alerts).
* **Developer Authentication Gate (`LoginPage.jsx`)**:
  * Simple development login screen utilizing environment-configured credentials (`VITE_DEMO_USERNAME`, `VITE_DEMO_PASSWORD`).

---

## 6. Architecture & Foundation

* **Centralized API Client (`config.js`)**:
  * Unified `apiFetch` wrapper ensuring all frontend calls handle authentication headers, base URLs, and error responses consistently.
* **Environment-Driven Configuration**:
  * Controlled via `.env` / `.env.example` (`VITE_API_BASE_URL`, `VITE_APP_NAME`, `VITE_DEFAULT_MODEL`).
* **Design & Styling**:
  * Dark-mode glassmorphic theme with Tailwind CSS.
  * Google Material Symbols iconography.
  * Fully responsive layouts across desktop and mobile screen sizes.
