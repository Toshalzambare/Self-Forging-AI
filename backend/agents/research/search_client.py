"""
Search client for autonomous web research.
Provides unified search interface with DuckDuckGo HTML endpoint as default,
plus mock provider support for deterministic offline testing.
"""
import logging
import urllib.parse
from typing import List, Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup
from config import config

logger = logging.getLogger(__name__)

DUCKDUCKGO_HTML_URL = "https://html.duckduckgo.com/html/"


async def _search_duckduckgo(query: str, max_results: int = 3) -> List[Dict[str, str]]:
    """Query DuckDuckGo HTML endpoint directly and extract clean search results."""
    headers = {
        "User-Agent": config.SEARCH_USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }
    data = {"q": query}

    async with httpx.AsyncClient(
        headers=headers,
        timeout=config.SEARCH_TIMEOUT_SECONDS,
        follow_redirects=True
    ) as client:
        response = await client.post(DUCKDUCKGO_HTML_URL, data=data)
        if response.status_code != 200:
            logger.warning(
                "DuckDuckGo search returned non-200 status: %d", response.status_code
            )
            return []

        soup = BeautifulSoup(response.text, "html.parser")
        results = []

        for result_div in soup.select(".result"):
            title_elem = result_div.select_one(".result__title a")
            snippet_elem = result_div.select_one(".result__snippet")

            if not title_elem:
                continue

            title = title_elem.get_text(strip=True)
            href = title_elem.get("href", "")
            snippet = snippet_elem.get_text(strip=True) if snippet_elem else ""

            if href.startswith("//"):
                href = "https:" + href

            # Decode DuckDuckGo protocol-relative redirect URLs
            parsed = urllib.parse.urlsplit(href)
            if parsed.path.startswith("/l/"):
                qs = urllib.parse.parse_qs(parsed.query)
                target = qs.get("uddg", [""])[0]
                if target:
                    href = urllib.parse.unquote(target)

            # Filter out internal DuckDuckGo ad/promo links and ensure valid scheme
            if href and not ("duckduckgo.com/y.js" in href) and href.startswith(("http://", "https://")):
                results.append({
                    "title": title,
                    "url": href,
                    "snippet": snippet,
                })

            if len(results) >= max_results:
                break

        return results


def _get_mock_search_results(query: str, max_results: int = 3) -> List[Dict[str, str]]:
    """Return deterministic mock search results for unit testing and offline environments."""
    results = [
        {
            "title": f"Mock Documentation: {query} (Part 1)",
            "url": "https://docs.python.org/3/library/mock.html",
            "snippet": f"Official documentation and examples for implementing {query} using standard library.",
        },
        {
            "title": f"Mock Guide: {query} (Part 2)",
            "url": "https://pypi.org/project/mock-guide/",
            "snippet": f"Community guidelines and best practices for {query}.",
        },
        {
            "title": f"Mock Reference: {query} (Part 3)",
            "url": "https://github.com/example/mock-repo",
            "snippet": f"Reference implementation and error solutions for {query}.",
        },
    ]
    return results[:max_results]


async def search_web(query: str, max_results: Optional[int] = None) -> List[Dict[str, str]]:
    """
    Search the internet for technical documentation and return structured results.
    Never raises exceptions; logs warnings and returns an empty list on failure.
    """
    if not query or not query.strip():
        return []

    limit = max_results or config.SEARCH_MAX_RESULTS
    provider = config.SEARCH_PROVIDER.lower()

    if provider in ("none", "disabled", "off"):
        return []

    if provider == "mock":
        return _get_mock_search_results(query.strip(), limit)

    try:
        return await _search_duckduckgo(query.strip(), limit)
    except Exception as e:
        logger.warning("Web search failed for query '%s': %s", query, str(e))
        return []
