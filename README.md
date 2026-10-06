# Self-Forging AI Agent 🔨🤖

An autonomous AI agent that can **detect missing capabilities**, **forge new tools at runtime**, **verify them through adversarial testing**, and **hot-swap them into its own toolset** — all without human intervention.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Vite + React + Tailwind)    │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Chat UI     │  │ Forge Panel  │  │ Tool Registry │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │ WebSocket + REST
┌────────────────────────┴────────────────────────────────┐
│                 BACKEND (FastAPI + LangGraph)            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │  Agent   │ │  Forge   │ │ Tester   │ │  Repair   │  │
│  │  Core    │ │  Node    │ │  Node    │ │  Loop     │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
└─────┬──────────────┬──────────────────────┬─────────────┘
      │              │                      │
┌─────┴─────┐  ┌─────┴──────┐  ┌───────────┴──────────┐
│ OmniRoute │  │   Docker   │  │  MCP Server + SQLite │
│ (LLM API) │  │  Sandbox   │  │  (Tool Registry)     │
└───────────┘  └────────────┘  └──────────────────────┘
```

## 📁 Project Structure

```
Self-Forging-AI/
├── frontend/          # Vite + React + Tailwind UI
├── backend/           # FastAPI + LangGraph engine
│   ├── agents/        # LangGraph nodes (maker, tester, repair)
│   ├── sandbox/       # Docker sandbox manager
│   ├── registry/      # MCP server + SQLite tool store
│   ├── bootstrap/     # Pre-built tools (web_search, read_url, etc.)
│   └── main.py        # FastAPI entry point
├── data/              # SQLite database (gitignored)
├── docker-compose.yml # OmniRoute + Sandbox containers
├── .env               # Local secrets (gitignored)
├── .env.example       # Template for .env
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 22+
- Docker Desktop
- OmniRoute (running on local network)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/Toshalzambare/Self-Forging-AI.git
cd Self-Forging-AI

# 2. Copy environment file and fill in your values
cp .env.example .env

# 3. Install backend dependencies
cd backend
pip install -r requirements.txt

# 4. Install frontend dependencies
cd ../frontend
npm install

# 5. Start the backend
cd ../backend
uvicorn main:app --reload

# 6. Start the frontend
cd ../frontend
npm run dev
```

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Vite + React + Tailwind CSS | User interface |
| Backend | FastAPI + LangGraph | Agent orchestration |
| LLM Router | OmniRoute (Docker) | Free multi-model access |
| Sandbox | Docker | Secure code execution |
| Tool Registry | MCP SDK + SQLite | Dynamic tool storage |
| Search | DuckDuckGo Search | Internet access for agents |

## 📄 License

MIT License
