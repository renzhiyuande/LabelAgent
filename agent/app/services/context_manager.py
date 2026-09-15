"""Deterministic selection for already-provided review context.

This module does not retrieve memory or call embeddings.  It only governs the
context items already supplied by the caller before they are inserted into the
LLM message list.
"""
from __future__ import annotations

import hashlib
import json
from collections import Counter
from dataclasses import dataclass
from typing import Any

from app.schemas.context_management import (
    ContextSelectionPolicy,
    ContextSelectionStats,
    ManagedContextResult,
)


@dataclass(frozen=True, slots=True)
class _ContextCandidate:
    index: int
    item: dict[str, Any]
    context_type: str
    priority: int
    dedup_key: str


class ContextManager:
    TYPE_KEYS = ("contextType", "context_type", "type", "kind")
    PRIORITY_KEYS = ("priority", "contextPriority", "context_priority")
    ID_KEYS = ("contextId", "context_id", "caseId", "case_id", "ruleId", "rule_id", "id")

    @staticmethod
    def _canonical_json(item: dict[str, Any]) -> str:
        return json.dumps(item, ensure_ascii=False, sort_keys=True, separators=(",", ":"), default=str)

    @staticmethod
    def _serialized_items_size(items: list[dict[str, Any]]) -> int:
        if not items:
            return 0
        return len(json.dumps(items, ensure_ascii=False, indent=2, default=str))

    @classmethod
    def _context_type(cls, item: dict[str, Any]) -> str:
        for key in cls.TYPE_KEYS:
            value = item.get(key)
            if value is not None and str(value).strip():
                return str(value).strip().lower()
        return "generic"

    @classmethod
    def _priority(cls, item: dict[str, Any], context_type: str, policy: ContextSelectionPolicy) -> int:
        for key in cls.PRIORITY_KEYS:
            value = item.get(key)
            if value is None:
                continue
            try:
                return int(value)
            except (TypeError, ValueError):
                break
        return int(policy.type_priorities.get(context_type, policy.default_priority))

    @classmethod
    def _dedup_key(cls, item: dict[str, Any], context_type: str, canonical: str) -> str:
        for key in cls.ID_KEYS:
            value = item.get(key)
            if value is not None and str(value).strip():
                return f"{context_type}:id:{str(value).strip()}"
        digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
        return f"{context_type}:sha256:{digest}"

    @classmethod
    def _candidate(
        cls,
        *,
        index: int,
        item: dict[str, Any],
        policy: ContextSelectionPolicy,
    ) -> _ContextCandidate:
        normalized = dict(item)
        context_type = cls._context_type(normalized)
        canonical = cls._canonical_json(normalized)
        return _ContextCandidate(
            index=index,
            item=normalized,
            context_type=context_type,
            priority=cls._priority(normalized, context_type, policy),
            dedup_key=cls._dedup_key(normalized, context_type, canonical),
        )

    def select(
        self,
        context_items: list[dict[str, Any]] | None,
        *,
        policy: ContextSelectionPolicy | None = None,
    ) -> ManagedContextResult:
        policy = policy or ContextSelectionPolicy()
        raw_items = list(context_items or [])
        candidates = [
            self._candidate(index=index, item=item, policy=policy)
            for index, item in enumerate(raw_items)
            if isinstance(item, dict)
        ]

        # Highest priority wins duplicate IDs/content; original order breaks ties.
        candidates.sort(key=lambda candidate: (-candidate.priority, candidate.index))

        seen: set[str] = set()
        type_counts: Counter[str] = Counter()
        selected: list[dict[str, Any]] = []
        selected_chars = 0
        deduplicated_count = 0
        item_limit_rejected_count = 0
        char_budget_rejected_count = 0
        type_limit_rejected_count = 0

        for candidate in candidates:
            if candidate.dedup_key in seen:
                deduplicated_count += 1
                continue
            seen.add(candidate.dedup_key)

            type_limit = policy.per_type_limits.get(candidate.context_type)
            if type_limit is not None and type_counts[candidate.context_type] >= max(0, int(type_limit)):
                type_limit_rejected_count += 1
                continue

            if len(selected) >= policy.max_items:
                item_limit_rejected_count += 1
                continue

            projected = [*selected, candidate.item]
            projected_chars = self._serialized_items_size(projected)
            if projected_chars > policy.max_chars:
                char_budget_rejected_count += 1
                continue

            selected = projected
            selected_chars = projected_chars
            type_counts[candidate.context_type] += 1

        dropped_count = len(raw_items) - len(selected)
        stats = ContextSelectionStats(
            input_count=len(raw_items),
            selected_count=len(selected),
            dropped_count=dropped_count,
            deduplicated_count=deduplicated_count,
            item_limit_rejected_count=item_limit_rejected_count,
            char_budget_rejected_count=char_budget_rejected_count,
            type_limit_rejected_count=type_limit_rejected_count,
            selected_chars=selected_chars,
        )
        return ManagedContextResult(items=selected, stats=stats)
