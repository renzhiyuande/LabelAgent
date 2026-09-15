from app.core.config import Settings
from app.schemas.agent_runtime import AgentRunResult, AgentTermination
from app.schemas.ai_review import AiReviewRequest
from app.services.agentic_ai_review_service import AgenticAiReviewService
from app.services.review_engine import ReviewEngineResult


class FakeAgentRuntime:
    def __init__(self) -> None:
        self.calls = 0

    def run(self, *, review_input, user_prompt):
        self.calls += 1
        return AgentRunResult(
            termination=AgentTermination.MODEL_FINALIZE,
            evidence=[
                {
                    "type": "agent_tool_evidence",
                    "tool": "check_required_fields",
                    "arguments": {"fields": ["answer"]},
                    "result": {"complete": True},
                }
            ],
            plannerCalls=2,
            toolCalls=1,
            llmLatencyMs=20,
            promptTokens=11,
            completionTokens=7,
            totalTokens=18,
        )


class FakeReviewEngine:
    def __init__(self) -> None:
        self.last_input = None

    def run(self, review_input, *, user_prompt=None):
        self.last_input = review_input
        return ReviewEngineResult(
            success=True,
            verdict="pass",
            reason="ok",
            scores={"整体质量": 80},
            dimension_reasons={"整体质量": "ok"},
            raw_output={"ok": True},
            attempts=1,
            system_prompt=review_input.system_prompt,
            user_prompt=user_prompt or "review",
            messages=[],
            llm_latency_ms=30,
            prompt_tokens=13,
            completion_tokens=5,
            total_tokens=18,
            attempt_traces=[],
        )


def make_request() -> AiReviewRequest:
    return AiReviewRequest.model_validate(
        {
            "submissionId": 1,
            "submissionVersionId": 2,
            "taskId": 3,
            "modelId": "test-model",
            "llmBaseUrl": "https://example.test/v1",
            "llmApiKey": "test-api-key-123",
            "submitData": {"answer": "yes"},
            "itemPayload": {"reference": {"answer": "yes"}},
            "memoryContext": [{"caseId": "old", "summary": "prior case"}],
        }
    )


def test_agent_evidence_is_added_before_final_structured_review() -> None:
    settings = Settings(
        openai_api_key="test-api-key-123",
        ai_review_agent_enabled=True,
        ai_review_agent_max_steps=3,
    )
    agent = FakeAgentRuntime()
    engine = FakeReviewEngine()
    service = AgenticAiReviewService(
        settings=settings,
        agent_runtime=agent,
        review_engine=engine,
    )

    result = service.execute(make_request())

    assert agent.calls == 1
    assert engine.last_input is not None
    assert len(engine.last_input.memory_context) == 2
    assert engine.last_input.memory_context[-1]["type"] == "agent_tool_evidence"
    assert result.parsed_result["agentRuntime"]["toolCalls"] == 1
    assert result.parsed_result["agentRuntime"]["termination"] == "MODEL_FINALIZE"
    assert result.total_latency_ms == 50
    assert result.total_tokens == 36


def test_agent_can_be_disabled_without_changing_final_review_path() -> None:
    settings = Settings(
        openai_api_key="test-api-key-123",
        ai_review_agent_enabled=False,
    )
    agent = FakeAgentRuntime()
    engine = FakeReviewEngine()
    service = AgenticAiReviewService(
        settings=settings,
        agent_runtime=agent,
        review_engine=engine,
    )

    result = service.execute(make_request())

    assert agent.calls == 0
    assert len(engine.last_input.memory_context) == 1
    assert result.parsed_result["agentRuntime"] == {
        "enabled": False,
        "termination": "DISABLED",
    }
