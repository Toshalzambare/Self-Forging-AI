"""
Novel Multi-Signal Hybrid Tool Search Algorithm (Designed From Scratch).
Finds and re-evaluates existing tools in the user's registry before triggering tool forging.

Formulation:
Score = w_intent * S_intent + w_struct * S_struct + w_perf * S_perf
Where:
- S_intent: Contextual Semantic Intent Score (token Jaccard + char 3-gram containment)
- S_struct: Structural Schema Compatibility (parameter signature & entity match)
- S_perf:   Bayesian Performance Prior: gate_score * (1 - 1 / (1 + ln(1 + reuse_count)))
"""
import math
import re
import logging
from typing import Optional, List, Dict, Any, Set
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession
from registry.models import Tool
from registry.repository import RegistryRepository
from config import config

logger = logging.getLogger(__name__)

STOP_WORDS = {
    "a", "an", "the", "in", "on", "at", "to", "for", "of", "and", "or",
    "is", "it", "this", "that", "please", "can", "you", "me", "with", "from"
}


@dataclass
class SearchResult:
    """Encapsulates a ranked search match with multi-factor score breakdown."""
    tool: Tool
    score: float
    breakdown: Dict[str, float]


class HybridToolSearcher:
    """Executes multi-signal hybrid search over active tools in PostgreSQL registry."""

    @staticmethod
    def _tokenize(text: str) -> Set[str]:
        """Normalize and tokenize text into non-empty alphanumeric tokens."""
        if not text:
            return set()
        clean = re.sub(r"[^a-zA-Z0-9_]+", " ", text.lower())
        tokens = {t for t in clean.split() if len(t) > 1 and t not in STOP_WORDS}
        return tokens

    @staticmethod
    def _char_ngrams(text: str, n: int = 3) -> Set[str]:
        """Extract character n-grams from normalized text."""
        clean = re.sub(r"\s+", " ", text.lower()).strip()
        if len(clean) < n:
            return {clean} if clean else set()
        return {clean[i:i + n] for i in range(len(clean) - n + 1)}

    @classmethod
    def _normalize_token(cls, token: str) -> str:
        """Strip hyphens and underscores for unified normalization."""
        return re.sub(r"[-_]", "", token.lower())

    @classmethod
    def _match_tokens(cls, query_token: str, tool_tokens: Set[str]) -> bool:
        """Check exact equality or substring/stemming match between query token and tool tokens."""
        norm_q = cls._normalize_token(query_token)
        if not norm_q or len(norm_q) < 2:
            return False
        for t in tool_tokens:
            norm_t = cls._normalize_token(t)
            if norm_q == norm_t:
                return True
            # Substring containment or stemming match for tokens >= 3 chars (e.g., sha in sha256, hash in hasher)
            if len(norm_q) >= 3 and len(norm_t) >= 3:
                if norm_q in norm_t or norm_t in norm_q:
                    return True
        return False

    @classmethod
    def compute_intent_score(cls, query: str, tool_name: str, tool_desc: str) -> float:
        """
        Compute S_intent in [0.0, 1.0] using query intent coverage,
        character 3-gram containment, and name token containment.
        """
        query_tokens = cls._tokenize(query)
        tool_text = f"{tool_name} {tool_desc or ''}"
        tool_tokens = cls._tokenize(tool_text)

        if not query_tokens or not tool_tokens:
            return 0.0

        # 1. Query token coverage: what proportion of query intent tokens match tool tokens
        matched_tokens = sum(1 for q in query_tokens if cls._match_tokens(q, tool_tokens))
        token_coverage = matched_tokens / len(query_tokens)

        # 2. Query 3-gram coverage: what fraction of query n-grams exist in tool text
        query_ngrams = cls._char_ngrams(query, 3)
        tool_ngrams = cls._char_ngrams(tool_text, 3)
        if query_ngrams and tool_ngrams:
            ngram_coverage = len(query_ngrams.intersection(tool_ngrams)) / len(query_ngrams)
        else:
            ngram_coverage = 0.0

        # 3. Direct name match bonus: check full name or name components
        norm_query = cls._normalize_token(query)
        norm_name = cls._normalize_token(tool_name)
        if norm_name in norm_query:
            name_match = 1.0
        else:
            name_parts = [cls._normalize_token(p) for p in tool_name.split("_") if len(p) >= 3]
            if name_parts:
                matched_parts = sum(1 for p in name_parts if any(cls._match_tokens(p, {q}) for q in query_tokens))
                name_match = matched_parts / len(name_parts)
            else:
                name_match = 0.0

        intent_score = (0.50 * token_coverage) + (0.30 * ngram_coverage) + (0.20 * name_match)
        return min(max(intent_score, 0.0), 1.0)

    @classmethod
    def compute_struct_score(cls, query: str, schema: dict) -> float:
        """
        Compute S_struct in [0.0, 1.0] evaluating parameter signature overlap
        and whether expected argument names are present in the query.
        """
        if not isinstance(schema, dict):
            return 0.5

        properties = (
            schema.get("properties")
            or schema.get("parameters", {}).get("properties")
            or {}
        )

        if not properties:
            # Zero-parameter tool is compatible with short or direct prompts
            return 0.75

        query_tokens = cls._tokenize(query)
        total_params = len(properties)
        matched_params = 0

        for param_name in properties.keys():
            param_tokens = cls._tokenize(param_name)
            if param_tokens and param_tokens.intersection(query_tokens):
                matched_params += 1
            elif param_name.lower() in query.lower():
                matched_params += 1

        # Laplace smoothed match ratio
        score = (matched_params + 1.0) / (total_params + 1.0)
        return min(max(score, 0.0), 1.0)

    @staticmethod
    def compute_perf_score(gate_score: float, reuse_count: int) -> float:
        """
        Compute S_perf in [0.0, 1.0] using Bayesian reliability weighting.
        S_perf = gate_score * (1 - 1 / (1 + ln(1 + reuse_count)))
        """
        base_score = gate_score if (gate_score and gate_score > 0.0) else 0.8
        count = max(reuse_count, 0)

        if count == 0:
            # New tool with verified gate pass gets an optimistic prior (0.75 of base)
            return min(max(base_score * 0.75, 0.0), 1.0)

        reliability = 1.0 - (1.0 / (1.0 + math.log(1.0 + count)))
        perf_score = base_score * (0.5 + 0.5 * reliability)
        return min(max(perf_score, 0.0), 1.0)

    @classmethod
    def score_candidate(cls, query: str, tool: Tool) -> SearchResult:
        """Score a single tool candidate across intent, structure, and performance."""
        s_intent = cls.compute_intent_score(query, tool.name, tool.description or "")
        s_struct = cls.compute_struct_score(query, tool.schema_json or {})
        s_perf = cls.compute_perf_score(tool.gate_score, tool.reuse_count)

        w1 = config.HYBRID_WEIGHT_INTENT
        w2 = config.HYBRID_WEIGHT_STRUCT
        w3 = config.HYBRID_WEIGHT_PERF

        # Normalize weights so sum is 1.0
        total_w = w1 + w2 + w3 or 1.0
        w1, w2, w3 = w1 / total_w, w2 / total_w, w3 / total_w

        total_score = (w1 * s_intent) + (w2 * s_struct) + (w3 * s_perf)

        return SearchResult(
            tool=tool,
            score=round(total_score, 4),
            breakdown={
                "intent": round(s_intent, 4),
                "struct": round(s_struct, 4),
                "perf": round(s_perf, 4),
            }
        )

    @classmethod
    async def search(
        cls,
        db: AsyncSession,
        task: str,
        user_id: Optional[str] = None,
        threshold: Optional[float] = None,
    ) -> Optional[SearchResult]:
        """
        Search active tools for user (including shared global tools).
        Returns top matching SearchResult if score >= threshold, else None.
        """
        if not task or not task.strip():
            return None

        min_score = threshold if threshold is not None else config.HYBRID_SEARCH_THRESHOLD

        # Fetch active tools for this user (and strictly global tools where user_id is None)
        user_tools = await RegistryRepository.list_tools(db, user_id=user_id) if user_id else []
        global_tools = await RegistryRepository.list_global_tools(db)

        # Deduplicate
        seen_ids = set()
        candidates: List[Tool] = []
        for t in user_tools + global_tools:
            if t.id not in seen_ids and t.status == "active":
                seen_ids.add(t.id)
                candidates.append(t)

        if not candidates:
            return None

        scored: List[SearchResult] = [cls.score_candidate(task, t) for t in candidates]
        scored.sort(key=lambda x: x.score, reverse=True)

        top_match = scored[0]
        logger.info(
            "Hybrid search evaluated %d candidates. Top match: '%s' (Score: %.4f, Threshold: %.4f)",
            len(candidates), top_match.tool.name, top_match.score, min_score
        )

        if top_match.score >= min_score:
            return top_match

        return None
