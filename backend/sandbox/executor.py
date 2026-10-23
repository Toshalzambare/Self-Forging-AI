import os
import tempfile
import docker
from typing import Tuple, Optional
from config import config

# Initialize docker client
try:
    client = docker.from_env()
except Exception as e:
    print(f"Warning: Docker not available or running. Ensure Docker Desktop is started. Error: {e}")
    client = None

INFRASTRUCTURE_ERROR_MARKERS = (
    "CRITICAL ERROR: Docker daemon",
    "not found. Please build it first.",
    "Sandbox execution error:",
)


def execute_in_sandbox(code: str, tests: str, timeout: Optional[int] = None, user_id: Optional[str] = None) -> Tuple[bool, str]:
    """
    Spawns an ephemeral Docker container to run the Pytest suite against the forged code.
    Uses pre-cached sfa-sandbox image and applies per-user resource limits.
    Returns: (tests_passed: bool, output_trace: str)
    """
    if not client:
        return False, "CRITICAL ERROR: Docker daemon is not running or accessible. Cannot execute sandbox."

    sandbox_image = config.DOCKER_SANDBOX_IMAGE
    sandbox_network = config.DOCKER_SANDBOX_NETWORK
    sandbox_memory = config.DOCKER_SANDBOX_MEMORY_LIMIT
    sandbox_timeout = timeout or config.DOCKER_SANDBOX_TIMEOUT

    if user_id:
        try:
            from settings.router import get_user_sandbox_config
            user_cfg = get_user_sandbox_config(user_id)
            sandbox_image = user_cfg.get("image", sandbox_image)
            sandbox_network = user_cfg.get("network_mode", sandbox_network)
            sandbox_memory = user_cfg.get("memory_limit", sandbox_memory)
            sandbox_timeout = timeout or user_cfg.get("timeout_seconds", sandbox_timeout)
        except Exception:
            pass

    # Create a temporary directory to host the code and tests
    with tempfile.TemporaryDirectory() as temp_dir:
        # Write the tool code to generated_tool.py
        code_path = os.path.join(temp_dir, "generated_tool.py")
        with open(code_path, "w", encoding="utf-8") as f:
            f.write(code)

        # Write the tests to test_tool.py
        tests_path = os.path.join(temp_dir, "test_tool.py")
        with open(tests_path, "w", encoding="utf-8") as f:
            if "generated_tool" not in tests:
                f.write("from generated_tool import *\n" + tests)
            else:
                f.write(tests)

        # Ensure non-root container UID 65534 can read files in bind mount
        try:
            os.chmod(temp_dir, 0o755)
            os.chmod(code_path, 0o644)
            os.chmod(tests_path, 0o644)
        except Exception:
            pass

        try:
            # Use pre-cached sfa-sandbox image — no per-run pip install
            command = "pytest test_tool.py -v --tb=short -o cache_dir=/tmp/.pytest_cache"

            container = client.containers.run(
                image=sandbox_image,
                command=command,
                volumes={temp_dir: {"bind": "/app", "mode": "ro"}},
                working_dir="/app",
                remove=False,
                network_mode=sandbox_network,
                mem_limit=sandbox_memory,
                pids_limit=128,
                cap_drop=["ALL"],
                security_opt=["no-new-privileges"],
                tmpfs={"/tmp": "size=64m"},
                user="65534:65534",
                detach=True,
                stderr=True,
                stdout=True,
            )

            try:
                try:
                    result = container.wait(timeout=sandbox_timeout)
                except Exception:
                    logs = container.logs().decode("utf-8", errors="replace")
                    return False, f"Sandbox timed out after {sandbox_timeout}s:\n{logs}"
                logs = container.logs().decode("utf-8", errors="replace")
            finally:
                container.remove(force=True)

            if result.get("StatusCode") == 0:
                return True, logs
            else:
                return False, f"Tests Failed:\n{logs}"

        except docker.errors.ImageNotFound:
            return False, f"Docker image {sandbox_image} not found. Please build it first."

        except Exception as e:
            return False, f"Sandbox execution error: {str(e)}"
