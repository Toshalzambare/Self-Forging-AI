import asyncio
from langchain_core.messages import HumanMessage
from agents.graph import build_graph

async def main():
    print("Building LangGraph...")
    graph = build_graph()
    
    print("\n--- Test 1: Simple Question (No Tool Needed) ---")
    initial_state = {
        "messages": [HumanMessage(content="What is 2 + 2?")],
        "task": "Answer a simple question",
        "missing_capability": "",
        "generated_code": "",
        "generated_schema": {},
        "adversarial_tests": "",
        "sandbox_results": "",
        "tests_passed": False,
        "repair_attempts": 0
    }
    
    # Run the graph
    print("Invoking graph...")
    final_state = await graph.ainvoke(initial_state)
    print("Result Messages:", [m.content if hasattr(m, 'content') else m['content'] for m in final_state.get('messages', [])])
    
    print("\n--- Test 2: Tool Forging Request ---")
    initial_state["messages"] = [HumanMessage(content="I need to scrape the text content from a news website URL.")]
    initial_state["task"] = "Scrape a website"
    
    print("Invoking graph for missing capability...")
    final_state = await graph.ainvoke(initial_state)
    
    with open("test_results.md", "w", encoding="utf-8") as f:
        f.write("# LangGraph Test Results\n\n")
        f.write("## Missing Capability Determined:\n")
        f.write(f"{final_state.get('missing_capability')}\n\n")
        
        f.write("## Generated Code:\n```python\n")
        f.write(f"{final_state.get('generated_code')}\n```\n\n")
        
        f.write("## Generated JSON Schema:\n```json\n")
        import json
        f.write(json.dumps(final_state.get('generated_schema'), indent=2))
        f.write("\n```\n\n")
        
        f.write("## Adversarial Tests Generated:\n```python\n")
        f.write(f"{final_state.get('adversarial_tests')}\n```\n\n")
        
        f.write("## Sandbox Execution Results:\n```\n")
        f.write(f"Tests Passed: {final_state.get('tests_passed')}\n")
        f.write(f"Repair Attempts Used: {final_state.get('repair_attempts')}\n\n")
        f.write(f"{final_state.get('sandbox_results', 'No logs available')}\n```\n")
    
    print("Test finished. Results saved to test_results.md")
    
if __name__ == "__main__":
    asyncio.run(main())
