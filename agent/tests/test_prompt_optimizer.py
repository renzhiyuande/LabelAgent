"""Tests for /v1/prompt-optimize contract endpoint."""
from __future__ import annotations

from unittest.mock import MagicMock

from fastapi.testclient import TestClient

import app.main as main_module
from app.main import app
from app.services.llm_client import LlmJsonCallResult
from app.services.prompt_optimizer_service import (
    ARRAY_FRAMEWORK_MARKERS,
    FLAT_FRAMEWORK_MARKERS,
    PromptOptimizerService,
    resolve_scoring_framework_markers,
)

client = TestClient(app)

AUTH_HEADERS = {"X-Internal-Token": "test-internal-token"}

BASELINE_PROMPT = (
    "你是 LabelHub 标注质量 AI 预审助手。"
    "请严格依据任务要求，对标注员的提交进行多维度评分并给出整体判定。"
    "输出必须为合法 JSON，包含 scores、dimensionReasons、verdict、reason 字段。"
)

SAMPLE_REQUEST = {
    "llmBaseUrl": "https://api.deepseek.com",
    "llmApiKey": "sk-test",
    "baselinePromptTemplate": BASELINE_PROMPT,
    "dimensions": [
        {
            "key": "accuracy",
            "name": "准确性",
            "promptInstruction": "评估标注选择是否准确",
            "anchorScore": 88,
            "anchorTolerance": 5,
        }
    ],
    "misalignmentCases": [
        {
            "misalignmentType": "AI_STRICT",
            "aiVerdict": "REJECT",
            "humanLabel": "PASS",
            "itemPayload": {"prompt": "什么是机器学习？"},
            "submitData": {"choice": "A", "reason": "回答 A 更准确"},
            "aiSummary": "标注理由不充分，应驳回",
            "humanComment": "申诉：核心判断正确，不应驳回",
        },
        {
            "misalignmentType": "AI_STRICT",
            "aiVerdict": "REJECT",
            "humanLabel": "PASS",
            "itemPayload": {"prompt": "解释深度学习"},
            "submitData": {"choice": "B", "reason": "B 更简洁"},
            "aiSummary": "次要表述差异被误判为错误",
            "humanComment": "人工审核通过，AI 过严",
        },
        {
            "misalignmentType": "AI_STRICT",
            "aiVerdict": "REJECT",
            "humanLabel": "PASS",
            "itemPayload": {"prompt": "比较 A/B 回答"},
            "submitData": {"choice": "A", "reason": "A 覆盖要点"},
            "aiSummary": "对格式要求过严导致误驳回",
            "humanComment": "申诉成立，应放宽驳回标准",
        },
    ],
    "optimizationGoals": [
        "raise_ai_human_agreement",
        "reduce_ai_reject_appeal_pass_rate",
    ],
}

VALID_LLM_PAYLOAD = {
    "candidatePromptTemplate": (
        BASELINE_PROMPT
        + "\n当核心判断正确时，对次要表述差异倾向通过，避免 AI 过严误驳回。"
    ),
    "changeSummary": "放宽 AI 过严驳回条件，针对 AI_STRICT 误判降低 strict 拦截",
    "targetedMisalignmentTypes": ["AI_STRICT"],
    "riskNotes": "可能略微降低对明显错误的拦截率，需 A/B 验证",
    "promptDiffHints": [
        {"section": "驳回标准", "change": "增加「核心判断正确时倾向通过」"},
    ],
}


def _install_mock_optimizer(monkeypatch, llm_payload: dict) -> MagicMock:
    mock_client = MagicMock()
    mock_client.call_with_full_messages.return_value = LlmJsonCallResult(
        payload=llm_payload,
        latency_ms=12.5,
        client_request_id="test-req",
        completion_id="test-completion",
    )
    service = PromptOptimizerService(llm_client=mock_client)
    monkeypatch.setattr(main_module, "prompt_optimizer_service", service)
    return mock_client


def test_prompt_optimize_returns_candidate_for_ai_strict_cases(monkeypatch) -> None:
    mock_client = _install_mock_optimizer(monkeypatch, VALID_LLM_PAYLOAD)

    response = client.post("/v1/prompt-optimize", json=SAMPLE_REQUEST, headers=AUTH_HEADERS)
    assert response.status_code == 200
    body = response.json()

    assert body["candidatePromptTemplate"]
    assert "scores" in body["candidatePromptTemplate"]
    assert "dimensionReasons" in body["candidatePromptTemplate"]
    assert "verdict" in body["candidatePromptTemplate"]
    assert "reason" in body["candidatePromptTemplate"]
    assert any(keyword in body["changeSummary"].lower() for keyword in ("strict", "过严"))
    assert body["targetedMisalignmentTypes"] == ["AI_STRICT"]
    assert body["riskNotes"]
    assert body["promptDiffHints"][0]["section"] == "驳回标准"
    mock_client.call_with_full_messages.assert_called_once()


