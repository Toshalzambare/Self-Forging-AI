@echo off
setlocal enabledelayedexpansion
title Self-Forging AI Agent - Stop Services

cd /d "%~dp0"

echo ============================================================
echo        Self-Forging AI Agent - Stopping Services
echo ============================================================
echo.

:: 1. Stop Docker Infrastructure Containers
echo [*] Stopping Docker containers...
docker compose stop postgres minio minio-init >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [+] Docker containers stopped.
) else (
    echo [!] Note: No active Docker compose containers found or Docker is not running.
)

:: 2. Stop Python Uvicorn / Vite Node processes if bound to ports
echo.
echo [*] Freeing development ports (8000, 5173)...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo [+] Terminating process on port 8000 (PID: %%a)...
    taskkill /f /pid %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    echo [+] Terminating process on port 5173 (PID: %%a)...
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo ============================================================
echo   All Self-Forging AI services have been stopped.
echo ============================================================
echo.
pause
