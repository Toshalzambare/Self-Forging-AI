import os
import tempfile
import docker
from typing import Tuple, Dict, Any
from config import config

# Initialize docker client
try:
    client = docker.from_env()
except Exception as e:
    print(f"Warning: Docker not available or running. Ensure Docker Desktop is started. Error: {e}")
    client = None

def execute_in_sandbox(code: str, tests: str) -> Tuple[bool, str]:
    """
    Spawns an ephemeral Docker container to run the Pytest suite against the forged code.
    Returns: (tests_passed: bool, output_trace: str)
    """
    if not client:
        return False, "CRITICAL ERROR: Docker daemon is not running or accessible. Cannot execute sandbox."

    # Create a temporary directory to host the code and tests
    with tempfile.TemporaryDirectory() as temp_dir:
        # Write the tool code to generated_tool.py
        code_path = os.path.join(temp_dir, "generated_tool.py")
        with open(code_path, "w", encoding="utf-8") as f:
            f.write(code)
            
        # Write the tests to test_tool.py
        tests_path = os.path.join(temp_dir, "test_tool.py")
        with open(tests_path, "w", encoding="utf-8") as f:
            f.write(tests)
            
        try:
            # We use a standard python image, mount the temp directory, and run pytest
            # Ensure pytest is installed in the container
            command = "sh -c 'pip install pytest urllib3 pydantic requests && pytest test_tool.py -v --tb=short'"
            
            container = client.containers.run(
                image=config.DOCKER_SANDBOX_IMAGE, # default: python:3.11-slim
                command=command,
                volumes={temp_dir: {'bind': '/app', 'mode': 'ro'}},
                working_dir='/app',
                remove=False, # We will remove it manually to get logs if it fails
                network_mode=config.DOCKER_SANDBOX_NETWORK,
                mem_limit=config.DOCKER_SANDBOX_MEMORY_LIMIT,
                detach=True, # Run detached so we can manage it
                stderr=True,
                stdout=True
            )
            
            result = container.wait()
            logs = container.logs().decode('utf-8')
            container.remove()
            
            if result['StatusCode'] == 0:
                return True, logs
            else:
                return False, f"Tests Failed:\n{logs}"
            
        except docker.errors.ImageNotFound:
            return False, f"Docker image {config.DOCKER_SANDBOX_IMAGE} not found. Please pull it first."
            
        except Exception as e:
            return False, f"Sandbox execution error: {str(e)}"
