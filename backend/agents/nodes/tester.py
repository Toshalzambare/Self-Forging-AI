import json
from pydantic import BaseModel, Field
from agents.state import AgentState
from agents.llm import get_llm
from agents.utils import extract_json_from_text
from langchain_core.messages import SystemMessage, HumanMessage
from observability import emit_agent_event, AgentLifecycleEvent

async def tester_node(state: AgentState) -> dict:
    """
    The Adversarial Tester Node (Patent Focus).
    Generates an isolated Pytest file containing 3-5 edge case tests designed
    to break the generated code.
    """
    code = state.get("generated_code", "")
    if not code:
        return {}

    user_id = state.get("user_id", "")
    session_id = state.get("session_id", "")
    if user_id:
        await emit_agent_event(
            user_id=user_id,
            session_id=session_id,
            event=AgentLifecycleEvent.SANDBOX_TESTING,
            status="in_progress",
            summary="Generating adversarial edge-case unit test suite...",
            data={"has_code": True},
        )
    
    test_attempts = state.get("test_repair_attempts", 0)
    if state.get("test_security_rejected") or state.get("test_suite_missing"):
        test_attempts += 1

    sys_prompt = SystemMessage(content="""
You are the Adversarial Tester. Your job is to read the provided Python code and generate a suite of 3-5 Pytest tests.
Rules:
1. Focus heavily on edge cases, invalid inputs, boundary values, and strange types to try to break the code.
2. Output a valid Python string containing standard `pytest` functions (e.g. `def test_xyz():`).
3. Assume the code you are testing is in a module called `generated_tool` and you are importing its `execute` function: `from generated_tool import execute`.
4. Import ONLY `pytest`, `generated_tool`, and safe computational modules (math, re, json, collections, itertools, datetime, decimal, statistics). NEVER import os, sys, signal, threading, subprocess, socket, unittest, or any I/O module.

Return ONLY a valid JSON object with EXACTLY this key:
{
  "pytest_code": "The complete Pytest file containing 3-5 adversarial edge-case tests."
}
""")

    user_content = f"Here is the generated code:\n\n{code}\n\nGenerate the Pytest file to ruthlessly test it."
    if state.get("test_security_rejected"):
        user_content += "\n\nCRITICAL: Your previous test suite was REJECTED by the security profiler for importing banned or unsafe modules. Ensure the new test suite imports ONLY pytest and pure computational modules."
    elif state.get("test_suite_missing"):
        user_content += "\n\nCRITICAL: Your previous test suite did not contain any runnable pytest test functions (e.g. 'def test_*'). Ensure your response contains valid, runnable pytest test functions."
    user_prompt = HumanMessage(content=user_content)
    
    active_llm = get_llm(model=state.get("model"))
    response = await active_llm.ainvoke([sys_prompt, user_prompt])
    content = response.content
    
    try:
        data = extract_json_from_text(content)
        pytest_code = data.get("pytest_code", "")
    except Exception as e:
        pytest_code = f"# Error generating tests: {str(e)}"
    
    return {
        "adversarial_tests": pytest_code,
        "test_repair_attempts": test_attempts,
        "test_security_rejected": False,
        "test_suite_missing": False,
    }

