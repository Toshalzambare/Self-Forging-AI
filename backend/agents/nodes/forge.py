import json
from pydantic import BaseModel, Field
from agents.state import AgentState
from agents.llm import llm
from langchain_core.messages import SystemMessage, HumanMessage

async def forge_node(state: AgentState) -> dict:
    """
    The Tool Forge Node.
    Takes a `missing_capability` description and generates robust Python code 
    along with a JSON schema defining its parameters.
    """
    capability = state.get("missing_capability", "")
    if not capability:
        return {}
    
    sys_prompt = SystemMessage(content="""
You are the Tool Forge. Your job is to write a standalone, robust Python script that implements a required capability.
Rules for the Python code:
1. It MUST contain a function named `execute(...)`.
2. Do NOT use external pip dependencies unless absolutely necessary (prefer standard library).
3. The code must be safe to run in a sandboxed environment.
4. Also generate a standard JSON schema defining the arguments for the `execute` function.

Return ONLY a valid JSON object with EXACTLY these two keys:
{
  "python_code": "The complete, self-contained Python script implementing the tool. Must include a main 'execute' function.",
  "json_schema": { ... valid JSON Schema dictionary ... }
}
""")

    user_prompt = HumanMessage(content=f"Please forge a tool for the following capability:\n{capability}")
    
    response = await llm.ainvoke([sys_prompt, user_prompt])
    content = response.content
    
    if content.startswith("```json"):
        content = content.replace("```json", "", 1)
    if content.endswith("```"):
        content = content[:-3]
        
    try:
        data = json.loads(content.strip())
        python_code = data.get("python_code", "")
        json_schema = data.get("json_schema", {})
    except Exception as e:
        python_code = f"# Error generating code: {str(e)}"
        json_schema = {}
    
    return {
        "generated_code": python_code,
        "generated_schema": json_schema,
        "repair_attempts": 0 # Reset attempts for new tool
    }
