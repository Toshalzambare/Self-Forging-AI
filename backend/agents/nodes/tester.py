import json
from pydantic import BaseModel, Field
from agents.state import AgentState
from agents.llm import llm
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
    
    sys_prompt = SystemMessage(content="""
You are the Adversarial Tester. Your job is to read the provided Python code and generate a suite of 3-5 Pytest tests.
Rules:
1. Focus heavily on edge cases, invalid inputs, timeouts, and strange types to try to break the code.
2. Output a valid Python string containing standard `pytest` functions (e.g. `def test_xyz():`).
3. Assume the code you are testing is in a module called `generated_tool` and you are importing its `execute` function: `from generated_tool import execute`.

Return ONLY a valid JSON object with EXACTLY this key:
{
  "pytest_code": "The complete Pytest file containing 3-5 adversarial edge-case tests."
}
""")

    user_prompt = HumanMessage(content=f"Here is the generated code:\n\n{code}\n\nGenerate the Pytest file to ruthlessly test it.")
    
    response = await llm.ainvoke([sys_prompt, user_prompt])
    content = response.content
    
    try:
        data = extract_json_from_text(content)
        pytest_code = data.get("pytest_code", "")
    except Exception as e:
        pytest_code = f"# Error generating tests: {str(e)}"
    
    return {
        "adversarial_tests": pytest_code
    }
