from unittest.mock import MagicMock

from app.services.llm_client import LlmJsonCallResult
from app.services.review_engine import ReviewEngine, ReviewEngineInput


def test_review_engine_collects_attempt_traces_on_validation_retry():
    llm_client = MagicMock()
    llm_client.call_with_full_messages.side_effect = [
        LlmJsonCallResult(
            payload={"scores": {}, "dimensionReasons": {}, "verdict": "pass", "reason": "bad"},
            latency_ms=120.0,
            client_request_id="req-1",
            completion_id="cmp-1",
            prompt_tokens=10,
            completion_tokens=20,
            total_tokens=30,
        ),
        LlmJsonCallResult(
            payload={
                "scores": {"整体质量": 90},
                "dimensionReasons": {"整体质量": "ok"},
                "verdict": "pass",
                "reason": "ok",
            },
            latency_ms=80.0,
            client_request_id="req-2",
            completion_id="cmp-2",
            prompt_tokens=11,
            completion_tokens=21,
            total_tokens=32,
        ),
    ]

    engine = ReviewEngine(llm_client=llm_client, max_react_retries=2)
    result = engine.run(
        ReviewEngineInput(
            system_prompt="system",
            source_data={"q": "1"},
            label_data={"a": "1"},
            dimensions=["整体质量"],
        )
    )

    assert result.success is True
    assert result.attempts == 2
    assert len(result.attempt_traces) == 2
    assert result.prompt_tokens == 21
    assert result.total_tokens == 62
