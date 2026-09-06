"""单次请求的 LLM 运行时配置（无状态，由 Backend 或平台 Profile 注入）。"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

DEEPSEEK_PLATFORM_KEY = "deepseek"
DEEPSEEK_DEFAULT_BASE_URL = "https://api.deepseek.com"
DEEPSEEK_DEFAULT_MODEL = "deepseek-v4-flash"

# 兼容旧 seed / 模板仍引用 doubao 目录的场景。
LEGACY_PLATFORM_ALIASES: dict[str, str] = {
    "doubao": DEEPSEEK_PLATFORM_KEY,
}
LEGACY_MODEL_ALIASES: dict[str, str] = {
    "doubao-pro": DEEPSEEK_DEFAULT_MODEL,
    "doubao-lite": "deepseek-chat",
}

PLACEHOLDER_API_KEYS = frozenset(
    {
        "",
        "change-me",
        "your-api-key",
        "sk-placeholder",
        "replace-me",
    }
)


def _parse_supports_seed(raw: Any) -> bool:
    if raw is None:
        return True
    if isinstance(raw, bool):
        return raw
    return str(raw).strip().lower() not in {"false", "0", "no", "off"}


def _normalize_platform_key(platform_key: str | None) -> str | None:
    if not platform_key or not str(platform_key).strip():
        return None
    normalized = str(platform_key).strip().lower()
    return LEGACY_PLATFORM_ALIASES.get(normalized, normalized)


def _normalize_model_id(model_id: str | None) -> str | None:
    if not model_id or not str(model_id).strip():
        return None
    model = str(model_id).strip()
    if "/" in model:
        model = model.rsplit("/", 1)[-1].strip()
    return LEGACY_MODEL_ALIASES.get(model, model)


def _is_placeholder_api_key(api_key: str) -> bool:
    normalized = api_key.strip().lower()
    return normalized in PLACEHOLDER_API_KEYS


@dataclass(frozen=True)
class LlmRuntimeConfig:
    base_url: str
    api_key: str
    model: str
    timeout_seconds: int = 60
    platform_key: str | None = None
    supports_seed: bool = True


def resolve_llm_runtime(
    *,
    platform_key: str | None,
    model_id: str | None,
    llm_base_url: str | None = None,
    llm_api_key: str | None = None,
    settings: Any | None = None,
) -> LlmRuntimeConfig:
    """解析本次预审使用的 LLM 连接：请求字段 > 平台 Profile > 环境默认。"""
    if settings is None:
        from app.core.config import get_settings

        settings = get_settings()

    normalized_platform = _normalize_platform_key(platform_key)
    normalized_model = _normalize_model_id(model_id)

    profile: dict[str, Any] = {}
    if normalized_platform:
        profile = dict(settings.platform_profiles_map.get(normalized_platform, {}))
        if not profile and platform_key:
            original = str(platform_key).strip().lower()
            if original != normalized_platform:
                profile = dict(settings.platform_profiles_map.get(original, {}))

    base_url = (llm_base_url or profile.get("base_url") or profile.get("baseUrl") or "").strip()
    api_key = (llm_api_key or profile.get("api_key") or profile.get("apiKey") or "").strip()
    model = (normalized_model or profile.get("model") or "").strip()

    if not base_url:
        if normalized_platform == DEEPSEEK_PLATFORM_KEY:
            base_url = (settings.openai_base_url or DEEPSEEK_DEFAULT_BASE_URL).strip()
        else:
            base_url = (settings.openai_base_url or "").strip()

    if not api_key:
        api_key = (settings.openai_api_key or "").strip()

    if not model:
        if normalized_platform == DEEPSEEK_PLATFORM_KEY:
            model = (settings.openai_model or DEEPSEEK_DEFAULT_MODEL).strip()
        else:
            model = (settings.openai_model or "").strip()

    if not base_url:
        raise ValueError("LLM base_url is required")
    if not api_key or _is_placeholder_api_key(api_key):
        raise ValueError(
            "LLM api_key is required; configure LABELHUB_AGENT_OPENAI_API_KEY "
            "or pass llmApiKey from backend llm_providers (deepseek provider)"
        )
    if not model:
        raise ValueError("LLM model is required")

    supports_seed = _parse_supports_seed(profile.get("supports_seed", profile.get("supportsSeed")))

    return LlmRuntimeConfig(
        base_url=base_url.rstrip("/"),
        api_key=api_key,
        model=model,
        timeout_seconds=settings.openai_timeout_seconds,
        platform_key=normalized_platform,
        supports_seed=supports_seed,
    )
