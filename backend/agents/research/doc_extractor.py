"""
Documentation extractor for technical web research.
Fetches HTML from documentation sites and parses clean, grounded technical summaries.
"""
import ipaddress
import logging
import re
import socket
import urllib.parse
from typing import Optional
import httpx
from bs4 import BeautifulSoup
from config import config

logger = logging.getLogger(__name__)

MAX_DOC_CHARS = 2500
MAX_REDIRECTS = 3


def is_safe_url(target_url: str) -> bool:
    """
    Validates that a URL does not point to internal, private, loopback,
    or link-local addresses (SSRF prevention).
    """
    try:
        parsed = urllib.parse.urlsplit(target_url)
        if parsed.scheme not in ("http", "https"):
            return False

        hostname = parsed.hostname
        if not hostname:
            return False

        # Reject loopback and local hostnames directly
        lower_host = hostname.lower()
        if lower_host in ("localhost", "127.0.0.1", "::1") or lower_host.endswith(".local"):
            return False

        # Resolve IP addresses for hostname
        addr_info = socket.getaddrinfo(hostname, None)
        for item in addr_info:
            ip_str = item[4][0]
            ip = ipaddress.ip_address(ip_str)
            if (
                ip.is_private
                or ip.is_loopback
                or ip.is_link_local
                or ip.is_reserved
                or ip.is_multicast
            ):
                return False

        return True
    except Exception:
        return False


def clean_html_to_markdown(html_content: str, max_chars: int = MAX_DOC_CHARS) -> str:
    """
    Strips noise, boilerplate, scripts, and navigation from documentation HTML,
    returning clean, structured technical markdown.
    """
    if not html_content:
        return ""

    soup = BeautifulSoup(html_content, "html.parser")

    # Remove non-content and noisy elements
    for element in soup(["script", "style", "noscript", "header", "footer", "nav", "aside", "svg", "form", "iframe"]):
        element.decompose()

    # Find the main documentation container if available
    content_root = (
        soup.find("main")
        or soup.find("article")
        or soup.find("div", class_=re.compile(r"content|documentation|document|body", re.I))
        or soup.find("div", id=re.compile(r"content|documentation|document|body", re.I))
        or soup.body
        or soup
    )

    extracted_lines = []
    for tag in content_root.find_all(["h1", "h2", "h3", "h4", "p", "pre", "code", "li", "dt", "dd"]):
        if tag.name == "pre":
            pre_code = tag.get_text().strip()
            if pre_code:
                extracted_lines.append(f"\n```python\n{pre_code}\n```\n")
            continue

        text = tag.get_text(separator=" ", strip=True)
        if not text:
            continue

        if tag.name in ["h1", "h2", "h3"]:
            extracted_lines.append(f"\n### {text}\n")
        elif tag.name in ["dt", "li"]:
            extracted_lines.append(f"- {text}")
        elif tag.name == "p":
            extracted_lines.append(text)

    joined = "\n".join(extracted_lines)
    # Collapse multiple consecutive blank lines
    cleaned = re.sub(r"\n{3,}", "\n\n", joined).strip()

    if len(cleaned) > max_chars:
        cleaned = cleaned[:max_chars].rstrip() + "\n... [documentation truncated]"

    return cleaned


async def extract_documentation(url: str, timeout: Optional[int] = None) -> str:
    """
    Fetch a documentation page and extract its structured technical content.
    Enforces SSRF prevention on initial destination and each redirect hop.
    Returns empty string on network failure, SSRF rejection, or HTTP errors.
    """
    if not url or not url.startswith(("http://", "https://")):
        return ""

    headers = {
        "User-Agent": config.SEARCH_USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    request_timeout = timeout or config.SEARCH_TIMEOUT_SECONDS

    current_url = url
    try:
        async with httpx.AsyncClient(
            headers=headers,
            timeout=request_timeout,
            follow_redirects=False,
        ) as client:
            response = None
            for _ in range(MAX_REDIRECTS + 1):
                if not is_safe_url(current_url):
                    logger.warning("SSRF blocked attempt to access unsafe URL: %s", current_url)
                    return ""

                response = await client.get(current_url)
                if response.is_redirect and "location" in response.headers:
                    current_url = urllib.parse.urljoin(current_url, response.headers["location"])
                else:
                    break

            if response is None or response.status_code != 200:
                logger.warning("Doc extraction failed for %s with status %s", url, response.status_code if response else "no response")
                return ""

            return clean_html_to_markdown(response.text)
    except Exception as e:
        logger.warning("Error extracting documentation from %s: %s", url, str(e))
        return ""

