"""
Document Text Extraction Service.
Extracts clean, readable text from PDFs, Markdown, Text, CSV, JSON, and source code files.
"""

import io
import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Maximum characters extracted into context to prevent memory/token overflows
MAX_EXTRACTED_CHARS = 100_000


def extract_text_from_pdf(content: bytes) -> str:
    """Extract readable text from PDF bytes using pypdf."""
    try:
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(content))
        if reader.is_encrypted:
            try:
                reader.decrypt("")
            except Exception:
                return "[Error: PDF is encrypted and requires a password]"

        extracted_pages = []
        for idx, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            if page_text.strip():
                extracted_pages.append(f"--- Page {idx + 1} ---\n{page_text.strip()}")

        if not extracted_pages:
            return "[Notice: PDF contains no extractable text or consists solely of scanned images]"

        combined = "\n\n".join(extracted_pages)
        if len(combined) > MAX_EXTRACTED_CHARS:
            return combined[:MAX_EXTRACTED_CHARS] + f"\n\n... [Truncated: exceeded {MAX_EXTRACTED_CHARS} chars]"
        return combined
    except Exception as exc:
        logger.warning("Failed extracting text from PDF: %s", str(exc))
        return f"[Error extracting PDF text: {str(exc)}]"


def extract_text_from_document(filename: str, content: bytes, content_type: str = "") -> str:
    """
    Main extraction dispatcher.
    Supports PDF, plaintext, markdown, JSON, CSV, and code documents.
    """
    lower_name = (filename or "").lower()
    lower_type = (content_type or "").lower()

    # 1. PDF
    if lower_name.endswith(".pdf") or "application/pdf" in lower_type:
        return extract_text_from_pdf(content)

    # 2. Text / Code / Data formats
    try:
        # Try UTF-8 decode
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        try:
            # Fallback to latin-1
            text = content.decode("latin-1")
        except Exception as exc:
            logger.warning("Unable to decode document '%s': %s", filename, str(exc))
            return f"[Binary or unsupported encoding: {filename}]"

    # Pretty-format JSON if valid
    if lower_name.endswith(".json") or "application/json" in lower_type:
        try:
            parsed = json.loads(text)
            text = json.dumps(parsed, indent=2)
        except Exception:
            pass

    if len(text) > MAX_EXTRACTED_CHARS:
        return text[:MAX_EXTRACTED_CHARS] + f"\n\n... [Truncated: exceeded {MAX_EXTRACTED_CHARS} chars]"

    return text
