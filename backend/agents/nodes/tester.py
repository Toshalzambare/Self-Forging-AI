import json
from pydantic import BaseModel, Field
from agents.state import AgentState
from agents.llm import llm
from langchain_core.messages import SystemMessage, HumanMessage

async def tester_node(state: AgentState) -> dict:
    """
    The Adversarial Tester Node (Patent Focus).
    Generates an isolated Pytest file containing 3-5 edge case tests designed
    to break the generated code.
    """
    code = state.get("generated_code", "")
    if not code:
        return {}
    
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
    
    if content.startswith("```json"):
        content = content.replace("```json", "", 1)
    if content.endswith("```"):
        content = content[:-3]
        
    try:
        data = json.loads(content.strip())
        pytest_code = data.get("pytest_code", "")
    except Exception as e:
        pytest_code = f"# Error generating tests: {str(e)}"
    
    return {
        "adversarial_tests": pytest_code
    }
