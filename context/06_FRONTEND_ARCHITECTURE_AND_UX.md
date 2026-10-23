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
