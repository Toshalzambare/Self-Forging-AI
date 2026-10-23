import asyncio
from langgraph.graph import StateGraph, END
from agents.state import AgentState

# We will import node functions once they are written
from agents.nodes.core import core_node
from agents.nodes.forge import forge_node
from agents.nodes.tester import tester_node
from agents.nodes.repair import repair_node
from agents.nodes.register import register_node

from sandbox.profiler import check_security
from sandbox.executor import execute_in_sandbox, INFRASTRUCTURE_ERROR_MARKERS
from observability import emit_agent_event, AgentLifecycleEvent

async def verify_node(state: AgentState) -> dict:
    """Runs the tests against the generated code in a Docker Sandbox."""
    code = state.get("generated_code", "")
    tests = state.get("adversarial_tests", "")
    user_id = state.get("user_id", "")
    session_id = state.get("session_id", "")
    
    # 1. Admission Gate: Semantic Profiling of code and test suite
    violations = check_security(code)
    code_violations = list(violations)
    test_violations = []
    if tests and tests.strip():
        test_violations = [f"[tests] {v}" for v in check_security(tests)]
        violations += test_violations

    if violations:
        if user_id:
            await emit_agent_event(
                user_id=user_id,
                session_id=session_id,
                event=AgentLifecycleEvent.TOOL_FAILED,
                status="security_violation",
                summary="Code or test suite rejected by Admission Gate semantic profiler.",
                data={"violations": violations, "code_preview": code[:200]},
            )
        return {
            "tests_passed": False,
            "sandbox_error": False,
            "test_security_rejected": bool(test_violations) and not code_violations,
            "test_suite_missing": False,
            "sandbox_results": f"SECURITY VIOLATION - Rejected by Admission Gate:\n" + "\n".join(violations)
        }
        
    # 2. Check for empty or non-runnable test suites
    if not tests or "def test_" not in tests:
        if user_id:
            await emit_agent_event(
                user_id=user_id,
                session_id=session_id,
                event=AgentLifecycleEvent.TOOL_FAILED,
                status="failed",
                summary="Test generation produced no runnable pytest functions.",
                data={"tests": tests[:200] if tests else ""},
            )
        return {
            "tests_passed": False,
            "sandbox_error": False,
            "test_security_rejected": False,
            "test_suite_missing": True,
            "sandbox_results": "Test generation produced no runnable pytest functions (def test_* missing).",
        }

    # 3. Execution Sandbox
    if user_id:
        await emit_agent_event(
            user_id=user_id,
            session_id=session_id,
            event=AgentLifecycleEvent.SANDBOX_TESTING,
            status="in_progress",
            summary=f"Running pytest test suite in Docker sandbox (attempt {state.get('repair_attempts', 0) + 1})...",
            data={"attempt": state.get("repair_attempts", 0) + 1},
        )

    passed, logs = await asyncio.to_thread(
        execute_in_sandbox, code, tests, user_id=user_id
    )

    is_infra_error = not passed and any(err in logs for err in INFRASTRUCTURE_ERROR_MARKERS)

    if user_id:
        if passed:
            await emit_agent_event(
                user_id=user_id,
                session_id=session_id,
                event=AgentLifecycleEvent.TOOL_VERIFIED,
                status="success",
                summary="Sandbox test verification passed successfully.",
                data={"logs": logs},
            )
        elif is_infra_error:
            await emit_agent_event(
                user_id=user_id,
                session_id=session_id,
                event=AgentLifecycleEvent.TOOL_FAILED,
                status="failed",
                summary="Sandbox infrastructure failure detected. Halting repair attempts.",
                data={"logs": logs},
            )
        else:
            await emit_agent_event(
                user_id=user_id,
                session_id=session_id,
                event=AgentLifecycleEvent.TOOL_FAILED,
                status="failed",
                summary=f"Sandbox test verification failed (attempt {state.get('repair_attempts', 0) + 1}).",
                data={"logs": logs},
            )
    
    return {
        "tests_passed": passed,
        "sandbox_results": logs,
        "sandbox_error": is_infra_error,
        "test_security_rejected": False,
        "test_suite_missing": False,
    }

def should_forge(state: AgentState) -> str:
    """Router from core node."""
    if state.get("missing_capability"):
        return "forge"
    return END

def check_tests(state: AgentState) -> str:
    """Router from verify node."""
    if state.get("tests_passed"):
        return "register"
    
    if state.get("sandbox_error"):
        # Infrastructure error: do not attempt LLM repairs on broken sandbox
        return "end_failure"

    if state.get("test_security_rejected") or state.get("test_suite_missing"):
        # Test generation issues: retry test generation up to 2 times before failing
        if state.get("test_repair_attempts", 0) < 2:
            return "tester"
        return "end_failure"
    
    if state.get("repair_attempts", 0) >= 3:
        # Give up after 3 attempts
        return "end_failure"
    
    return "repair"

def build_graph():
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("core", core_node)
    workflow.add_node("forge", forge_node)
    workflow.add_node("tester", tester_node)
    workflow.add_node("verify", verify_node)
    workflow.add_node("repair", repair_node)
    workflow.add_node("register", register_node)
    
    # Add a failure node just to gracefully handle unrepairable code or infra failure
    async def failure_node(state: AgentState) -> dict:
        if state.get("test_suite_missing"):
            msg = "Test generation did not produce a runnable pytest suite."
        elif state.get("test_security_rejected"):
            msg = "The generated test suite was rejected by the security profiler."
        elif state.get("sandbox_error"):
            msg = "Tool verification could not run because the Docker sandbox is unavailable."
        else:
            attempts = state.get("repair_attempts", 0)
            msg = f"Failed to forge a working tool after {attempts} repair attempts." if attempts else "Failed to forge a working tool."
        return {"messages": [{"role": "assistant", "content": msg}]}
    workflow.add_node("end_failure", failure_node)

    # Define edges
    workflow.set_entry_point("core")
    
    workflow.add_conditional_edges(
        "core",
        should_forge,
        {
            "forge": "forge",
            END: END
        }
    )
    
    workflow.add_edge("forge", "tester")
    workflow.add_edge("tester", "verify")
    
    workflow.add_conditional_edges(
        "verify",
        check_tests,
        {
            "register": "register",
            "repair": "repair",
            "tester": "tester",
            "end_failure": "end_failure"
        }
    )
    
    workflow.add_edge("repair", "verify")
    
    # Once registered, go back to core to continue the user's task
    workflow.add_edge("register", "core")
    workflow.add_edge("end_failure", END)
    
    return workflow.compile()
