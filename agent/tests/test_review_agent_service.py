from __future__ import annotations

from dataclasses import dataclass

from app.schemas.agent_orchestration import ReviewAgentAction, ReviewAgentToolName
from app.schemas.ai_review import AiReviewRequest, AiReviewResult, AiReviewVerdict
from app.services.review_agent_service import ReviewAgentService
from app.services.review_agent_tools import ReviewAgentToolbox


class FakeFinalReviewService:
    def __init__(self) -> None:
        self.calls = 0

    def execute(self, request: AiReviewRequest) -> AiReviewResult:
        self.calls += 1
        return AiReviewResult(
            platformKey=request.platform_key or "default",
            modelId=request.model_id or "default",
            verdict=AiReviewVerdict.PASS,
            totalScore=88,
            summary="ok",
            parsedResult={"engineSuccess": True},
        )


@dataclass
class SequencePlanner:
    actions: list[ReviewAgentAction]

    def __post_init__(self) -> None:
        self.index = 0

    def decide(self, request: AiReviewRequest, *, steps: list[dict]) -> ReviewAgentAction:
        action = self.actions[self.index]
        self.index += 1
        return action


class FailingPlanner:
    def decide(self, request: AiReviewRequest, *, steps: list[dict]) -> ReviewAgentAction:
        raise RuntimeError("planner unavailable")


def request_fixture() -> AiReviewRequest:
    return AiReviewRequest.model_validate(
        {
            "submissionId": 10,
            "submissionVersionId": 2,
            "taskId": 7,
            "platformKey": "test",
            "modelId": "mock-model",
            "dimensions": [
                {
                    "dimensionKey": "accuracy",
                    "dimensionName": "准确性",
                    "weight": 1,
                    "scoreMin": 0,
                    "scoreMax": 100,
                    "passThreshold": 70,
                    "rejectThreshold": 40,
                }
            ],
            "memoryContext": [
                {"type": "review_case", "id": "case-1", "verdict": "PASS"},
                {"type": "rule", "id": "rule-1", "text": "字段必须完整"},
            ],
        }
    )


def test_agent_executes_tools_then_final_review() -> None:
    planner = SequencePlanner(
        [
            ReviewAgentAction(tool="inspect_rules", arguments={}, reason="先确认评分规则"),
            ReviewAgentAction(tool="inspect_history", arguments={"limit": 2}, reason="再参考历史案例"),
            ReviewAgentAction(tool="final_review", arguments={}, reason="信息已足够"),
        ]
    )
    final_service = FakeFinalReviewService()
    service = ReviewAgentService(
        planner=planner,
        toolbox=ReviewAgentToolbox(),
        final_review_service=final_service,
        max_steps=4,
    )

    result = service.execute(request_fixture())

    assert result.verdict == AiReviewVerdict.PASS
    assert final_service.calls == 1
    run = result.parsed_result["agentRun"]
    assert run["mode"] == "bounded_tool_loop"
    assert run["executedSteps"] == 3
    assert [step["tool"] for step in run["steps"]] == [
        "inspect_rules",
        "inspect_history",
        "final_review",
    ]
    assert run["fallbackReason"] is None


def test_duplicate_read_tool_forces_safe_terminal_review() -> None:
    planner = SequencePlanner(
        [
            ReviewAgentAction(tool="inspect_rules", arguments={}, reason="查看规则"),
            ReviewAgentAction(tool="inspect_rules", arguments={}, reason="再次查看规则"),
        ]
    )
    final_service = FakeFinalReviewService()
    service = ReviewAgentService(
        planner=planner,
        toolbox=ReviewAgentToolbox(),
        final_review_service=final_service,
        max_steps=4,
    )

    result = service.execute(request_fixture())

    run = result.parsed_result["agentRun"]
    assert final_service.calls == 1
    assert run["fallbackReason"] == "duplicate_tool:inspect_rules"
    assert run["steps"][-1]["status"] == "forced_terminal"
    assert run["steps"][-1]["tool"] == "final_review"


def test_planner_failure_falls_back_to_existing_review_engine() -> None:
    final_service = FakeFinalReviewService()
    service = ReviewAgentService(
        planner=FailingPlanner(),
        toolbox=ReviewAgentToolbox(),
        final_review_service=final_service,
        max_steps=4,
    )

    result = service.execute(request_fixture())

    run = result.parsed_result["agentRun"]
    assert final_service.calls == 1
    assert run["fallbackReason"] == "planner_error:RuntimeError"
    assert run["steps"][-1]["status"] == "forced_terminal"


def test_toolbox_exposes_only_read_only_inspection_tools() -> None:
    toolbox = ReviewAgentToolbox()
    request = request_fixture()

    rules = toolbox.execute(ReviewAgentToolName.INSPECT_RULES, request)
    history = toolbox.execute(ReviewAgentToolName.INSPECT_HISTORY, request, {"limit": 1})

    assert rules["dimensionCount"] == 1
    assert history["availableCount"] == 2
    assert history["selectedCount"] == 1
