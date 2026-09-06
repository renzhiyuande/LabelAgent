"""P0 white-box skeleton tests for AI review contract (WB-PY-004 ~ WB-PY-009)."""
from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.main import app
from app.services.ai_review_service import AiReviewService
from app.services.review_engine import ReviewEngine
from tests.llm_mock_helpers import llm_json_result

client = TestClient(app)

AUTH_HEADERS = {"X-Internal-Token": "test-internal-token"}

SAMPLE_REQUEST = {
    "submissionId": 1001,
    "submissionVersionId": 2002,
    "taskId": 3003,
    "platformKey": "openai",
    "modelId": "gpt-4.1-mini",
    "promptTemplate": "你是审核助手，请严格评分。",
    "submitData": {"choice": "A", "reason": "回答 A 更准确"},
    "itemPayload": {
        "prompt": "什么是机器学习？",
        "response_a": "机器学习是...",
        "response_b": "ML 是...",
    },
    "dimensions": [
        {
            "dimensionKey": "accuracy",
            "dimensionName": "准确性",
            "weight": 1.0,
            "scoreMin": 0,
            "scoreMax": 100,
            "passThreshold": 70,
            "rejectThreshold": 40,
            "promptInstruction": "评估标注选择是否准确",
        }
    ],
}


def _llm_payload(
    *,
    verdict: str,
    reason: str,
    scores: dict[str, int],
    dimension_reasons: dict[str, str] | None = None,
) -> dict:
    reasons = dimension_reasons or {key: reason for key in scores}
    return {
        "verdict": verdict,
        "reason": reason,
        "scores": scores,
        "dimensionReasons": reasons,
    }


def _install_engine(monkeypatch, *, llm_payload: dict, max_retries: int = 2) -> None:
    mock_client = MagicMock()
    mock_client.call_with_full_messages.return_value = llm_json_result(llm_payload)
    engine = ReviewEngine(llm_client=mock_client, max_react_retries=max_retries)
    monkeypatch.setattr(main_module, "ai_review_service", AiReviewService(review_engine=engine))


@pytest.mark.parametrize(
    "verdict,expected",
    [
        ("pass", "PASS"),
        ("reject", "REJECT"),
        ("require_human", "REQUIRE_HUMAN"),
    ],
)
def test_wb_py004_execute_ai_review_contract_shape(monkeypatch, verdict: str, expected: str) -> None:
    """WB-PY-004: /v1/ai-review 契约字段完整。"""
    _install_engine(
        monkeypatch,
        llm_payload=_llm_payload(verdict=verdict, reason="ok", scores={"准确性": 80}),
    )
    response = client.post("/v1/ai-review", json=SAMPLE_REQUEST, headers=AUTH_HEADERS)
    assert response.status_code == 200
    body = response.json()
    assert body["verdict"] == expected
    assert body["dimensions"][0]["dimensionKey"] == "accuracy"
    assert body["inputSnapshot"]["submissionId"] == 1001


def test_wb_py005_ai_review_service_dimension_scores(monkeypatch) -> None:
    """WB-PY-005: 各维度分数与请求维度数一致。"""
    _install_engine(
        monkeypatch,
        llm_payload=_llm_payload(verdict="pass", reason="准确", scores={"准确性": 88}),
    )
    response = client.post("/v1/ai-review", json=SAMPLE_REQUEST, headers=AUTH_HEADERS)
    body = response.json()
    assert len(body["dimensions"]) == len(SAMPLE_REQUEST["dimensions"])
    assert body["dimensions"][0]["score"] == 88.0


def test_wb_py006_missing_llm_credentials_returns_error(monkeypatch) -> None:
    """WB-PY-006: 缺 LLM 凭据时明确失败。"""
    from app.core.config import Settings

    monkeypatch.setattr(
        "app.core.config.get_settings",
        lambda: Settings(
            openai_api_key="",
            openai_base_url="http://localhost:9999",
            openai_model="test-model",
        ),
    )
    payload = {**SAMPLE_REQUEST}
    payload.pop("platformKey", None)
    payload.pop("llmApiKey", None)

    response = client.post("/v1/ai-review", json=payload, headers=AUTH_HEADERS)

    assert response.status_code == 400
    body = response.json()
    assert body["code"] == "SYSTEM_ERROR"
    assert "api_key" in body["message"].lower()


def test_wb_py007_review_engine_success_without_retry(monkeypatch) -> None:
    """WB-PY-007: LLM 返回合法 JSON 时不触发 ReAct 重试。"""
    mock_client = MagicMock()
    mock_client.call_with_full_messages.return_value = llm_json_result(_llm_payload(
        verdict="pass",
        reason="ok",
        scores={"准确性": 90},
    ))
    engine = ReviewEngine(llm_client=mock_client, max_react_retries=3)
    monkeypatch.setattr(main_module, "ai_review_service", AiReviewService(review_engine=engine))

    response = client.post("/v1/ai-review", json=SAMPLE_REQUEST, headers=AUTH_HEADERS)
    assert response.status_code == 200
    assert response.json()["parsedResult"]["engineSuccess"] is True
    assert mock_client.call_with_full_messages.call_count == 1


def test_wb_py008_review_engine_react_retry_on_malformed_json(monkeypatch) -> None:
    """WB-PY-008: 畸形 JSON 触发 ReAct 重试后降级。"""
    mock_client = MagicMock()
    mock_client.call_with_full_messages.return_value = llm_json_result(_llm_payload(
        verdict="pass",
        reason="bad",
        scores={"准确性": 999},
    ))
    engine = ReviewEngine(llm_client=mock_client, max_react_retries=1)
    monkeypatch.setattr(main_module, "ai_review_service", AiReviewService(review_engine=engine))

    response = client.post("/v1/ai-review", json=SAMPLE_REQUEST, headers=AUTH_HEADERS)
    assert response.status_code == 200
    body = response.json()
    assert body["verdict"] == "REQUIRE_HUMAN"
    assert body["parsedResult"]["engineSuccess"] is False


def test_wb_py009_review_engine_exhausted_retries_degrade(monkeypatch) -> None:
    """WB-PY-009: 重试耗尽后降级 verdict。"""
    mock_client = MagicMock()
    mock_client.call_with_full_messages.return_value = llm_json_result(_llm_payload(
        verdict="pass",
        reason="always invalid",
        scores={"准确性": 999},
    ))
    max_retries = 3
    engine = ReviewEngine(llm_client=mock_client, max_react_retries=max_retries)
    monkeypatch.setattr(main_module, "ai_review_service", AiReviewService(review_engine=engine))

    response = client.post("/v1/ai-review", json=SAMPLE_REQUEST, headers=AUTH_HEADERS)

    assert response.status_code == 200
    body = response.json()
    assert body["verdict"] == "REQUIRE_HUMAN"
    assert body["parsedResult"]["engineSuccess"] is False
    assert body["parsedResult"]["attempts"] == max_retries
    assert mock_client.call_with_full_messages.call_count == max_retries


def test_wb_py004_requires_internal_token() -> None:
    response = client.post("/v1/ai-review", json=SAMPLE_REQUEST)
    assert response.status_code == 401
    assert response.json()["code"] == "INTERNAL_UNAUTHORIZED"
