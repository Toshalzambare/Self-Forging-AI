"""
ResearchEngine: Coordinates autonomous web search and documentation retrieval
to ground tool synthesis (maker_node) and automated bug fixing (repair_node).
"""
import logging
import re
from typing import Optional, List, Dict
from agents.research.search_client import search_web
from agents.research.doc_extractor import extract_documentation

logger = logging.getLogger(__name__)


class ResearchEngine:
    """Coordinates autonomous technical web research for tool generation and repair."""

    @staticmethod
    def _extract_core_error(error_trace: str) -> str:
        """Extract the most relevant exception line from a python traceback."""
        if not error_trace:
            return ""

        # Match standard Python exceptions at the end of tracebacks
        matches = re.findall(
            r"([A-Za-z_]+(?:Error|Exception|Warning|Violation):[^\n]+)",
            error_trace
        )
        if matches:
            return matches[-1].strip()

        # Fallback to the last non-empty line
        lines = [line.strip() for line in error_trace.splitlines() if line.strip()]
        return lines[-1] if lines else "Python execution error"

    @classmethod
    async def research_capability(cls, capability_description: str) -> str:
        """
        Search for official documentation and code examples for a requested capability.
        Returns formatted markdown reference, or empty string if no relevant docs found.
        """
        if not capability_description or not capability_description.strip():
            return ""

        query = f"python {capability_description.strip()} documentation library example"
        logger.info("Executing capability web research for query: '%s'", query)

        results = await search_web(query, max_results=3)
        if not results:
            return ""

        # Extract doc content from the first viable technical link
        doc_excerpt = ""
        primary_url = ""
        for res in results:
            url = res.get("url", "")
            if url and ("docs.python.org" in url or "readthedocs" in url or "github.com" in url or "pypi.org" in url or not primary_url):
                primary_url = url
                doc_excerpt = await extract_documentation(url)
                if doc_excerpt:
                    break

        snippets_text = "\n".join([f"- **{r.get('title', '')}**: {r.get('snippet', '')}" for r in results[:2]])

        reference_block = f"""
### Verified External Documentation Reference
The following documentation was autonomously retrieved from the web to ground this tool:
{snippets_text}
"""
        if doc_excerpt:
            reference_block += f"""
Source: {primary_url}
Documentation Excerpt:
{doc_excerpt}
"""
        return reference_block.strip()

    @classmethod
    async def research_error(cls, error_trace: str, code_snippet: str = "") -> str:
        """
        Search for solutions to a specific test or sandbox error trace.
        Returns formatted remediation context for repair_node.
        """
        core_error = cls._extract_core_error(error_trace)
        if not core_error:
            return ""

        # Clean module paths or long hashes from error query
        clean_error = re.sub(r"0x[0-9a-fA-F]+", "", core_error)
        clean_error = re.sub(r"/[^\s]+", "", clean_error)[:120]

        query = f"python {clean_error} fix example"
        logger.info("Executing error resolution research for: '%s'", query)

        results = await search_web(query, max_results=2)
        if not results:
            return f"### Error Context\nCore Error: `{core_error}`"

        snippets_text = "\n".join([f"- **{r.get('title', '')}**: {r.get('snippet', '')}" for r in results])

        return f"""
### Verified Error Resolution Guidance
The previous implementation failed with:
`{core_error}`

Autonomously retrieved search guidance:
{snippets_text}
Use this verified guidance to rewrite and repair the implementation.
""".strip()
