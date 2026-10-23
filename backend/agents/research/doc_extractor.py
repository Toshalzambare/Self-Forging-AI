"""
Documentation extractor for technical web research.
Fetches HTML from documentation sites and parses clean, grounded technical summaries.
"""
import asyncio
import functools
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


async def is_safe_url_async(target_url: str) -> bool:
    """Non-blocking async wrapper for SSRF URL validation."""
    return await asyncio.to_thread(is_safe_url, target_url)


def is_safe_ip(ip_str: str) -> bool:
    """Check if an IP string is globally routable and public."""
    try:
        ip = ipaddress.ip_address(ip_str)
        if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
            ip = ip.ipv4_mapped
        return ip.is_global and not ip.is_multicast
    except Exception:
        return False


def resolve_safe_target(target_url: str) -> Optional[tuple[str, str, Optional[str]]]:
    """
    Validates that a URL does not point to internal, private, loopback,
    or link-local addresses, and resolves hostname to a validated safe IP.
    Returns (bound_url, host_header, sni_hostname) or None if unsafe.
    Directly binding requests to the validated IP prevents DNS rebinding (TOCTOU).
    """
    try:
        parsed = urllib.parse.urlsplit(target_url)
        if parsed.scheme not in ("http", "https"):
            return None

        hostname = parsed.hostname
        if not hostname:
            return None

        lower_host = hostname.lower()
        if lower_host in ("localhost", "127.0.0.1", "::1") or lower_host.endswith(".local"):
            return None

        # If literal IP, check directly without DNS
        try:
            lit_ip = ipaddress.ip_address(lower_host)
            if not is_safe_ip(str(lit_ip)):
                return None
            bound_ip = str(lit_ip)
        except ValueError:
            # Fresh DNS resolution and verify all returned records are public
            addr_info = socket.getaddrinfo(hostname, None)
            if not addr_info:
                return None
            for item in addr_info:
                ip_str = item[4][0]
                if not is_safe_ip(ip_str):
                    return None
            bound_ip = addr_info[0][4][0]

        ip_host = f"[{bound_ip}]" if ":" in bound_ip else bound_ip
        port_str = f":{parsed.port}" if parsed.port else ""
        path = parsed.path or "/"
        if parsed.query:
            path += f"?{parsed.query}"
        bound_url = f"{parsed.scheme}://{ip_host}{port_str}{path}"
        host_header = f"{hostname}{port_str}"
        sni_hostname = hostname if parsed.scheme == "https" else None
        return bound_url, host_header, sni_hostname
    except Exception:
        return None


async def resolve_safe_target_async(target_url: str) -> Optional[tuple[str, str, Optional[str]]]:
    """Non-blocking async wrapper for resolve_safe_target."""
    return await asyncio.to_thread(resolve_safe_target, target_url)


def is_safe_url(target_url: str) -> bool:
    """Check if target_url resolves to a verified safe public IP."""
    return resolve_safe_target(target_url) is not None


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
                target = await resolve_safe_target_async(current_url)
                if not target:
                    logger.warning("SSRF blocked attempt to access unsafe URL: %s", current_url)
                    return ""
                bound_url, host_header, sni_hostname = target
                req_headers = dict(headers)
                req_headers["Host"] = host_header
                ext = {"sni_hostname": sni_hostname} if sni_hostname else None
                response = await client.get(bound_url, headers=req_headers, extensions=ext)
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

