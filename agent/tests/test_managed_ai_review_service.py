from app.core.logging_config import set_trace_id
from app.schemas.ai_review import AiReviewRequest, AiReviewResult
from app.schemas.context_management import ContextSelectionPolicy
from app.services.managed_ai_review_service import ManagedAiReviewService


class FakeAiReviewService:
    def __init__(self) -> None:
        self.last_request = None

    def execute(self, request: AiReviewRequest) -> AiReviewResult:
        self.last_request = request
        return AiReviewResult(
            platformKey="demo",
            modelId="demo-model",
            verdict="PASS",
            totalScore=88.0,
            summary="ok",
            parsedResult={"engineSuccess": True},
        )


def _request() -> AiReviewRequest:
    return AiReviewRequest(
        submissionId=1,
        submissionVersionId=2,
        taskId=3,
        memoryContext=[
            {"contextType": "review_history", "id": "h1", "content": "history"},
            {"contextType": "project_rule", "id": "r1", "content": "rule"},
            {"contextType": "bad_case", "id": "b1", "content": "bad case"},
        ],
    )


def test_managed_service_filters_context_before_delegate_and_exposes_stats():
    fake = FakeAiReviewService()
    service = ManagedAiReviewService(
        delegate=fake,
        context_policy=ContextSelectionPolicy(maxItems=1, maxChars=1000),
    )
    set_trace_id("managed-review")

    result = service.execute(_request())

    assert fake.last_request is not None
    assert [item["id"] for item in fake.last_request.memory_context] == ["r1"]
    assert result.parsed_result["engineSuccess"] is True
    assert result.parsed_result["contextSelection"]["inputCount"] == 3
    assert result.parsed_result["contextSelection"]["selectedCount"] == 1
    assert result.parsed_result["contextSelection"]["droppedCount"] == 2


def test_original_request_is_not_mutated():
    request = _request()
    fake = FakeAiReviewService()
    service = ManagedAiReviewService(
        delegate=fake,
        context_policy=ContextSelectionPolicy(maxItems=1, maxChars=1000),
    )

    service.execute(request)

    assert len(request.memory_context) == 3
    assert len(fake.last_request.memory_context) == 1
