import json
import logging
from pydantic import BaseModel, Field
from agents.state import AgentState
from agents.llm import llm
from agents.utils import extract_json_from_text
from agents.research.engine import ResearchEngine
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger(__name__)

async def repair_node(state: AgentState) -> dict:
    """
    The Repair Loop Node.
    Reads the error trace from the Sandbox and rewrites the generated code
    to fix the bugs, augmented with autonomous web research on the error.
    """
    attempts = state.get("repair_attempts", 0)
    errors = state.get("sandbox_results", "")
    code = state.get("generated_code", "")

    repair_guidance = ""
    if errors:
        try:
            repair_guidance = await ResearchEngine.research_error(errors, code)
        except Exception as e:
            logger.warning("Research error failed: %s", str(e))
            repair_guidance = ""

    sys_prompt = SystemMessage(content="""
You are the Repair Engineer. The previously forged Python tool failed its adversarial tests in the sandbox.
Your job is to read the code and the error trace, and output the fully corrected Python code.
Ensure the `execute` function signature remains the same.

Return ONLY a valid JSON object with EXACTLY this key:
{
  "python_code": "The complete, fixed Python script containing the `execute` function."
}
""")

    user_content = f"Here is the broken code:\n\n{code}\n\nHere is the error trace from Pytest:\n\n{errors}\n"
    if repair_guidance:
        user_content += f"\n{repair_guidance}\n"
    user_content += "\nPlease fix the code."

    user_prompt = HumanMessage(content=user_content)
    
    response = await llm.ainvoke([sys_prompt, user_prompt])
    content = response.content
    
    try:
        data = extract_json_from_text(content)
        repaired_code = data.get("python_code", "")
    except Exception as e:
        repaired_code = code + f"\n# Failed to repair: {str(e)}"
    
    return {
        "generated_code": repaired_code,
        "repair_attempts": attempts + 1,
        "documentation_context": repair_guidance,
        "messages": [{"role": "assistant", "content": f"I encountered an error and repaired the code. Attempt {attempts + 1}."}]
    }
