"""OpenAI 兼容端点 URL 解析（支持 /v1 与 /api/v3 等常见 base_url）。"""
from __future__ import annotations


def normalize_base_url(base_url: str) -> str:
    return base_url.strip().rstrip("/")


def resolve_openai_compatible_path(base_url: str, resource_path: str) -> str:
    """
    将 base_url 与资源路径拼接为完整 OpenAI 兼容 URL。

    resource_path 示例: "chat/completions" | "models"
    """
    base = normalize_base_url(base_url)
    suffix = resource_path.strip().lstrip("/")
    if base.endswith(f"/{suffix}"):
        return base
    if base.endswith("/v1") or base.endswith("/v3"):
        return f"{base}/{suffix}"
    return f"{base}/v1/{suffix}"


def resolve_chat_url(base_url: str) -> str:
    return resolve_openai_compatible_path(base_url, "chat/completions")


def resolve_models_url(base_url: str) -> str:
    return resolve_openai_compatible_path(base_url, "models")
