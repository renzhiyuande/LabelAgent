from __future__ import annotations

import logging
import time

import httpx
from pydantic import BaseModel, ConfigDict, Field

from app.core.logging_config import mask_secret, safe_json
from app.llm_url import resolve_models_url
from app.outbound_url_guard import require_safe_base_url

logger = logging.getLogger(__name__)


class ListModelsRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    base_url: str = Field(min_length=1, alias="baseUrl")
    api_key: str = Field(min_length=1, alias="apiKey")
    provider_code: str = Field(default="", alias="providerCode")


class RemoteModelOption(BaseModel):
    model_code: str
    model_name: str
    model_type: str


def infer_model_type(model_id: str) -> str:
    lowered = model_id.lower()
    if "embed" in lowered:
        return "EMBEDDING"
    if lowered.startswith("text-") and "embedding" in lowered:
        return "EMBEDDING"
    return "CHAT"


def unsupported_list_models_message(provider_code: str, status_code: int) -> str:
    provider = provider_code.strip() if provider_code else "该提供商"
    return (
        f"提供商 [{provider}] 不支持 OpenAI 兼容的模型列表接口 (HTTP {status_code})，"
        "请在平台「LLM 模型管理」中手动维护模型目录"
    )


async def fetch_remote_models(request: ListModelsRequest) -> list[RemoteModelOption]:
    safe_base_url = require_safe_base_url(request.base_url)
    url = resolve_models_url(safe_base_url)
    headers = {"Authorization": f"Bearer {request.api_key.strip()}"}
    logger.info(
        "provider list-models → url=%s provider=%s api_key=%s",
        url,
        request.provider_code or "-",
        mask_secret(request.api_key),
    )
    started = time.perf_counter()
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, headers=headers)
        elapsed_ms = (time.perf_counter() - started) * 1000
        logger.info(
            "provider list-models ← status=%s duration=%.1fms body_preview=%s",
            response.status_code,
            elapsed_ms,
            safe_json(response.text, max_len=500),
        )
        if response.status_code in {404, 405}:
            raise httpx.HTTPStatusError(
                unsupported_list_models_message(request.provider_code, response.status_code),
                request=response.request,
                response=response,
            )
        response.raise_for_status()
        payload = response.json()

    raw_items = payload.get("data")
    if not isinstance(raw_items, list):
        return []

    options: list[RemoteModelOption] = []
    seen: set[str] = set()
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        model_id = str(item.get("id") or item.get("model") or "").strip()
        if not model_id or model_id in seen:
            continue
        seen.add(model_id)
        options.append(
            RemoteModelOption(
                model_code=model_id,
                model_name=str(item.get("name") or model_id),
                model_type=infer_model_type(model_id),
            )
        )

    options.sort(key=lambda option: option.model_code.lower())
    return options
