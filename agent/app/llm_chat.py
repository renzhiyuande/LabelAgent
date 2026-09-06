from __future__ import annotations

import logging
import time
from typing import Any

import httpx
from pydantic import BaseModel, ConfigDict, Field

from app.core.logging_config import mask_secret, safe_json, summarize_chat_messages
from app.llm_response_format import response_format_attempts, should_retry_with_next_format
from app.llm_url import resolve_chat_url
from app.outbound_url_guard import require_safe_base_url

logger = logging.getLogger(__name__)

__all__ = [
    "ChatCompletionRequest",
    "ChatCompletionResult",
    "ChatMessage",
    "chat_completion",
    "resolve_chat_url",
]


class ChatMessage(BaseModel):
    role: str = Field(min_length=1)
    content: str = ""


class ChatCompletionRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    base_url: str = Field(min_length=1, alias="baseUrl")
    api_key: str = Field(min_length=1, alias="apiKey")
    model: str = Field(min_length=1)
    messages: list[ChatMessage] = Field(min_length=1)
    temperature: float = 0.3
    output_json_schema: dict[str, Any] | None = Field(default=None, alias="outputJsonSchema")


class ChatCompletionResult(BaseModel):
    text: str
    model: str


def _extract_text(body: dict[str, Any], fallback_model: str) -> ChatCompletionResult:
    choices = body.get("choices")
    if not isinstance(choices, list) or not choices:
        raise ValueError("Provider response missing choices")
    first = choices[0]
    if not isinstance(first, dict):
        raise ValueError("Provider response choice is invalid")
    message = first.get("message")
    if not isinstance(message, dict):
        raise ValueError("Provider response message is invalid")
    content = message.get("content")
    if content is None:
        text = ""
    elif isinstance(content, str):
        text = content.strip()
    else:
        text = str(content).strip()
    model = str(body.get("model") or fallback_model).strip()
    return ChatCompletionResult(text=text, model=model)


async def _post_provider_chat(
    *,
    client: httpx.AsyncClient,
    url: str,
    headers: dict[str, str],
    payload: dict[str, Any],
) -> ChatCompletionResult:
    started = time.perf_counter()
    response = await client.post(url, headers=headers, json=payload)
    elapsed_ms = (time.perf_counter() - started) * 1000
    logger.info(
        "provider chat ← status=%s duration=%.1fms body_preview=%s",
        response.status_code,
        elapsed_ms,
        safe_json(response.text, max_len=500),
    )
    response.raise_for_status()
    body = response.json()
    if not isinstance(body, dict):
        raise ValueError("Provider response body is invalid")
    return _extract_text(body, str(payload.get("model") or ""))


async def chat_completion(request: ChatCompletionRequest) -> ChatCompletionResult:
    safe_base_url = require_safe_base_url(request.base_url)
    url = resolve_chat_url(safe_base_url)
    headers = {
        "Authorization": f"Bearer {request.api_key.strip()}",
        "Content-Type": "application/json",
    }
    base_payload: dict[str, Any] = {
        "model": request.model.strip(),
        "messages": [message.model_dump() for message in request.messages],
        "temperature": request.temperature,
    }
    attempts = response_format_attempts(request.output_json_schema)
    last_error: httpx.HTTPStatusError | None = None

    async with httpx.AsyncClient(timeout=120.0) as client:
        for index, response_format in enumerate(attempts):
            payload = dict(base_payload)
            if response_format is not None:
                payload["response_format"] = response_format
            logger.info(
                "provider chat → url=%s model=%s api_key=%s response_format=%s messages=%s",
                url,
                request.model,
                mask_secret(request.api_key),
                safe_json(response_format, max_len=300) if response_format else "-",
                summarize_chat_messages(payload["messages"]),
            )
            try:
                return await _post_provider_chat(client=client, url=url, headers=headers, payload=payload)
            except httpx.HTTPStatusError as exc:
                last_error = exc
                body_preview = exc.response.text if exc.response is not None else ""
                has_next = index < len(attempts) - 1
                if has_next and should_retry_with_next_format(exc.response.status_code, body_preview):
                    logger.warning(
                        "provider chat response_format rejected, retrying next format status=%s preview=%s",
                        exc.response.status_code,
                        safe_json(body_preview, max_len=200),
                    )
                    continue
                raise

    if last_error is not None:
        raise last_error
    raise ValueError("Provider chat failed without response")
