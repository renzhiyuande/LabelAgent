"""将业务 JSON Schema 映射为 OpenAI 兼容 response_format，并在必要时降级。"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

JSON_SCHEMA_RESPONSE_NAME = "llm_suggest_output"


def has_output_properties(schema: dict[str, Any] | None) -> bool:
    if not schema or not isinstance(schema, dict):
        return False
    properties = schema.get("properties")
    return isinstance(properties, dict) and len(properties) > 0


def build_json_schema_response_format(schema: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "json_schema",
        "json_schema": {
            "name": JSON_SCHEMA_RESPONSE_NAME,
            "strict": True,
            "schema": schema,
        },
    }


def build_json_object_response_format() -> dict[str, Any]:
    return {"type": "json_object"}


def response_format_attempts(schema: dict[str, Any] | None) -> list[dict[str, Any] | None]:
    """按优先级返回待尝试的 response_format 列表。"""
    if not has_output_properties(schema):
        return [None]
    assert schema is not None
    return [
        build_json_schema_response_format(schema),
        build_json_object_response_format(),
        None,
    ]


def should_retry_with_next_format(status_code: int, body_preview: str) -> bool:
    if status_code not in (400, 404, 422):
        return False
    lowered = body_preview.lower()
    markers = (
        "response_format",
        "json_schema",
        "json_object",
        "structured",
        "not support",
        "unsupported",
        "invalid",
    )
    return any(marker in lowered for marker in markers)
