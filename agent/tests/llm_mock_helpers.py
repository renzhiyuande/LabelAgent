"""Shared LLM client mocks for agent tests."""
from __future__ import annotations

from typing import Any

from app.services.llm_client import LlmJsonCallResult


def llm_json_result(
    payload: dict[str, Any],
    *,
    latency_ms: float = 1.0,
    client_request_id: str = "test-request",
    completion_id: str | None = "test-completion",
) -> LlmJsonCallResult:
    return LlmJsonCallResult(
        payload=payload,
        latency_ms=latency_ms,
        client_request_id=client_request_id,
        completion_id=completion_id,
    )
