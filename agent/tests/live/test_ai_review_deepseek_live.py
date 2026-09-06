"""DeepSeek 真实 AI 预审联调测试。

运行前：
  export LABELHUB_LIVE_LLM_TEST=1
  export LABELHUB_LIVE_DEEPSEEK_API_KEY=<DeepSeek API Key>

可选：
  LABELHUB_LIVE_DEEPSEEK_BASE_URL=https://api.deepseek.com
  LABELHUB_LIVE_DEEPSEEK_MODEL=deepseek-v4-flash
"""
from __future__ import annotations

import pytest

from app.core.llm_runtime import LlmRuntimeConfig
from app.schemas.ai_review import AiReviewRequest, AiReviewVerdict
from app.services.ai_review_service import AiReviewService
from app.services.review_engine import ReviewEngine
from .deepseek_live_config import (
    DEEPSEEK_DB_MODEL_ID,
    DEEPSEEK_MODEL_CODE,
    DEEPSEEK_PLATFORM_KEY,
    live_test_enabled,
    resolve_deepseek_api_key,
    resolve_deepseek_base_url,
    resolve_deepseek_model_code,
)

pytestmark = [
    pytest.mark.live,
    pytest.mark.skipif(
        not live_test_enabled(),
        reason="Set LABELHUB_LIVE_LLM_TEST=1 to run live DeepSeek tests",
    ),
]

PREFERENCE_COMPARE_REQUEST = AiReviewRequest.model_validate(
    {
        "submissionId": 910238000001,
        "submissionVersionId": 910239000001,
        "taskId": 910230000001,
        "platformKey": DEEPSEEK_PLATFORM_KEY,
        "modelId": DEEPSEEK_MODEL_CODE,
        "promptTemplate": (
            "你是 LabelHub 偏好对比标注 AI 预审助手。"
            "请评估标注员是否选择了更优回答，并给出多维度评分。"
            "输出 JSON：scores（维度名→分数 0-100）、verdict（pass/reject/need_human）、reason。"
        ),
        "submitData": {
            "choice": "A",
            "reason": "回答 A 给出了定义和类比，结构更清晰，信息更完整。",
        },
        "itemPayload": {
            "prompt": "什么是机器学习？请用简洁语言解释。",
            "response_a": "机器学习是让计算机从数据中自动学习规律，而无需显式编程的技术。",
            "response_b": "机器学习就是 AI。",
        },
        "dimensions": [
            {
                "dimensionKey": "ACCURACY",
                "dimensionName": "准确性",
                "weight": 0.4,
                "scoreMin": 0,
                "scoreMax": 100,
                "passThreshold": 70,
                "rejectThreshold": 40,
                "promptInstruction": "标注选择是否准确反映了两个回答的质量差异",
            },
            {
                "dimensionKey": "COMPLETENESS",
                "dimensionName": "完整性",
                "weight": 0.3,
                "scoreMin": 0,
                "scoreMax": 100,
                "passThreshold": 70,
                "rejectThreshold": 40,
                "promptInstruction": "理由是否充分说明选择依据",
            },
        ],
        "llmBaseUrl": None,
        "llmApiKey": None,
    }
)


@pytest.fixture
def deepseek_runtime() -> LlmRuntimeConfig:
    api_key = resolve_deepseek_api_key()
    if not api_key:
        pytest.skip("DeepSeek API key missing: set LABELHUB_LIVE_DEEPSEEK_API_KEY or DEEPSEEK_API_KEY")
    return LlmRuntimeConfig(
        base_url=resolve_deepseek_base_url(),
        api_key=api_key,
        model=resolve_deepseek_model_code(),
        timeout_seconds=120,
        platform_key=DEEPSEEK_PLATFORM_KEY,
    )


def test_deepseek_model_constants_match_catalog() -> None:
    """文档化 DB 模型 id 与 model_code 的对应关系。"""
    assert DEEPSEEK_DB_MODEL_ID == 9200203
    assert resolve_deepseek_model_code() == DEEPSEEK_MODEL_CODE


def test_deepseek_ai_review_returns_structured_verdict(deepseek_runtime: LlmRuntimeConfig) -> None:
    service = AiReviewService(review_engine=ReviewEngine(max_react_retries=2))
    request = PREFERENCE_COMPARE_REQUEST.model_copy(
        update={
            "model_id": deepseek_runtime.model,
            "llm_base_url": deepseek_runtime.base_url,
            "llm_api_key": deepseek_runtime.api_key,
        }
    )

    result = service.execute(request)

    assert result.platform_key == DEEPSEEK_PLATFORM_KEY
    assert result.model_id == deepseek_runtime.model
    assert result.verdict in {
        AiReviewVerdict.PASS,
        AiReviewVerdict.REJECT,
        AiReviewVerdict.REQUIRE_HUMAN,
    }
    assert result.total_score is not None
    assert 0 <= float(result.total_score) <= 100
    assert result.summary
    assert result.dimensions
    assert len(result.dimensions) == 2
    assert result.parsed_result.get("engineSuccess") is True
    assert result.prompt_snapshot
    assert result.provider_request_id
