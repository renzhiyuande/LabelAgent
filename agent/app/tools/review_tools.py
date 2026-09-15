"""Deterministic read-only tools for the review agent.

These tools never mutate business state.  They only inspect the request payload
and already-selected memory context so the model can gather evidence before the
final structured review.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any, Callable

from pydantic import BaseModel, ValidationError

from app.schemas.agent_runtime import (
    CompareFieldsArgs,
    RequiredFieldsArgs,
    SearchMemoryArgs,
    ToolName,
)


@dataclass(frozen=True)
class ReviewToolContext:
    source_data: dict[str, Any]
    label_data: dict[str, Any]
    memory_context: list[dict[str, Any]]


@dataclass(frozen=True)
class ToolSpec:
    name: ToolName
    description: str
    args_model: type[BaseModel]
    handler: Callable[[BaseModel, ReviewToolContext], dict[str, Any]]

    def planner_schema(self) -> dict[str, Any]:
        return {
            "name": self.name.value,
            "description": self.description,
            "parameters": self.args_model.model_json_schema(),
        }


class ToolExecutionError(ValueError):
    pass


def _resolve_path(payload: Any, path: str) -> tuple[bool, Any]:
    """Resolve a conservative dotted path with optional integer list indexes."""

    current = payload
    for part in path.split("."):
        token = part.strip()
        if not token:
            return False, None
        if isinstance(current, dict):
            if token not in current:
                return False, None
            current = current[token]
            continue
        if isinstance(current, list) and token.isdigit():
            index = int(token)
            if index < 0 or index >= len(current):
                return False, None
            current = current[index]
            continue
        return False, None
    return True, current


def _is_empty(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    if isinstance(value, (list, dict, tuple, set)):
        return len(value) == 0
    return False


def _normalize_text(value: Any) -> str:
    text = str(value if value is not None else "")
    return re.sub(r"\s+", " ", text).strip().casefold()


def _check_required_fields(args: BaseModel, context: ReviewToolContext) -> dict[str, Any]:
    parsed = RequiredFieldsArgs.model_validate(args.model_dump())
    rows: list[dict[str, Any]] = []
    for path in parsed.fields:
        exists, value = _resolve_path(context.label_data, path)
        rows.append(
            {
                "path": path,
                "exists": exists,
                "empty": (not exists) or _is_empty(value),
                "valueType": type(value).__name__ if exists else None,
            }
        )
    missing = [row["path"] for row in rows if not row["exists"]]
    empty = [row["path"] for row in rows if row["exists"] and row["empty"]]
    return {
        "fields": rows,
        "missingFields": missing,
        "emptyFields": empty,
        "complete": not missing and not empty,
    }


def _compare_fields(args: BaseModel, context: ReviewToolContext) -> dict[str, Any]:
    parsed = CompareFieldsArgs.model_validate(args.model_dump(by_alias=True))
    rows: list[dict[str, Any]] = []
    for pair in parsed.pairs:
        source_exists, source_value = _resolve_path(context.source_data, pair.source_path)
        label_exists, label_value = _resolve_path(context.label_data, pair.label_path)
        if source_exists and label_exists:
            if pair.normalize_text:
                equal = _normalize_text(source_value) == _normalize_text(label_value)
            else:
                equal = source_value == label_value
        else:
            equal = False
        rows.append(
            {
                "sourcePath": pair.source_path,
                "labelPath": pair.label_path,
                "sourceExists": source_exists,
                "labelExists": label_exists,
                "equal": equal,
            }
        )
    return {
        "comparisons": rows,
        "allEqual": bool(rows) and all(row["equal"] for row in rows),
        "mismatchCount": sum(not row["equal"] for row in rows),
    }


def _search_review_memory(args: BaseModel, context: ReviewToolContext) -> dict[str, Any]:
    parsed = SearchMemoryArgs.model_validate(args.model_dump())
    query_terms = [term for term in re.split(r"\s+", parsed.query.casefold()) if term]
    scored: list[tuple[int, int, dict[str, Any]]] = []
    for index, item in enumerate(context.memory_context):
        serialized = json.dumps(item, ensure_ascii=False, sort_keys=True, default=str).casefold()
        score = sum(serialized.count(term) for term in query_terms)
        if score > 0:
            scored.append((score, -index, item))
    scored.sort(reverse=True, key=lambda row: (row[0], row[1]))
    matches = [item for _, _, item in scored[: parsed.limit]]
    return {
        "query": parsed.query,
        "matchCount": len(matches),
        "matches": matches,
    }


class ReviewToolRegistry:
    """Whitelist registry with schema validation before every tool invocation."""

    def __init__(self) -> None:
        specs = [
            ToolSpec(
                name=ToolName.CHECK_REQUIRED_FIELDS,
                description=(
                    "Check whether specific dotted paths exist and are non-empty in the labeler's submission."
                ),
                args_model=RequiredFieldsArgs,
                handler=_check_required_fields,
            ),
            ToolSpec(
                name=ToolName.COMPARE_FIELDS,
                description=(
                    "Deterministically compare selected source-data paths with submission paths. "
                    "Use only when the task defines comparable fields."
                ),
                args_model=CompareFieldsArgs,
                handler=_compare_fields,
            ),
            ToolSpec(
                name=ToolName.SEARCH_REVIEW_MEMORY,
                description=(
                    "Search the already-authorized review memory context using simple lexical matching."
                ),
                args_model=SearchMemoryArgs,
                handler=_search_review_memory,
            ),
        ]
        self._specs = {spec.name.value: spec for spec in specs}

    def planner_schemas(self) -> list[dict[str, Any]]:
        return [self._specs[name].planner_schema() for name in sorted(self._specs)]

    def names(self) -> list[str]:
        return sorted(self._specs)

    def execute(
        self,
        *,
        name: str,
        arguments: dict[str, Any],
        context: ReviewToolContext,
    ) -> dict[str, Any]:
        spec = self._specs.get(name)
        if spec is None:
            raise ToolExecutionError(f"unknown tool: {name}")
        try:
            parsed = spec.args_model.model_validate(arguments)
        except ValidationError as exc:
            raise ToolExecutionError(f"invalid arguments for {name}: {exc}") from exc
        return spec.handler(parsed, context)
