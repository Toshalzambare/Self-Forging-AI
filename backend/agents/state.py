from typing import TypedDict, List, Annotated
import operator
from langchain_core.messages import BaseMessage

class AgentState(TypedDict):
    # The history of the conversation / reasoning
    messages: Annotated[List[BaseMessage], operator.add]
    
    # The high-level task the user asked to perform
    task: str
    
    # If a tool is missing, this describes the missing capability
    missing_capability: str
    
    # The generated python code for the missing tool
    generated_code: str
    
    # The JSON schema representation of the tool
    generated_schema: dict
    
    # The generated pytest file contents
    adversarial_tests: str
    
    # Trace/Output from the sandbox execution
    sandbox_results: str
    
    # Boolean flag: did the sandbox tests pass?
    tests_passed: bool
    
    # How many times have we tried to repair this code
    repair_attempts: int

    # Autonomously retrieved external documentation from web search
    documentation_context: str

    # Attached document contents and metadata uploaded by user
    document_context: str
    attachments: List[dict]

    # Authenticated user/tenant ID for namespace isolation
    user_id: str

    # Conversation / Session ID for observability tracing
    session_id: str

    # Tool registration status & UUID in database
    is_registered: bool
    registered_tool_id: str

    # Sandbox infrastructure failure flag
    sandbox_error: bool

    # Dedicated test suite security rejection flag and retry counter
    test_security_rejected: bool
    test_repair_attempts: int

    # Dedicated test suite missing/unrunnable flag
    test_suite_missing: bool

    # Active LLM model identifier for runtime dispatch
    model: str


