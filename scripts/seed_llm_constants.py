"""Shared LLM catalog constants for LabelHub seed generators.

Aligned with Flyway V45/V46: provider deepseek, default model deepseek-v4-flash.
"""

from __future__ import annotations

DEEPSEEK_PROVIDER_CODE = "deepseek"
DEEPSEEK_PLATFORM_KEY = "deepseek"
DEEPSEEK_MODEL_CODE = "deepseek-v4-flash"
DEEPSEEK_MODEL_NAME = "DeepSeek V4 Flash"

# Secondary real DeepSeek API models used in preference-compare pairwise payloads.
DEEPSEEK_CHAT_MODEL = "deepseek-chat"
DEEPSEEK_REASONER_MODEL = "deepseek-reasoner"

LLM_ASSIST_CONFIG: dict[str, str] = {
    "providerCode": DEEPSEEK_PROVIDER_CODE,
    "modelKey": DEEPSEEK_MODEL_CODE,
}

# Map legacy / fake dataset model labels to real DeepSeek model codes.
PREFERENCE_COMPARE_MODEL_ALIAS: dict[str, str] = {
    "doubao-pro": DEEPSEEK_MODEL_CODE,
    "doubao-lite": DEEPSEEK_CHAT_MODEL,
    "gpt-style": DEEPSEEK_CHAT_MODEL,
    "baseline-7b": DEEPSEEK_REASONER_MODEL,
    "unaligned-7b": DEEPSEEK_CHAT_MODEL,
    "seed-model-a": DEEPSEEK_MODEL_CODE,
    "seed-model-b": DEEPSEEK_REASONER_MODEL,
}


def resolve_preference_model(model_name: str) -> str:
    return PREFERENCE_COMPARE_MODEL_ALIAS.get(model_name, model_name)
