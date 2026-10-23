import ast

ALLOWED_MODULES = {
    "math", "re", "collections", "itertools", "json", "datetime",
    "time", "string", "random", "decimal", "fractions", "statistics",
    "hashlib", "base64", "copy", "bisect", "heapq", "functools",
    "typing", "pydantic", "urllib", "asyncio", "dataclasses",
    "enum", "uuid", "zoneinfo", "pytest", "generated_tool",
}

BANNED_MODULES = {
    "os", "sys", "subprocess", "shutil", "pty", "socket",
    "multiprocessing", "threading", "importlib", "builtins",
    "eval", "exec", "compile", "posix", "nt", "ctypes",
    "pathlib", "io", "tempfile", "codecs", "urllib.request",
    "http", "gc", "inspect", "pickle"
}

BANNED_CALLS = {
    "eval", "exec", "compile", "__import__", "open",
    "globals", "locals", "vars", "breakpoint", "input",
    "read_bytes", "read_text", "write_bytes", "write_text",
    "importorskip", "get_type_hints", "ForwardRef",
}

RESTRICTED_ATTRIBUTES = {
    "__subclasses__", "__bases__", "__base__", "__globals__",
    "__code__", "__closure__", "__builtins__", "__import__",
    "__class__", "__mro__", "__dict__"
}

BANNED_ATTRIBUTE_MODULES = {
    "os", "sys", "subprocess", "shutil", "pty", "socket", "builtins",
    "importlib", "ctypes", "posix", "nt", "pickle", "gc", "inspect",
}

ALLOWED_DUNDER_ATTRIBUTES = {"__init__", "__name__", "__doc__"}
ALLOWED_DUNDER_STRINGS = ALLOWED_DUNDER_ATTRIBUTES | {"__main__"}

DANGEROUS_CALL_ATTRIBUTES = {
    "system", "popen", "spawn", "request", "execv", "execve", "fork", "kill",
    "subprocess_exec", "subprocess_shell", "importorskip",
    "get_type_hints", "ForwardRef", "_evaluate", "_eval_type", "evaluate_forward_ref",
}


def check_security(code: str) -> list[str]:
    """
    Semantic Profiler for Admission & Tool Verification Gates.
    Enforces strict module allow-list, restricts built-in calls and private attribute traversal.
    """
    violations = []

    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return [f"SyntaxError during profiling: {str(e)}"]

    direct_callee_names = {
        node.func for node in ast.walk(tree)
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
    }

    def _annotations(t):
        for n in ast.walk(t):
            if isinstance(n, ast.arg) and n.annotation is not None:
                yield n.annotation
            elif isinstance(n, ast.AnnAssign) and n.annotation is not None:
                yield n.annotation
            elif isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and n.returns is not None:
                yield n.returns

    for ann in _annotations(tree):
        for sub in ast.walk(ann):
            if isinstance(sub, ast.Constant) and isinstance(sub.value, str):
                violations.append("String (forward-reference) annotations are disallowed.")
                break

    for node in ast.walk(tree):
        # 1. Check imports against strict allow-list and explicit banned set
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name in BANNED_MODULES:
                    violations.append(f"Banned module import detected: {alias.name}")
                    continue
                root_module = alias.name.split('.')[0]
                if root_module in BANNED_MODULES or root_module not in ALLOWED_MODULES:
                    violations.append(f"Banned module import detected: {alias.name}")
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                if node.module in BANNED_MODULES or ".subprocess" in f".{node.module}":
                    violations.append(f"Banned module import detected: {node.module}")
                else:
                    root_module = node.module.split('.')[0]
                    if root_module in BANNED_MODULES or root_module not in ALLOWED_MODULES:
                        violations.append(f"Banned module import detected: {node.module}")
                    else:
                        for alias in node.names:
                            full_sub = f"{node.module}.{alias.name}"
                            if (
                                full_sub in BANNED_MODULES
                                or alias.name in BANNED_MODULES
                                or alias.name in BANNED_CALLS
                                or alias.name in DANGEROUS_CALL_ATTRIBUTES
                                or alias.name.startswith("create_subprocess")
                            ):
                                violations.append(f"Banned import detected: {full_sub}")

        # 2. Check function calls & dynamic attribute resolution
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                func_name = node.func.id
                if func_name in BANNED_MODULES or func_name in BANNED_CALLS:
                    violations.append(f"Banned function call detected: {func_name}()")
                elif func_name in {"getattr", "setattr", "delattr"}:
                    if len(node.args) >= 2:
                        attr_arg = node.args[1]
                        if isinstance(attr_arg, ast.Constant) and isinstance(attr_arg.value, str):
                            val = attr_arg.value
                            val_clean = val.lstrip("_")
                            is_banned_attr_mod = val in BANNED_ATTRIBUTE_MODULES or (
                                val.startswith("_") and not val.startswith("__") and val_clean in BANNED_ATTRIBUTE_MODULES
                            )
                            is_blocked_dunder = val.startswith("__") and val not in ALLOWED_DUNDER_ATTRIBUTES
                            if (
                                val in RESTRICTED_ATTRIBUTES
                                or is_banned_attr_mod
                                or is_blocked_dunder
                                or val.startswith("create_subprocess")
                                or val in DANGEROUS_CALL_ATTRIBUTES
                            ):
                                violations.append(f"Restricted attribute access via {func_name}: '{val}'")
                        else:
                            violations.append(f"Dynamic non-constant attribute resolution via {func_name} is disallowed.")

        # 3. Check dangerous attribute traversal
        elif isinstance(node, ast.Attribute):
            attr = node.attr
            attr_clean = attr.lstrip("_")
            is_banned_attr_mod = attr in BANNED_ATTRIBUTE_MODULES or (
                attr.startswith("_") and not attr.startswith("__") and attr_clean in BANNED_ATTRIBUTE_MODULES
            )
            is_blocked_dunder = attr.startswith("__") and attr not in ALLOWED_DUNDER_ATTRIBUTES
            if (
                attr in RESTRICTED_ATTRIBUTES
                or is_banned_attr_mod
                or is_blocked_dunder
                or attr.startswith("create_subprocess")
                or attr in DANGEROUS_CALL_ATTRIBUTES
            ):
                violations.append(f"Restricted attribute access detected: '{attr}'")

        # 4. Check first-class references to reflection builtins or subprocess calls
        elif isinstance(node, ast.Name):
            if node.id in {"getattr", "setattr", "delattr"}:
                if node not in direct_callee_names:
                    violations.append(f"Referencing '{node.id}' as a first-class value is disallowed.")
            elif node.id.startswith("create_subprocess"):
                violations.append(f"Banned function call detected: {node.id}()")
            elif node.id.startswith("__") and node.id not in ALLOWED_DUNDER_ATTRIBUTES:
                violations.append(f"Restricted dunder name reference detected: '{node.id}'")

        # 5. Check restricted dunder string literals
        elif isinstance(node, ast.Constant) and isinstance(node.value, str):
            if node.value.startswith("__") and node.value not in ALLOWED_DUNDER_STRINGS:
                violations.append(f"Restricted dunder string literal detected: '{node.value}'")

    return violations

