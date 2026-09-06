"""AI 预审稳定性验收。

分层说明：
- Mock 用例：只验证 Golden Set 契约与后处理确定性，**不能**证明 LLM 评分稳定。
- Live 用例：对真实模型同输入重跑，用方差/判定一致性做可量化验收。
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock

import pytest

from app.schemas.ai_review import AiReviewRequest
from app.services.ai_review_service import AiReviewService
from app.services.llm_client import LLMClient
from app.services.review_engine import ReviewEngine
from tests.llm_mock_helpers import llm_json_result
from .stability_metrics import compute_repeat_run_metrics

GOLDEN_SET_PATH = Path(__file__).with_name("golden_set.json")
DEFAULT_LIVE_REPEAT_RUNS = 3
DEFAULT_LIVE_SEED = 42


def _load_golden_cases() -> list[dict[str, Any]]:
    return json.loads(GOLDEN_SET_PATH.read_text(encoding="utf-8"))


def _load_live_golden_cases() -> list[dict[str, Any]]:
    return [
        case
        for case in _load_golden_cases()
        if case.get("liveStability", {}).get("enabled") is True
    ]


def _build_service(mock_response: dict[str, Any]) -> AiReviewService:
    mock_client = MagicMock()
    mock_client.call_with_full_messages.return_value = llm_json_result(mock_response)
    return AiReviewService(review_engine=ReviewEngine(llm_client=mock_client, max_react_retries=1))


def _live_repeat_runs() -> int:
    raw = os.getenv("LABELHUB_STABILITY_REPEAT_RUNS", "").strip()
    if not raw:
        return DEFAULT_LIVE_REPEAT_RUNS
    return max(2, int(raw))


def _live_seed() -> int | None:
    raw = os.getenv("LABELHUB_STABILITY_SEED", str(DEFAULT_LIVE_SEED)).strip()
    if raw.lower() in {"", "none", "off"}:
        return None
    return int(raw)


class _SeededLLMClient(LLMClient):
    """Live 稳定性测试：固定 seed + temperature=0，降低采样波动。"""

    def __init__(self, seed: int | None) -> None:
        super().__init__()
        self._seed = seed

    def call_with_full_messages(
        self,
        *,
        messages,
        llm_runtime=None,
        temperature: float = 0.0,
        seed: int | None = None,
        client_request_id: str | None = None,
    ):
        return super().call_with_full_messages(
            messages=messages,
            llm_runtime=llm_runtime,
            temperature=temperature,
            seed=seed if seed is not None else self._seed,
        )


def _live_acceptance(case: dict[str, Any]) -> dict[str, Any]:
    return case.get("liveStability") or {}


@pytest.mark.parametrize("case", _load_golden_cases(), ids=lambda case: case["id"])
def test_golden_set_contract_regression(case: dict[str, Any]) -> None:
    """Mock Golden Set：验证映射/加权/元数据契约，不声称 LLM 稳定性。"""
    service = _build_service(case["mockLlmResponse"])
    request = AiReviewRequest.model_validate(case["request"])

    result = service.execute(request)
    parsed = result.parsed_result or {}

    assert result.verdict.value == case["expectedVerdict"]
    assert result.total_score == case["expectedTotalScore"]
    assert parsed["llmTemperature"] == 0.0
    assert parsed["memoryCaseCount"] == len(request.memory_context or [])
    assert parsed["reactRetried"] is False
    assert parsed["scoreStability"] == "single_shot"


def test_pipeline_is_idempotent_given_fixed_llm_output() -> None:
    """固定 LLM 输出时，后处理链路应幂等（测的是代码，不是模型）。"""
    case = _load_golden_cases()[0]
    service = _build_service(case["mockLlmResponse"])
    request = AiReviewRequest.model_validate(case["request"])

    first = service.execute(request)
    second = service.execute(request)

    assert first.verdict == second.verdict
    assert first.total_score == second.total_score
    assert [(item.dimension_key, item.score) for item in first.dimensions] == [
        (item.dimension_key, item.score) for item in second.dimensions
    ]


def test_parsed_result_includes_stability_metadata(monkeypatch) -> None:
    from fastapi.testclient import TestClient

    import app.main as main_module
    from app.main import app

    golden_case = _load_golden_cases()[0]
    monkeypatch.setattr(
        main_module,
        "ai_review_service",
        _build_service(golden_case["mockLlmResponse"]),
    )

    client = TestClient(app)
    response = client.post(
        "/v1/ai-review",
        json=golden_case["request"],
        headers={"X-Internal-Token": "test-internal-token"},
    )
    assert response.status_code == 200
    parsed = response.json()["parsedResult"]
    assert parsed["llmTemperature"] == 0.0
    assert parsed["memoryCaseCount"] == 0
    assert parsed["reactRetried"] is False
    assert parsed["scoreStability"] == "single_shot"


@pytest.mark.live
@pytest.mark.parametrize("case", _load_live_golden_cases(), ids=lambda case: case["id"])
@pytest.mark.skipif(
    os.getenv("LABELHUB_STABILITY_TEST") != "1",
    reason="Set LABELHUB_STABILITY_TEST=1 to run live LLM stability acceptance",
)
def test_live_golden_set_repeat_run_stability(case: dict[str, Any]) -> None:
    """真实 LLM 同输入重跑：这才是可量化稳定性验收。"""
    from tests.live.deepseek_live_config import (
        live_test_enabled,
        resolve_deepseek_api_key,
        resolve_deepseek_base_url,
        resolve_deepseek_model_code,
    )

    if not live_test_enabled():
        pytest.skip("Set LABELHUB_LIVE_LLM_TEST=1 together with LABELHUB_STABILITY_TEST=1")
    if not resolve_deepseek_api_key():
        pytest.skip("DeepSeek API key missing for live stability test")

    acceptance = _live_acceptance(case)
    request = AiReviewRequest.model_validate(
        {
            **case["request"],
            "platformKey": "deepseek",
            "modelId": resolve_deepseek_model_code(),
            "llmBaseUrl": resolve_deepseek_base_url(),
            "llmApiKey": resolve_deepseek_api_key(),
        }
    )
    service = AiReviewService(
        review_engine=ReviewEngine(
            llm_client=_SeededLLMClient(seed=_live_seed()),
            max_react_retries=3,
        ),
    )

    runs = [service.execute(request) for _ in range(_live_repeat_runs())]
    for index, run in enumerate(runs, start=1):
        assert run.parsed_result is not None, f"run {index} missing parsed_result"
        assert run.parsed_result.get("engineSuccess") is True, (
            f"run {index} engine failed: {run.parsed_result}"
        )

    metrics_kwargs: dict[str, Any] = {
        "require_verdict_stable": bool(acceptance.get("requireVerdictStable", True)),
    }
    if acceptance.get("maxTotalScoreMedianDeviation") is not None:
        metrics_kwargs["max_total_score_median_deviation"] = float(
            acceptance["maxTotalScoreMedianDeviation"]
        )
        if acceptance.get("maxDimensionMedianDeviation") is not None:
            metrics_kwargs["max_dimension_median_deviation"] = float(
                acceptance["maxDimensionMedianDeviation"]
            )
    else:
        metrics_kwargs["max_total_score_stddev"] = float(
            acceptance.get("maxTotalScoreStdDev", 10.0)
        )
        if acceptance.get("maxDimensionStdDev") is not None:
            metrics_kwargs["max_dimension_stddev"] = float(acceptance["maxDimensionStdDev"])

    metrics = compute_repeat_run_metrics(runs, **metrics_kwargs)
    report = json.dumps(metrics, ensure_ascii=False, indent=2)
    assert metrics["passed"], f"live stability failed for case={case['id']}:\n{report}"
