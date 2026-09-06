"""Tests for stateless review engine core."""
from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.services.review_engine import ReviewEngine, ReviewEngineInput
from tests.llm_mock_helpers import llm_json_result


@pytest.fixture
def engine() -> ReviewEngine:
    mock_client = MagicMock()
    mock_client.call_with_full_messages.return_value = llm_json_result({
        "verdict": "pass",
        "reason": "标注质量良好",
        "scores": {"准确性": 85, "完整性": 90},
        "dimensionReasons": {"准确性": "判断准确。", "完整性": "信息完整。"},
    })
    return ReviewEngine(llm_client=mock_client, max_react_retries=2)


def test_run_success(engine: ReviewEngine) -> None:
    result = engine.run(
        ReviewEngineInput(
            system_prompt="你是审核助手",
            source_data={"prompt": "Q", "response_a": "A", "response_b": "B", "model_a": "m1", "model_b": "m2"},
            label_data={"choice": "A"},
            dimensions=["准确性", "完整性"],
        )
    )
    assert result.success is True
    assert result.verdict == "pass"
    assert result.scores == {"准确性": 85, "完整性": 90}
    assert result.dimension_reasons == {"准确性": "判断准确。", "完整性": "信息完整。"}
    assert result.attempts == 1
    assert "原始题面 / 样本数据" in result.user_prompt
    assert "prompt:\nQ" in result.user_prompt
    assert "response_a:\nA" in result.user_prompt


def test_run_success_includes_dimension_reasons() -> None:
    mock_client = MagicMock()
    mock_client.call_with_full_messages.return_value = llm_json_result({
        "verdict": "pass",
        "reason": "整体质量良好",
        "scores": {"准确性": 85, "完整性": 90},
        "dimensionReasons": {
            "准确性": "标注判断与样本内容一致。",
            "完整性": "理由覆盖了主要判断依据。",
        },
    })
    engine = ReviewEngine(llm_client=mock_client, max_react_retries=2)

    result = engine.run(
        ReviewEngineInput(
            system_prompt="你是审核助手",
            source_data={"prompt": "Q"},
            label_data={"choice": "A"},
            dimensions=["准确性", "完整性"],
        )
    )

    assert result.success is True
    assert result.dimension_reasons == {
        "准确性": "标注判断与样本内容一致。",
        "完整性": "理由覆盖了主要判断依据。",
    }


def test_run_react_retry_then_success() -> None:
    mock_client = MagicMock()
    mock_client.call_with_full_messages.side_effect = [
        llm_json_result({"verdict": "pass", "reason": "ok", "scores": {"准确性": 999}, "dimensionReasons": {"准确性": "bad"}}),
        llm_json_result({"verdict": "pass", "reason": "修正后通过", "scores": {"准确性": 80}, "dimensionReasons": {"准确性": "修正后合理"}}),
    ]
    engine = ReviewEngine(llm_client=mock_client, max_react_retries=3)
    result = engine.run(
        ReviewEngineInput(
            system_prompt="sys",
            source_data={"prompt": "Q"},
            label_data={"choice": "A"},
            dimensions=["准确性"],
        )
    )
    assert result.success is True
    assert result.attempts == 2
    assert mock_client.call_with_full_messages.call_count == 2


def test_run_exhaust_retries_fallback_manual() -> None:
    mock_client = MagicMock()
    mock_client.call_with_full_messages.return_value = llm_json_result({
        "verdict": "pass",
        "reason": "x",
        "scores": {"准确性": 999},
        "dimensionReasons": {"准确性": "bad"},
    })
    engine = ReviewEngine(llm_client=mock_client, max_react_retries=2)
    result = engine.run(
        ReviewEngineInput(
            system_prompt="sys",
            source_data={"prompt": "Q"},
            label_data={"choice": "A"},
            dimensions=["准确性"],
        )
    )
    assert result.success is False
    assert result.verdict == "manual"
    assert result.attempts == 2
