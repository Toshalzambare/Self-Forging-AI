@echo off
setlocal enabledelayedexpansion
title Self-Forging AI Agent Launcher

cd /d "%~dp0"

echo ============================================================
echo        Self-Forging AI Agent - System Launcher
echo ============================================================
echo.

:: 1. Check / Initialize .env file
if not exist ".env" (
    echo [!] .env file not found. Copying from .env.example...
    copy .env.example .env >nul
    echo [+] Created .env. Please configure your API keys and secrets as needed.
) else (
    echo [+] Environment file .env detected.
)

:: 2. Check Docker daemon & start infrastructure services
echo.
echo [*] Checking Docker daemon status...
docker info >nul 2>&1
if errorlevel 1 goto no_docker
echo [+] Docker is running. Starting PostgreSQL and MinIO services...
docker compose up -d postgres minio
if errorlevel 1 (
    echo [!] Warning: Failed to start docker compose services.
) else (
    echo [+] Infrastructure containers started successfully.
)
goto docker_done

:no_docker
echo [!] Warning: Docker Desktop is not running or not in PATH.
echo     PostgreSQL database and Docker Sandbox isolation require Docker.
echo     Please start Docker Desktop for full functionality.

:docker_done

:: 3. Check and Setup Backend Virtual Environment
echo.
echo [*] Verifying backend Python environment...
if not exist "backend\.venv\Scripts\python.exe" goto create_venv
echo [+] Backend virtual environment detected.
goto venv_done

:create_venv
echo [!] Virtual environment not found. Creating backend\.venv...
python -m venv backend\.venv
if errorlevel 1 (
    echo [x] Error creating virtual environment. Ensure Python 3.11+ is installed.
    pause
    exit /b 1
)
echo [+] Installing backend dependencies...
backend\.venv\Scripts\pip.exe install -r backend\requirements.txt
if errorlevel 1 (
    echo [x] Error installing dependencies.
    pause
    exit /b 1
)

:venv_done

:: 4. Apply Database Migrations
echo.
echo [*] Checking database migrations...
backend\.venv\Scripts\python.exe -m alembic -c backend\alembic.ini upgrade head >nul 2>&1
if errorlevel 1 (
    echo [!] Note: Alembic migration check skipped or PostgreSQL not yet ready.
) else (
    echo [+] Database schema is up to date.
)

:: 5. Check and Setup Frontend Node Modules
echo.
echo [*] Verifying frontend dependencies...
if not exist "frontend\node_modules\" goto install_node
echo [+] Frontend dependencies detected.
goto node_done

:install_node
echo [!] Node modules not found. Installing frontend dependencies...
pushd frontend
call npm install
popd
if errorlevel 1 (
    echo [x] Error installing frontend packages. Ensure Node.js is installed.
    pause
    exit /b 1
)

:node_done

:: 6. Launch Backend and Frontend in separate windows
echo.
echo ============================================================
echo   Starting Backend and Frontend Dev Servers...
echo ============================================================

set "PROJECT_ROOT=%~dp0"
set "BACKEND_DIR=%PROJECT_ROOT%backend"
set "FRONTEND_DIR=%PROJECT_ROOT%frontend"

echo [+] Launching Backend on http://127.0.0.1:8000 ...
start "Self-Forging AI - Backend" /D "%BACKEND_DIR%" cmd /k "call .venv\Scripts\activate.bat && uvicorn main:app --reload --host 127.0.0.1 --port 8000"

echo [+] Launching Frontend on http://localhost:5173 ...
start "Self-Forging AI - Frontend" /D "%FRONTEND_DIR%" cmd /k "npm run dev"

:: 7. Wait and Open Browser
echo.
echo [*] Waiting for servers to initialize...
ping 127.0.0.1 -n 4 >nul

echo [+] Opening web application in default browser...
start http://localhost:5173

echo.
echo ============================================================
echo   Self-Forging AI Agent is running!
echo   - Web UI:       http://localhost:5173
echo   - Backend API:  http://127.0.0.1:8000
echo   - API Docs:     http://127.0.0.1:8000/docs
echo   - MinIO S3:     http://127.0.0.1:9001
echo ============================================================
echo.
echo You can close this launcher window at any time.
echo To shut down all services later, double-click stop.bat.
echo.
pause
