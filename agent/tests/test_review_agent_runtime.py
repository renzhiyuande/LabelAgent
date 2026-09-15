from app.schemas.agent_runtime import AgentTermination
from app.services.llm_client import LlmJsonCallResult
from app.services.review_agent_runtime import ReviewAgentRuntime
from app.services.review_engine import ReviewEngineInput


class QueueLlmClient:
    def __init__(self, payloads):
        self.payloads = list(payloads)
        self.calls = 0

    def call_with_full_messages(self, **kwargs):
        payload = self.payloads[self.calls]
        self.calls += 1
        return LlmJsonCallResult(
            payload=payload,
            latency_ms=10.0,
            client_request_id=f"req-{self.calls}",
            completion_id=f"cmp-{self.calls}",
            prompt_tokens=10,
            completion_tokens=5,
            total_tokens=15,
        )


def make_input() -> ReviewEngineInput:
    return ReviewEngineInput(
        system_prompt="review",
        source_data={"reference": {"answer": "yes"}},
        label_data={"answer": "yes"},
        dimensions=["quality"],
        memory_context=[{"caseId": "m1", "summary": "yes answer accepted"}],
        stable_seed=7,
    )


def test_runtime_calls_tool_then_finalizes() -> None:
    client = QueueLlmClient(
        [
            {
                "action": "CALL_TOOL",
                "tool": "check_required_fields",
                "arguments": {"fields": ["answer"]},
            },
            {"action": "FINALIZE", "arguments": {}},
        ]
    )
    runtime = ReviewAgentRuntime(llm_client=client, max_steps=3)

    result = runtime.run(review_input=make_input(), user_prompt="check answer")

    assert result.termination == AgentTermination.MODEL_FINALIZE
    assert result.planner_calls == 2
    assert result.tool_calls == 1
    assert len(result.evidence) == 1
    assert result.evidence[0]["tool"] == "check_required_fields"
    assert result.total_tokens == 30


def test_runtime_rejects_unknown_tool_and_allows_model_to_recover() -> None:
    client = QueueLlmClient(
        [
            {"action": "CALL_TOOL", "tool": "drop_database", "arguments": {}},
            {"action": "FINALIZE", "arguments": {}},
        ]
    )
    runtime = ReviewAgentRuntime(llm_client=client, max_steps=3)

    result = runtime.run(review_input=make_input(), user_prompt="review")

    assert result.termination == AgentTermination.MODEL_FINALIZE
    assert result.tool_calls == 1
    assert len(result.evidence) == 0
    assert result.steps[0].status.value == "ERROR"


def test_runtime_stops_at_hard_step_budget() -> None:
    client = QueueLlmClient(
        [
            {
                "action": "CALL_TOOL",
                "tool": "check_required_fields",
                "arguments": {"fields": ["answer"]},
            },
            {
                "action": "CALL_TOOL",
                "tool": "search_review_memory",
                "arguments": {"query": "accepted"},
            },
        ]
    )
    runtime = ReviewAgentRuntime(llm_client=client, max_steps=2)

    result = runtime.run(review_input=make_input(), user_prompt="review")

    assert result.termination == AgentTermination.MAX_STEPS
    assert result.planner_calls == 2
    assert result.tool_calls == 2
    assert len(result.evidence) == 2


def test_runtime_marks_total_planner_protocol_failure() -> None:
    client = QueueLlmClient(
        [
            {"action": "NOT_ALLOWED"},
            {"foo": "bar"},
        ]
    )
    runtime = ReviewAgentRuntime(llm_client=client, max_steps=2)

    result = runtime.run(review_input=make_input(), user_prompt="review")

    assert result.termination == AgentTermination.PLANNER_FAILURE
    assert result.planner_calls == 2
    assert result.tool_calls == 0
    assert result.evidence == []
