"""DeepSeek 真实联调用例常量（与 llm_models.id 对齐）。"""
from __future__ import annotations

import os

# 本地数据库 llm_models 主键（model_code = deepseek-v4-flash）
DEEPSEEK_DB_MODEL_ID = 9200203

DEEPSEEK_PLATFORM_KEY = "deepseek"
DEEPSEEK_MODEL_CODE = "deepseek-v4-flash"
DEEPSEEK_DEFAULT_BASE_URL = "https://api.deepseek.com"

LIVE_TEST_ENV_FLAG = "LABELHUB_LIVE_LLM_TEST"


def live_test_enabled() -> bool:
    return os.getenv(LIVE_TEST_ENV_FLAG, "").strip() == "1"


def resolve_deepseek_api_key() -> str | None:
    for key in (
        "LABELHUB_LIVE_DEEPSEEK_API_KEY",
        "DEEPSEEK_API_KEY",
        "LABELHUB_AGENT_OPENAI_API_KEY",
    ):
        value = os.getenv(key, "").strip()
        if value:
            return value
    return None


def resolve_deepseek_base_url() -> str:
    return (
        os.getenv("LABELHUB_LIVE_DEEPSEEK_BASE_URL")
        or os.getenv("DEEPSEEK_BASE_URL")
        or DEEPSEEK_DEFAULT_BASE_URL
    ).strip()


def resolve_deepseek_model_code() -> str:
    return (
        os.getenv("LABELHUB_LIVE_DEEPSEEK_MODEL")
        or os.getenv("DEEPSEEK_MODEL")
        or DEEPSEEK_MODEL_CODE
    ).strip()
