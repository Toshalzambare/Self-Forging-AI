import json
from pydantic import BaseModel, Field
from agents.state import AgentState
from agents.llm import llm
from langchain_core.messages import SystemMessage, HumanMessage

async def repair_node(state: AgentState) -> dict:
    """
    The Repair Loop Node.
    Reads the error trace from the Sandbox and rewrites the generated code
    to fix the bugs.
    """
    attempts = state.get("repair_attempts", 0)
    errors = state.get("sandbox_results", "")
    code = state.get("generated_code", "")
    
    sys_prompt = SystemMessage(content="""
You are the Repair Engineer. The previously forged Python tool failed its adversarial tests in the sandbox.
Your job is to read the code and the error trace, and output the fully corrected Python code.
Ensure the `execute` function signature remains the same.

Return ONLY a valid JSON object with EXACTLY this key:
{
  "python_code": "The complete, fixed Python script containing the `execute` function."
}
""")

    user_prompt = HumanMessage(content=f"Here is the broken code:\n\n{code}\n\nHere is the error trace from Pytest:\n\n{errors}\n\nPlease fix the code.")
    
    response = await llm.ainvoke([sys_prompt, user_prompt])
    content = response.content
    
    if content.startswith("```json"):
        content = content.replace("```json", "", 1)
    if content.endswith("```"):
        content = content[:-3]
        
    try:
        data = json.loads(content.strip())
        repaired_code = data.get("python_code", "")
    except Exception as e:
        repaired_code = code + f"\n# Failed to repair: {str(e)}"
    
    return {
        "generated_code": repaired_code,
        "repair_attempts": attempts + 1,
        "messages": [{"role": "assistant", "content": f"I encountered an error and repaired the code. Attempt {attempts + 1}."}]
    }
