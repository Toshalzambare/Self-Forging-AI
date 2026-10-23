import os
import sys
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from sandbox.profiler import check_security


def test_profiler_allows_safe_code():
    code = """
import math
import re
from collections import Counter
from urllib.parse import urlparse

class SafeWorker:
    def __init__(self, val: int):
        self._cache = {}
        self.val = val

    def compute(self, pattern: str) -> int:
        compiled = re.compile(pattern)
        return math.isqrt(self.val) + len(compiled.pattern)

def safe_compute(x: int) -> int:
    parsed = urlparse("https://example.com/path")
    worker = SafeWorker(x)
    return worker.compute(".*") + len(parsed.path)

if __name__ == "__main__":
    print(safe_compute(16))
"""
    violations = check_security(code)
    assert violations == []


def test_profiler_blocks_banned_imports():
    code1 = "import os\nos.system('ls')"
    assert any("Banned module import" in v or "Restricted" in v for v in check_security(code1))

    code2 = "import subprocess\nsubprocess.run(['ls'])"
    assert any("Banned module import" in v for v in check_security(code2))

def test_profiler_asyncio_allowed_but_subprocess_blocked():
    code_safe = "import asyncio\nasync def f(): await asyncio.sleep(0.01)"
    assert check_security(code_safe) == []

    code_sub = "import asyncio\nasyncio.create_subprocess_shell('ls')"
    assert any("Restricted attribute access" in v for v in check_security(code_sub))

    code_sub2 = "import asyncio\nx = asyncio.subprocess"
    assert any("Restricted attribute access" in v for v in check_security(code_sub2))


def test_profiler_blocks_urllib_request_while_allowing_parse():
    # urllib.parse should be allowed
    assert check_security("import urllib.parse\nx = urllib.parse.quote('a')") == []
    assert check_security("from urllib.parse import urlparse\nx = urlparse('http://a.com')") == []

    # urllib.request must be blocked
    v1 = check_security("import urllib.request\nurllib.request.urlopen('http://a.com')")
    assert any("Banned module import" in v or "Restricted" in v for v in v1)

    v2 = check_security("from urllib import request\nrequest.urlopen('http://a.com')")
    assert any("Banned" in v for v in v2)


def test_profiler_blocks_attribute_bypass_vectors():
    # uuid.os.system
    v1 = check_security("import uuid\nuuid.os.system('id')")
    assert any("Restricted attribute access" in v for v in v1)

    # random._os.system
    v2 = check_security("import random\nrandom._os.system('id')")
    assert any("Restricted attribute access" in v for v in v2)

    # direct process calls
    v3 = check_security("obj.system('echo hi')")
    assert any("Restricted attribute access" in v for v in v3)

    v4 = check_security("loop.create_subprocess_exec('sh')")
    assert any("Restricted attribute access" in v for v in v4)


def test_profiler_blocks_dunder_and_dynamic_getattr():
    v1 = check_security("x = obj.__class__.__subclasses__()")
    assert any("Restricted attribute access" in v for v in v1)

    v2 = check_security("getattr(obj, '__builtins__')")
    assert any("Restricted attribute access" in v or "Restricted dunder" in v for v in v2)

    v3 = check_security("getattr(obj, dynamic_var)")
    assert any("Dynamic non-constant attribute resolution" in v for v in v3)


def test_profiler_blocks_advanced_asyncio_and_reflection_escapes():
    # 1. from asyncio import create_subprocess_shell
    v1 = check_security("from asyncio import create_subprocess_shell\ncreate_subprocess_shell('ls')")
    assert any("Banned import" in v or "Banned function call" in v for v in v1)

    # 2. from asyncio.subprocess import ...
    v2 = check_security("from asyncio.subprocess import create_subprocess_exec")
    assert any("Banned module import" in v or "Banned import" in v for v in v2)

    # 3. loop.subprocess_exec / subprocess_shell
    v3 = check_security("loop.subprocess_exec('sh')")
    assert any("Restricted attribute access" in v for v in v3)
    v4 = check_security("loop.subprocess_shell('sh')")
    assert any("Restricted attribute access" in v for v in v4)

    # 4. First-class getattr reference & dunder string literal
    v5 = check_security("import functools\nfunctools.reduce(getattr, ['__globals__'], fn)")
    assert any("first-class value" in v or "Restricted dunder string" in v for v in v5)


def test_profiler_blocks_pytest_importorskip():
    v1 = check_security("import pytest\npytest.importorskip('os')")
    assert any("Banned function call" in v or "Restricted attribute" in v for v in v1)

    v2 = check_security("from pytest import importorskip\nimportorskip('sys')")
    assert any("Banned import" in v or "Banned function call" in v for v in v2)


@pytest.mark.asyncio
async def test_graph_handles_test_security_rejection():
    from agents.graph import check_tests, build_graph
    # verify check_tests routes test_security_rejected to tester on first attempt
    state_retry = {"tests_passed": False, "sandbox_error": False, "test_security_rejected": True, "test_repair_attempts": 0}
    assert check_tests(state_retry) == "tester"

    # verify check_tests routes to end_failure when retry limit reached
    state_exhausted = {"tests_passed": False, "sandbox_error": False, "test_security_rejected": True, "test_repair_attempts": 2}
    assert check_tests(state_exhausted) == "end_failure"

    # verify check_tests routes sandbox_error directly to end_failure
    state_infra = {"tests_passed": False, "sandbox_error": True, "test_security_rejected": False}
    assert check_tests(state_infra) == "end_failure"


async def test_verify_node_rejects_missing_tests():
    from agents.graph import verify_node
    res_empty = await verify_node({"generated_code": "def execute(): return 1", "adversarial_tests": ""})
    assert res_empty["test_suite_missing"] is True
    assert res_empty["test_security_rejected"] is False
    assert res_empty["tests_passed"] is False

    res_no_func = await verify_node({"generated_code": "def execute(): return 1", "adversarial_tests": "# Error generating tests: syntax error"})
    assert res_no_func["test_suite_missing"] is True
    assert res_no_func["test_security_rejected"] is False
    assert res_no_func["tests_passed"] is False


def test_profiler_blocks_string_annotations_and_forward_refs():
    # String annotation in variable
    code1 = 'x: "exec(\'import os\')"'
    v1 = check_security(code1)
    assert any("String (forward-reference) annotations are disallowed" in v for v in v1)

    # String annotation in function argument
    code2 = 'def f(val: "os.system(\'id\')") -> int: return 1'
    v2 = check_security(code2)
    assert any("String (forward-reference) annotations are disallowed" in v for v in v2)

    # String annotation in return type
    code3 = 'def f() -> "eval(\'1+1\')": return 2'
    v3 = check_security(code3)
    assert any("String (forward-reference) annotations are disallowed" in v for v in v3)

    # get_type_hints import / call
    code4 = 'from typing import get_type_hints\nget_type_hints(f)'
    v4 = check_security(code4)
    assert any("Banned import" in v or "Banned function call" in v for v in v4)

def test_profiler_blocks_dunder_name_references():
    code = 'def execute():\n    return __builtins__["exec"]("1")'
    v = check_security(code)
    assert any("Restricted dunder name reference detected: '__builtins__'" in err for err in v)
