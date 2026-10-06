from langgraph.graph import StateGraph, END
from agents.state import AgentState

# We will import node functions once they are written
from agents.nodes.core import core_node
from agents.nodes.forge import forge_node
from agents.nodes.tester import tester_node
from agents.nodes.repair import repair_node

from sandbox.profiler import check_security
from sandbox.executor import execute_in_sandbox

async def verify_node(state: AgentState) -> dict:
    """Runs the tests against the generated code in a Docker Sandbox."""
    code = state.get("generated_code", "")
    tests = state.get("adversarial_tests", "")
    
    # 1. Admission Gate: Semantic Profiling
    violations = check_security(code)
    if violations:
        return {
            "tests_passed": False,
            "sandbox_results": f"SECURITY VIOLATION - Code rejected by Admission Gate:\n" + "\n".join(violations)
        }
        
    # 2. Execution Sandbox
    passed, logs = execute_in_sandbox(code, tests)
    
    return {
        "tests_passed": passed,
        "sandbox_results": logs
    }

async def register_node(state: AgentState) -> dict:
    """Mock node for now. Will save tool to DB and MCP registry."""
    return {}

def should_forge(state: AgentState) -> str:
    """Router from core node."""
    if state.get("missing_capability"):
        return "forge"
    return END

def check_tests(state: AgentState) -> str:
    """Router from verify node."""
    if state.get("tests_passed"):
        return "register"
    
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
    
    # Add a failure node just to gracefully handle unrepairable code
    async def failure_node(state: AgentState) -> dict:
        return {"messages": [{"role": "assistant", "content": "Failed to forge a working tool after 3 attempts."}]}
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
            "end_failure": "end_failure"
        }
    )
    
    workflow.add_edge("repair", "verify")
    
    # Once registered, go back to core to continue the user's task
    workflow.add_edge("register", "core")
    workflow.add_edge("end_failure", "core")
    
    return workflow.compile()
