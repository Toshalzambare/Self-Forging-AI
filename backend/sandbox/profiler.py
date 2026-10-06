import ast

def check_security(code: str) -> list[str]:
    """
    Semantic Profiler for the Admission Gate.
    Analyzes the Abstract Syntax Tree (AST) of the generated code to detect
    potentially dangerous or unauthorized imports and function calls.
    Returns a list of violation messages. Empty list means the code is safe.
    """
    violations = []
    
    # Banned modules that should never be used by a forged tool
    BANNED_MODULES = {
        "os", "sys", "subprocess", "shutil", "pty", "socket",
        "multiprocessing", "threading", "importlib", "builtins",
        "eval", "exec", "compile"
    }

    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return [f"SyntaxError during profiling: {str(e)}"]

    for node in ast.walk(tree):
        # Check imports
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name.split('.')[0] in BANNED_MODULES:
                    violations.append(f"Banned module import detected: {alias.name}")
        elif isinstance(node, ast.ImportFrom):
            if node.module and node.module.split('.')[0] in BANNED_MODULES:
                violations.append(f"Banned module import detected: {node.module}")
                
        # Check function calls (preventing eval/exec)
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                if node.func.id in BANNED_MODULES:
                    violations.append(f"Banned built-in function call detected: {node.func.id}")
                if node.func.id in ['open']:
                    violations.append("Direct file system access 'open()' is restricted.")
                    
    return violations
