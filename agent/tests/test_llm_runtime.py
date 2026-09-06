"""Tests for LLM runtime resolution."""
from __future__ import annotations

import pytest

from app.core.config import Settings
from app.core.llm_runtime import resolve_llm_runtime


def test_resolve_llm_runtime_uses_request_model_id() -> None:
    runtime = resolve_llm_runtime(
        platform_key="openai",
        model_id="custom-model",
        settings=Settings(
            openai_base_url="https://default.example/v1",
            openai_api_key="default-key",
            openai_model="default-model",
        ),
    )
    assert runtime.model == "custom-model"
    assert runtime.base_url == "https://default.example/v1"
    assert runtime.api_key == "default-key"


def test_resolve_llm_runtime_uses_platform_profile() -> None:
    runtime = resolve_llm_runtime(
        platform_key="doubao",
        model_id=None,
        settings=Settings(
            openai_base_url="https://default.example/v1",
            openai_api_key="default-key",
            openai_model="default-model",
            platform_profiles=(
                '{"doubao":{"base_url":"https://doubao.example/v1","api_key":"db-key","model":"seed-model"}}'
            ),
        ),
    )
    assert runtime.base_url == "https://doubao.example/v1"
    assert runtime.api_key == "db-key"
    assert runtime.model == "seed-model"


def test_resolve_llm_runtime_request_overrides_profile() -> None:
    runtime = resolve_llm_runtime(
        platform_key="doubao",
        model_id="override-model",
        llm_base_url="https://direct.example/v1",
        llm_api_key="direct-key",
        settings=Settings(
            platform_profiles='{"doubao":{"base_url":"https://doubao.example/v1","api_key":"db-key"}}'
        ),
    )
    assert runtime.base_url == "https://direct.example/v1"
    assert runtime.api_key == "direct-key"
    assert runtime.model == "override-model"


def test_resolve_llm_runtime_missing_api_key_raises() -> None:
    with pytest.raises(ValueError, match="api_key"):
        resolve_llm_runtime(
            platform_key=None,
            model_id="m",
            settings=Settings(openai_api_key=""),
        )


def test_resolve_llm_runtime_maps_legacy_doubao_to_deepseek() -> None:
    runtime = resolve_llm_runtime(
        platform_key="doubao",
        model_id="doubao-pro",
        llm_base_url="https://api.deepseek.com",
        llm_api_key="sk-test",
        settings=Settings(),
    )
    assert runtime.platform_key == "deepseek"
    assert runtime.model == "deepseek-v4-flash"
    assert runtime.base_url == "https://api.deepseek.com"


def test_resolve_llm_runtime_rejects_placeholder_api_key() -> None:
    with pytest.raises(ValueError, match="api_key"):
        resolve_llm_runtime(
            platform_key="deepseek",
            model_id="deepseek-v4-flash",
            settings=Settings(openai_api_key="your-api-key"),
        )


def test_resolve_llm_runtime_deepseek_defaults_without_profile() -> None:
    runtime = resolve_llm_runtime(
        platform_key="deepseek",
        model_id="deepseek-v4-flash",
        settings=Settings(
            openai_base_url="https://api.deepseek.com",
            openai_api_key="sk-test",
            openai_model="deepseek-v4-flash",
        ),
    )
    assert runtime.base_url == "https://api.deepseek.com"
    assert runtime.api_key == "sk-test"
    assert runtime.model == "deepseek-v4-flash"
