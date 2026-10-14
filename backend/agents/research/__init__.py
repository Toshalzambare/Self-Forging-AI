"""
Autonomous Web Research & Documentation Retrieval Package.
"""
from agents.research.engine import ResearchEngine
from agents.research.search_client import search_web
from agents.research.doc_extractor import extract_documentation

__all__ = ["ResearchEngine", "search_web", "extract_documentation"]
