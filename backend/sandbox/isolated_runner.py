"""
Isolated Tool Runner:
Executes dynamic tool code exclusively within an isolated Docker sandbox container
with network isolation (network_mode=none), non-root user (65534:65534), pids_limit,
cap_drop, read-only code mount, stdout/stderr isolation (tools calling print() do not
corrupt JSON output), and hard timeout kill. Untrusted tool code NEVER runs within
the backend API process or on the host machine.
"""
import sys
import os
import json
import asyncio
import logging
import tempfile
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

_DOCKER_RUNNER_SCRIPT = """
import sys, json, asyncio, inspect

def main():
    real_stdout = sys.stdout
    sys.stdout = sys.stderr
    def emit(obj):
        real_stdout.write(json.dumps(obj, default=str) + "\\n")
        real_stdout.flush()
    try:
        with open("/app/payload.json", "r", encoding="utf-8") as f:
            data = json.load(f)
        code = data.get("code", "")
        args = data.get("args", {})
        ns = {}
        exec(code, ns)
        fn = ns.get("execute")
        if not callable(fn):
            emit({"success": False, "error": "Tool does not define a callable 'execute' function"})
            return
        if inspect.iscoroutinefunction(fn):
            res = asyncio.run(fn(**args))
        else:
            res = fn(**args)
        emit({"success": True, "result": res})
    except Exception as exc:
        emit({"success": False, "error": str(exc)})

if __name__ == "__main__":
    main()
"""


def _run_in_docker(code: str, arguments: Dict[str, Any], timeout: int = 15) -> Optional[Dict[str, Any]]:
    from sandbox.executor import client
    if client is None:
        return None
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            try:
                os.chmod(temp_dir, 0o755)
            except Exception:
                pass

            script_path = os.path.join(temp_dir, "runner.py")
            with open(script_path, "w", encoding="utf-8") as f:
                f.write(_DOCKER_RUNNER_SCRIPT)

            payload_path = os.path.join(temp_dir, "payload.json")
            with open(payload_path, "w", encoding="utf-8") as f:
                json.dump({"code": code, "args": arguments or {}}, f)

            try:
                os.chmod(script_path, 0o644)
                os.chmod(payload_path, 0o644)
            except Exception:
                pass

            from config import config
            container = client.containers.run(
                image=config.DOCKER_SANDBOX_IMAGE,
                command="python -I -s /app/runner.py",
                volumes={temp_dir: {"bind": "/app", "mode": "ro"}},
                working_dir="/app",
                remove=False,
                network_mode="none",
                mem_limit=config.DOCKER_SANDBOX_MEMORY_LIMIT,
                pids_limit=128,
                cap_drop=["ALL"],
                security_opt=["no-new-privileges"],
                tmpfs={"/tmp": "size=64m"},
                user="65534:65534",
                detach=True,
                stdout=True,
                stderr=True,
            )
            try:
                try:
                    container.wait(timeout=timeout)
                except Exception as wait_err:
                    logger.warning("Tool execution timed out: %s", wait_err)
                    return {
                        "success": False,
                        "result": None,
                        "error": f"Tool execution timed out after {timeout}s.",
                    }
                stdout_text = container.logs(stdout=True, stderr=False).decode("utf-8", errors="replace").strip()
                stderr_text = container.logs(stdout=False, stderr=True).decode("utf-8", errors="replace").strip()
            finally:
                container.remove(force=True)

            if stdout_text:
                for line in reversed(stdout_text.splitlines()):
                    line = line.strip()
                    if line.startswith("{") and line.endswith("}"):
                        try:
                            parsed = json.loads(line)
                            return {
                                "success": bool(parsed.get("success", False)),
                                "result": parsed.get("result"),
                                "error": parsed.get("error"),
                            }
                        except Exception:
                            pass
            return {"success": False, "result": None, "error": stderr_text or "Container exited without result."}
    except Exception as e:
        logger.warning("Docker execution failed: %s", e)
        return None


def execute_tool_isolated_sync(
    code: str,
    arguments: Dict[str, Any],
    timeout: int = 15,
) -> Dict[str, Any]:
    """
    Executes dynamic tool code in an isolated Docker container.
    Fails closed if Docker execution is unavailable or fails, refusing
    host execution of untrusted tool code.
    """
    docker_result = _run_in_docker(code, arguments, timeout=timeout)
    if docker_result is not None:
        return docker_result

    return {
        "success": False,
        "result": None,
        "error": "Docker sandbox execution is unavailable. Refusing host execution of untrusted tool code.",
    }


async def execute_tool_isolated(
    code: str,
    arguments: Dict[str, Any],
    timeout: int = 15,
) -> Dict[str, Any]:
    """Async wrapper delegating to isolated executor."""
    return await asyncio.to_thread(execute_tool_isolated_sync, code, arguments, timeout)
