import json
from pydantic import BaseModel, Field
from agents.state import AgentState
from agents.llm import llm
from langchain_core.messages import SystemMessage, HumanMessage

async def core_node(state: AgentState) -> dict:
    """
    The Core Agent Node.
    Analyzes the user request and decides if a new tool must be forged.
    """
    messages = state.get("messages", [])
    if not messages:
        return {"messages": []}
    
    if state.get("generated_code"):
        return {
            "missing_capability": "",
            "messages": [{"role": "assistant", "content": "I have successfully forged and registered the tool. (Execution of the tool is pending Phase 5)."}]
        }

    sys_prompt = SystemMessage(content="""
You are the Core Agent. Your job is to determine if the user's request requires an external tool (like web scraping, reading files, API calls).
Return ONLY a valid JSON object with EXACTLY these three keys:
{
  "is_tool_needed": bool,
  "missing_capability_description": "If a tool is needed, describe clearly what the tool should do. Empty string otherwise.",
  "response_to_user": "If no tool is needed, the answer to the user's request. If a tool is needed, a message saying you are forging it."
}
""")
    
    # We use raw generation to avoid proxy issues with structured output
    response = await llm.ainvoke([sys_prompt] + messages)
    content = response.content
    
    # Clean markdown if present
    if content.startswith("```json"):
        content = content.replace("```json", "", 1)
    if content.endswith("```"):
        content = content[:-3]
        
    try:
        data = json.loads(content.strip())
        is_tool_needed = data.get("is_tool_needed", False)
        missing_cap = data.get("missing_capability_description", "")
        reply = data.get("response_to_user", "Processing request...")
    except Exception as e:
        # Fallback if json fails
        is_tool_needed = False
        missing_cap = ""
        reply = f"Error parsing reasoning: {str(e)}"
    
    if is_tool_needed:
        return {
            "missing_capability": missing_cap,
            "messages": [{"role": "assistant", "content": reply}]
        }
    else:
        return {
            "missing_capability": "",
            "messages": [{"role": "assistant", "content": reply}]
        }