def test_prompt_optimize_rejects_empty_candidate(monkeypatch) -> None:
    _install_mock_optimizer(
        monkeypatch,
        {
            **VALID_LLM_PAYLOAD,
            "candidatePromptTemplate": "   ",
        },
    )

    response = client.post("/v1/prompt-optimize", json=SAMPLE_REQUEST, headers=AUTH_HEADERS)
    assert response.status_code == 400
    assert "empty candidatePromptTemplate" in response.json()["message"]


def test_prompt_optimize_rejects_missing_scoring_framework(monkeypatch) -> None:
    _install_mock_optimizer(
        monkeypatch,
        {
            **VALID_LLM_PAYLOAD,
            "candidatePromptTemplate": "仅输出通过或不通过，无需 JSON 字段。",
        },
    )

    response = client.post("/v1/prompt-optimize", json=SAMPLE_REQUEST, headers=AUTH_HEADERS)
    assert response.status_code == 400
    assert "dimension scoring framework" in response.json()["message"]


def test_prompt_optimize_requires_internal_token() -> None:
    response = client.post("/v1/prompt-optimize", json=SAMPLE_REQUEST)
    assert response.status_code == 401
    assert response.json()["code"] == "INTERNAL_UNAUTHORIZED"


def test_prompt_optimize_validates_required_fields() -> None:
    response = client.post("/v1/prompt-optimize", json={}, headers=AUTH_HEADERS)
    assert response.status_code == 422


PREFERENCE_COMPARE_BASELINE = (
    "你是 LabelHub 偏好对比审核 Agent，请按以下维度给出结构化审核结果：\n"
    "[准确性] 检查回答是否准确引用了事实、概念或方法。\n"
    "请输出 verdict、total_score、summary 以及各维度 score/comment。"
)


def test_resolve_scoring_framework_markers_for_preference_compare() -> None:
    markers = resolve_scoring_framework_markers(PREFERENCE_COMPARE_BASELINE)
    assert "verdict" in markers
    assert "summary" in markers
    assert "score" in markers
    assert "comment" in markers
    assert "total_score" in markers
    assert "scores" not in markers


def test_resolve_scoring_framework_markers_for_flat_schema() -> None:
    assert resolve_scoring_framework_markers(BASELINE_PROMPT) == FLAT_FRAMEWORK_MARKERS


def test_prompt_optimize_accepts_preference_compare_framework(monkeypatch) -> None:
    candidate = (
        PREFERENCE_COMPARE_BASELINE
        + "\n当核心判断正确时，对次要表述差异倾向通过，避免 AI 过严误驳回。"
    )
    _install_mock_optimizer(
        monkeypatch,
        {
            **VALID_LLM_PAYLOAD,
            "candidatePromptTemplate": candidate,
        },
    )

    response = client.post(
        "/v1/prompt-optimize",
        json={
            **SAMPLE_REQUEST,
            "baselinePromptTemplate": PREFERENCE_COMPARE_BASELINE,
        },
        headers=AUTH_HEADERS,
    )
    assert response.status_code == 200
    body = response.json()
    assert "verdict" in body["candidatePromptTemplate"].lower()
    assert "score" in body["candidatePromptTemplate"].lower()
    assert "comment" in body["candidatePromptTemplate"].lower()


def test_prompt_optimize_uses_request_llm_runtime(monkeypatch) -> None:
    mock_client = MagicMock()
    mock_client.call_with_full_messages.return_value = LlmJsonCallResult(
        payload=VALID_LLM_PAYLOAD,
        latency_ms=12.5,
        client_request_id="test-req",
        completion_id="test-completion",
    )
    service = PromptOptimizerService(llm_client=mock_client)
    monkeypatch.setattr(main_module, "prompt_optimizer_service", service)

    request_body = {
        **SAMPLE_REQUEST,
        "platformKey": "deepseek",
        "modelId": "deepseek-v4-flash",
        "llmBaseUrl": "https://api.deepseek.com",
        "llmApiKey": "sk-test",
    }
    response = client.post("/v1/prompt-optimize", json=request_body, headers=AUTH_HEADERS)
    assert response.status_code == 200

    _, kwargs = mock_client.call_with_full_messages.call_args
    runtime = kwargs["llm_runtime"]
    assert runtime.base_url == "https://api.deepseek.com"
    assert runtime.api_key == "sk-test"
    assert runtime.model == "deepseek-v4-flash"
