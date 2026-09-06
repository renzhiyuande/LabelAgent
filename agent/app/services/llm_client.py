"""
大模型统一客户端模块
封装 OpenAI 官方 SDK，支持按请求注入 LlmRuntimeConfig（多平台 / 多模型）。
"""
from __future__ import annotations

import json
import logging
import time
import uuid
from dataclasses import dataclass
from typing import Any, Type, TypeVar

from openai import OpenAI
from openai.types.chat import ChatCompletion
from pydantic import BaseModel

from app.core.config import Settings, get_settings
from app.core.llm_runtime import LlmRuntimeConfig, resolve_llm_runtime
from app.core.logging_config import get_trace_id, mask_secret, safe_json, summarize_chat_messages
from app.services.prompt_service import PromptService

T = TypeVar("T", bound=BaseModel)
logger = logging.getLogger(__name__)


def _looks_like_unsupported_seed_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return (
        "seed" in message
        or "unknown parameter" in message
        or "unrecognized" in message
        or "unsupported" in message
        or "invalid" in message and "parameter" in message
    )


@dataclass(frozen=True)
class LlmJsonCallResult:
    payload: dict[str, Any]
    latency_ms: float
    client_request_id: str
    completion_id: str | None = None
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None


class LLMClient:
    """OpenAI 兼容大模型客户端，每次调用可指定独立 runtime。"""

    def __init__(self, settings: Settings | None = None, prompt_service: PromptService | None = None) -> None:
        self.settings = settings or get_settings()
        self.prompt_service = prompt_service or PromptService()

    def default_runtime(self) -> LlmRuntimeConfig:
        return resolve_llm_runtime(platform_key=None, model_id=None, settings=self.settings)

    def _openai_client(self, runtime: LlmRuntimeConfig) -> OpenAI:
        return OpenAI(
            base_url=runtime.base_url.rstrip("/"),
            api_key=runtime.api_key,
            timeout=runtime.timeout_seconds,
        )

    def call_openai_compatible(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        llm_runtime: LlmRuntimeConfig | None = None,
    ) -> dict[str, Any]:
        runtime = llm_runtime or self.default_runtime()
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        return self._invoke_chat_json(
            runtime=runtime,
            messages=messages,
            temperature=0,
            mode="openai_compatible",
        ).payload

    @staticmethod
    def _resolve_client_request_id(explicit: str | None = None) -> str:
        if explicit and explicit.strip():
            return explicit.strip()
        trace = get_trace_id()
        if trace and trace != "-":
            return trace
        return f"agent-{uuid.uuid4().hex}"

    def _invoke_chat_json(
        self,
        *,
        runtime: LlmRuntimeConfig,
        messages: list[dict[str, str]],
        temperature: float,
        mode: str,
        seed: int | None = None,
        client_request_id: str | None = None,
    ) -> LlmJsonCallResult:
        resolved_request_id = self._resolve_client_request_id(client_request_id)
        logger.info(
            "openai sdk chat → mode=%s base_url=%s model=%s api_key=%s temperature=%s "
            "client_request_id=%s seed=%s messages=%s",
            mode,
            runtime.base_url,
            runtime.model,
            mask_secret(runtime.api_key),
            temperature,
            resolved_request_id,
            seed,
            summarize_chat_messages(messages),
        )
        started = time.perf_counter()
        create_kwargs: dict[str, Any] = {
            "model": runtime.model,
            "messages": messages,
            "temperature": temperature,
            "response_format": {"type": "json_object"},
            "extra_headers": {"X-Request-ID": resolved_request_id},
        }
        if seed is not None and runtime.supports_seed:
            create_kwargs["seed"] = seed
        if temperature == 0:
            create_kwargs["top_p"] = 1
        client = self._openai_client(runtime)
        try:
            response: ChatCompletion = client.chat.completions.create(**create_kwargs)
        except Exception as exc:
            if seed is not None and runtime.supports_seed and _looks_like_unsupported_seed_error(exc):
                logger.warning(
                    "Provider rejected seed=%s (mode=%s), retrying without seed: %s",
                    seed,
                    mode,
                    exc,
                )
                create_kwargs.pop("seed", None)
                response = client.chat.completions.create(**create_kwargs)
            else:
                raise
        elapsed_ms = (time.perf_counter() - started) * 1000
        content = response.choices[0].message.content
        completion_id = getattr(response, "id", None)
        logger.info(
            "openai sdk chat ← mode=%s client_request_id=%s completion_id=%s duration=%.1fms "
            "content_len=%s preview=%s",
            mode,
            resolved_request_id,
            completion_id or "-",
            elapsed_ms,
            len(content or ""),
            safe_json(content, max_len=300),
        )
        payload = json.loads(content) if content else {}
        usage = getattr(response, "usage", None)
        prompt_tokens = getattr(usage, "prompt_tokens", None) if usage is not None else None
        completion_tokens = getattr(usage, "completion_tokens", None) if usage is not None else None
        total_tokens = getattr(usage, "total_tokens", None) if usage is not None else None
        return LlmJsonCallResult(
            payload=payload,
            latency_ms=elapsed_ms,
            client_request_id=resolved_request_id,
            completion_id=completion_id,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
        )

    def call_with_full_messages(
        self,
        *,
        messages: list[dict[str, str]],
        llm_runtime: LlmRuntimeConfig | None = None,
        temperature: float = 0.0,
        seed: int | None = None,
        client_request_id: str | None = None,
    ) -> LlmJsonCallResult:
        runtime = llm_runtime or self.default_runtime()
        return self._invoke_chat_json(
            runtime=runtime,
            messages=messages,
            temperature=temperature,
            mode="full_messages",
            seed=seed,
            client_request_id=client_request_id,
        )

    def call_with_structured_output(
        self,
        *,
        messages: list[dict[str, str]],
        response_model: Type[T],
        llm_runtime: LlmRuntimeConfig | None = None,
        temperature: float = 0.0,
    ) -> T:
        runtime = llm_runtime or self.default_runtime()
        logger.info(
            "openai sdk parse → base_url=%s model=%s api_key=%s response_model=%s messages=%s",
            runtime.base_url,
            runtime.model,
            mask_secret(runtime.api_key),
            response_model.__name__,
            summarize_chat_messages(messages),
        )
        started = time.perf_counter()
        parsed = self._openai_client(runtime).beta.chat.completions.parse(
            model=runtime.model,
            messages=messages,
            temperature=temperature,
            response_format=response_model,
        ).choices[0].message.parsed
        elapsed_ms = (time.perf_counter() - started) * 1000
        logger.info("openai sdk parse ← duration=%.1fms parsed=%s", elapsed_ms, parsed is not None)
        return parsed
