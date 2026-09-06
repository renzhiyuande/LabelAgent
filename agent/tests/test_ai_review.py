"""Tests for /v1/ai-review contract endpoint."""
from __future__ import annotations

from unittest.mock import MagicMock

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


def test_ai_review_returns_contract_shape(monkeypatch) -> None:
    mock_client = MagicMock()
    mock_client.call_with_full_messages.return_value = llm_json_result({
        "verdict": "pass",
        "reason": "标注准确，理由充分",
        "scores": {"准确性": 88},
        "dimensionReasons": {"准确性": "标注判断与题面一致。"},
    })
    engine = ReviewEngine(llm_client=mock_client, max_react_retries=1)
    monkeypatch.setattr(main_module, "ai_review_service", AiReviewService(review_engine=engine))

    response = client.post("/v1/ai-review", json=SAMPLE_REQUEST, headers=AUTH_HEADERS)
    assert response.status_code == 200
    body = response.json()
    assert body["platformKey"] == "openai"
    assert body["modelId"] == "gpt-4.1-mini"
    assert body["verdict"] == "PASS"
    assert body["totalScore"] == 88.0
    assert body["summary"] == "标注准确，理由充分"
    assert body["dimensions"][0]["dimensionKey"] == "accuracy"
    assert body["dimensions"][0]["score"] == 88.0
    assert body["dimensions"][0]["comment"] == "标注判断与题面一致。"
    assert body["promptSnapshot"]
    assert body["inputSnapshot"]["submissionId"] == 1001
    assert body["parsedResult"]["engineSuccess"] is True
    assert body["parsedResult"]["dimensionReasons"]["准确性"] == "标注判断与题面一致。"
    assert body["parsedResult"]["llmTemperature"] == 0.0
    assert body["parsedResult"]["memoryCaseCount"] == 0
    assert body["parsedResult"]["reactRetried"] is False
    assert body["parsedResult"]["scoreStability"] == "single_shot"


def test_ai_review_engine_failure_maps_to_require_human(monkeypatch) -> None:
    mock_client = MagicMock()
    mock_client.call_with_full_messages.return_value = llm_json_result({
        "verdict": "pass",
        "reason": "bad",
        "scores": {"准确性": 999},
        "dimensionReasons": {"准确性": "bad"},
    })
    engine = ReviewEngine(llm_client=mock_client, max_react_retries=1)
    monkeypatch.setattr(main_module, "ai_review_service", AiReviewService(review_engine=engine))

    response = client.post("/v1/ai-review", json=SAMPLE_REQUEST, headers=AUTH_HEADERS)
    assert response.status_code == 200
    body = response.json()
    assert body["verdict"] == "REQUIRE_HUMAN"
    assert body["parsedResult"]["engineSuccess"] is False


def test_ai_review_dimension_comment_prefers_dimension_reasons(monkeypatch) -> None:
    mock_client = MagicMock()
    mock_client.call_with_full_messages.return_value = llm_json_result({
        "verdict": "pass",
        "reason": "整体通过",
        "scores": {"准确性": 88},
        "dimensionReasons": {"准确性": "标注判断与题面一致。"},
    })
    engine = ReviewEngine(llm_client=mock_client, max_react_retries=1)
    monkeypatch.setattr(main_module, "ai_review_service", AiReviewService(review_engine=engine))

    response = client.post("/v1/ai-review", json=SAMPLE_REQUEST, headers=AUTH_HEADERS)
    body = response.json()

    assert response.status_code == 200
    assert body["dimensions"][0]["comment"] == "标注判断与题面一致。"


def test_ai_review_validates_required_fields() -> None:
    response = client.post("/v1/ai-review", json={"taskId": 1}, headers=AUTH_HEADERS)
    assert response.status_code == 422


def test_ai_review_requires_internal_token() -> None:
    response = client.post("/v1/ai-review", json=SAMPLE_REQUEST)
    assert response.status_code == 401
    assert response.json()["code"] == "INTERNAL_UNAUTHORIZED"


def test_ai_review_accepts_backend_injected_llm_credentials(monkeypatch) -> None:
    captured_runtime = {}

    mock_client = MagicMock()

    def capture_call(*, messages, llm_runtime=None, temperature=0.0, seed=None, client_request_id=None):
        if llm_runtime is not None:
            captured_runtime["base_url"] = llm_runtime.base_url
            captured_runtime["model"] = llm_runtime.model
        return llm_json_result({
            "verdict": "pass",
            "reason": "ok",
            "scores": {"准确性": 90},
            "dimensionReasons": {"准确性": "判断准确。"},
        })

    mock_client.call_with_full_messages.side_effect = capture_call
    engine = ReviewEngine(llm_client=mock_client, max_react_retries=1)
    monkeypatch.setattr(main_module, "ai_review_service", AiReviewService(review_engine=engine))

    payload = {
        **SAMPLE_REQUEST,
        "llmBaseUrl": "https://custom.example/v1",
        "llmApiKey": "sk-custom",
        "modelId": "custom-model",
    }
    response = client.post("/v1/ai-review", json=payload, headers=AUTH_HEADERS)
    assert response.status_code == 200
    assert captured_runtime["base_url"] == "https://custom.example/v1"
    assert captured_runtime["model"] == "custom-model"


def test_ai_review_consensus_uses_distinct_seeds_and_temperature(monkeypatch) -> None:
    from app.core.config import Settings, get_settings

    monkeypatch.setattr(
        "app.services.ai_review_service.get_settings",
        lambda: Settings(ai_review_score_consensus_runs=3, ai_review_score_consensus_temperature=0.1),
    )

    captured: list[tuple[int | None, float]] = []

    def capture_call(*, messages, llm_runtime=None, temperature=0.0, seed=None, client_request_id=None):
        captured.append((seed, temperature))
        score = 80 + len(captured)
        return llm_json_result({
            "verdict": "pass",
            "reason": "ok",
            "scores": {"准确性": score},
            "dimensionReasons": {"准确性": f"run-{len(captured)}"},
        })

    mock_client = MagicMock()
    mock_client.call_with_full_messages.side_effect = capture_call
    engine = ReviewEngine(llm_client=mock_client, max_react_retries=1)
    monkeypatch.setattr(main_module, "ai_review_service", AiReviewService(review_engine=engine))

    response = client.post("/v1/ai-review", json=SAMPLE_REQUEST, headers=AUTH_HEADERS)
    body = response.json()

    assert response.status_code == 200
    assert body["parsedResult"]["scoreStability"] == "consensus_median"
    assert body["parsedResult"]["scoreConsensusRuns"] == 3
    assert body["parsedResult"]["llmTemperature"] == 0.1
    assert len(captured) == 3
    seeds = [item[0] for item in captured]
    assert len(set(seeds)) == 3
    assert all(temp == 0.1 for _, temp in captured)
    assert body["dimensions"][0]["score"] == 82.0

    get_settings.cache_clear()
