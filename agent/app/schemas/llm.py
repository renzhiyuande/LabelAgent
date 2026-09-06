"""
大模型输出动态校验模型定义模块
运行时动态生成匹配维度的Pydantic校验类，实现零硬编码强类型校验
"""
from __future__ import annotations

from pydantic import BaseModel, Field, conint, create_model, field_validator, model_validator

from app.schemas.domain import ReviewDecision


class LLMScoreItem(BaseModel):
    """单条维度的分数项"""
    key: str
    score: float
    reason: str


class LLMReviewResult(BaseModel):
    """大模型返回的标准审核结果结构"""
    verdict: ReviewDecision
    reason: str
    scores: dict[str, int]
    dimension_reasons: dict[str, str] = Field(alias="dimensionReasons")

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, value: str) -> str:
        """校验理由字段不能为空"""
        if not value.strip():
            raise ValueError("reason must not be empty")
        return value

    @model_validator(mode="after")
    def validate_scores(self) -> "LLMReviewResult":
        """校验分数字典与维度原因非空，且键集合、值范围合法"""
        if not self.scores:
            raise ValueError("scores must not be empty")
        for key, score in self.scores.items():
            if not isinstance(score, int) or score < 0 or score > 100:
                raise ValueError(f"invalid score for {key}")
        if not self.dimension_reasons:
            raise ValueError("dimensionReasons must not be empty")
        if set(self.scores.keys()) != set(self.dimension_reasons.keys()):
            raise ValueError("dimensionReasons keys must match scores keys")
        for key, reason in self.dimension_reasons.items():
            if not reason.strip():
                raise ValueError(f"dimensionReasons[{key}] must not be empty")
        return self


def create_dynamic_llm_result_model(dimensions: list[str]) -> type[BaseModel]:
    """
    【动态生成 Pydantic 校验模型】完全零硬编码
    根据传入的审核维度列表，在运行时动态创建对应的模型类
    所有维度字段强制要求为 0-100 的百分制整数，实现LLM输出自动强校验
    """
    score_fields = {
        dimension: (conint(ge=0, le=100), ...)
        for dimension in dimensions
    }
    reason_fields = {
        dimension: (str, Field(min_length=1))
        for dimension in dimensions
    }
    DynamicScoresModel = create_model("DynamicScoresModel", **score_fields)
    DynamicDimensionReasonsModel = create_model("DynamicDimensionReasonsModel", **reason_fields)
    return create_model(
        "DynamicLLMReviewResult",
        verdict=(ReviewDecision, ...),
        reason=(str, ...),
        scores=(DynamicScoresModel, ...),
        dimensionReasons=(DynamicDimensionReasonsModel, ...),
    )
