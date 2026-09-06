"""Agent 无状态服务配置（不含 DB / Celery）。"""
from __future__ import annotations

import json
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def parse_platform_profiles(raw: str) -> dict[str, dict[str, str]]:
    if not raw or not raw.strip():
        return {}
    parsed = json.loads(raw)
    if not isinstance(parsed, dict):
        raise ValueError("LABELHUB_AGENT_PLATFORM_PROFILES must be a JSON object")
    normalized: dict[str, dict[str, str]] = {}
    for key, value in parsed.items():
        if isinstance(value, dict):
            normalized[str(key)] = {str(k): str(v) for k, v in value.items() if v is not None}
    return normalized


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="LABELHUB_AGENT_",
        extra="ignore",
    )

    log_level: str = "INFO"
    log_http_bodies: bool = False
    openai_base_url: str = "https://api.deepseek.com"
    openai_api_key: str = Field(default="")
    openai_model: str = "deepseek-v4-flash"
    openai_timeout_seconds: int = 60
    max_react_retries: int = 3
    ai_review_worker_threads: int = 8
    ai_review_score_consensus_runs: int = 1
    # consensus 模式下略提高 temperature，配合 per-run seed 产生可聚合的采样差异。
    ai_review_score_consensus_temperature: float = 0.1
    platform_profiles: str = "{}"

    @property
    def platform_profiles_map(self) -> dict[str, dict[str, str]]:
        return parse_platform_profiles(self.platform_profiles)

    @property
    def effective_log_http_bodies(self) -> bool:
        if self.log_http_bodies:
            return True
        return self.log_level.upper() == "DEBUG"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
