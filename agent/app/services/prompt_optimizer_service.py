"""Prompt Optimizer：基于误判样本生成候选 review_prompt_template。"""
from __future__ import annotations

import json
import logging
from collections import Counter
from typing import Any

from pydantic import ValidationError

from app.core.config import Settings, get_settings
from app.core.llm_runtime import resolve_llm_runtime
from app.schemas.prompt_optimize import (
    PromptOptimizeDimensionSpec,
    PromptOptimizeMisalignmentCase,
    PromptOptimizeRequest,
    PromptOptimizeResult,
)
from app.services.llm_client import LLMClient

logger = logging.getLogger(__name__)

MAX_MISALIGNMENT_CASES = 20

FLAT_FRAMEWORK_MARKERS = ("scores", "dimensionReasons", "verdict", "reason")
ARRAY_FRAMEWORK_MARKERS = ("verdict", "summary", "score", "comment")

_OPTIMIZER_SYSTEM_PROMPT = (
    "你是 LabelHub AI 预审提示词优化专家。"
    "你的任务是在保持基线 Prompt 中声明的 JSON 输出框架不变的前提下，"
    "根据 AI 与人工判定不一致的样本，改写 baseline review_prompt_template。"
    "输出必须为合法 JSON，包含 candidatePromptTemplate、changeSummary、"
    "targetedMisalignmentTypes、riskNotes、promptDiffHints 字段。"
    "candidatePromptTemplate 必须是完整可替换的系统提示词全文，"
    "且必须保留基线 Prompt 已使用的输出字段名与结构说明，不得擅自切换为另一套 JSON 框架。"
)


def _uses_array_framework(baseline: str) -> bool:
    text = baseline or ""
    lowered = text.lower()
    if "scores" in lowered or "dimensionreasons" in lowered:
        return False
    return any(
        token in lowered
        for token in ("score/comment", "dimensionkey", "total_score", '"dimensions"', "dimensions:")
    ) or ("各维度" in text and "score" in lowered and "comment" in lowered)


def resolve_scoring_framework_markers(baseline: str) -> tuple[str, ...]:
    """根据基线 Prompt 识别需保留的输出字段标记。"""
    text = baseline or ""
    lowered = text.lower()
    if not _uses_array_framework(text):
        return FLAT_FRAMEWORK_MARKERS

    markers: list[str] = []
    for marker in ARRAY_FRAMEWORK_MARKERS:
        if marker in lowered:
            markers.append(marker)
    if "total_score" in lowered:
        markers.append("total_score")
    if "dimensions" in lowered or "dimensionkey" in lowered:
        markers.append("dimensions")
    if "各维度" in text and "score" in lowered and "comment" in lowered:
        for marker in ("score", "comment"):
            if marker not in markers:
                markers.append(marker)
    return tuple(markers) or ARRAY_FRAMEWORK_MARKERS


def format_framework_markers(markers: tuple[str, ...]) -> str:
    return "、".join(markers)


class PromptOptimizerService:
    def __init__(
        self,
        *,
        settings: Settings | None = None,
        llm_client: LLMClient | None = None,
        max_cases: int = MAX_MISALIGNMENT_CASES,
    ) -> None:
        self.settings = settings or get_settings()
        self.llm_client = llm_client or LLMClient(settings=self.settings)
        self.max_cases = max_cases

    def execute(self, request: PromptOptimizeRequest) -> PromptOptimizeResult:
        cases = (request.misalignment_cases or [])[: self.max_cases]
        framework_markers = resolve_scoring_framework_markers(request.baseline_prompt_template)
        user_prompt = self._build_meta_prompt(
            baseline=request.baseline_prompt_template,
            dimensions=request.dimensions or [],
            cases=cases,
            optimization_goals=request.optimization_goals or [],
            framework_markers=framework_markers,
        )
        messages = [
            {"role": "system", "content": _OPTIMIZER_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]
        logger.info(
            "prompt-optimize start cases=%s dimensions=%s goals=%s",
            len(cases),
            len(request.dimensions or []),
            len(request.optimization_goals or []),
        )
        llm_runtime = resolve_llm_runtime(
            platform_key=request.platform_key,
            model_id=request.model_id,
            llm_base_url=request.llm_base_url,
            llm_api_key=request.llm_api_key,
            settings=self.settings,
        )
        try:
            llm_call = self.llm_client.call_with_full_messages(messages=messages, llm_runtime=llm_runtime)
            raw_payload = llm_call.payload if hasattr(llm_call, "payload") else llm_call
        except Exception as exc:
            logger.exception("prompt-optimize llm call failed")
            raise ValueError(f"Prompt optimizer LLM call failed: {exc}") from exc

        try:
            result = PromptOptimizeResult.model_validate(raw_payload)
        except ValidationError as exc:
            logger.warning("prompt-optimize output validation failed: %s", exc)
            raise ValueError(f"Prompt optimizer output validation failed: {exc}") from exc

        candidate = (result.candidate_prompt_template or "").strip()
        if not candidate:
            raise ValueError("Prompt optimizer returned empty candidatePromptTemplate")

        self._assert_preserves_scoring_framework(candidate, framework_markers)
        return result.model_copy(update={"candidate_prompt_template": candidate})

    @staticmethod
    def _assert_preserves_scoring_framework(candidate: str, framework_markers: tuple[str, ...]) -> None:
        lowered = candidate.lower()
        missing = [marker for marker in framework_markers if marker.lower() not in lowered]
        if missing:
            raise ValueError(
                "candidatePromptTemplate must preserve dimension scoring framework markers: "
                + ", ".join(missing)
            )

    def _build_meta_prompt(
        self,
        *,
        baseline: str,
        dimensions: list[PromptOptimizeDimensionSpec],
        cases: list[PromptOptimizeMisalignmentCase],
        optimization_goals: list[str],
        framework_markers: tuple[str, ...],
    ) -> str:
        type_counts = Counter(case.misalignment_type for case in cases)
        pattern_summary = ", ".join(f"{k}={v}" for k, v in sorted(type_counts.items())) or "(无样本)"

        dimension_lines: list[str] = []
        for idx, dim in enumerate(dimensions, 1):
            line = f"  {idx}. {dim.name} (key={dim.key})"
            if dim.prompt_instruction:
                line += f"\n     说明: {dim.prompt_instruction}"
            if dim.anchor_score is not None and dim.anchor_tolerance is not None:
                line += f"\n     锚点: {int(dim.anchor_score)}±{int(dim.anchor_tolerance)}"
            dimension_lines.append(line)

        case_blocks: list[str] = []
        for idx, case in enumerate(cases, 1):
            case_blocks.append(
                "\n".join(
                    [
                        f"--- 案例 {idx} ---",
                        f"misalignmentType: {case.misalignment_type}",
                        f"aiVerdict: {case.ai_verdict} | humanLabel: {case.human_label}",
                        f"aiSummary: {case.ai_summary or '(无)'}",
                        f"humanComment: {case.human_comment or '(无)'}",
                        f"itemPayload: {json.dumps(case.item_payload or {}, ensure_ascii=False)}",
                        f"submitData: {json.dumps(case.submit_data or {}, ensure_ascii=False)}",
                    ]
                )
            )

        goals_text = "\n".join(f"  - {goal}" for goal in optimization_goals) if optimization_goals else "  (未指定)"

        return (
            "========== 基线 Prompt ==========\n"
            f"{baseline.strip()}\n\n"
            "========== 评分维度 ==========\n"
            f"{chr(10).join(dimension_lines) if dimension_lines else '  (无维度配置)'}\n\n"
            "========== 误判模式统计 ==========\n"
            f"{pattern_summary}\n\n"
            "========== 优化目标 ==========\n"
            f"{goals_text}\n\n"
            "========== 误判样本（Top-K） ==========\n"
            f"{chr(10).join(case_blocks) if case_blocks else '(无样本)'}\n\n"
            "请分析上述 AI_STRICT / AI_LENIENT 等误判模式，输出优化后的完整 candidatePromptTemplate。\n"
            f"必须保留 {format_framework_markers(framework_markers)} JSON 输出框架说明。\n"
            "返回 JSON:\n"
            "{\n"
            '  "candidatePromptTemplate": "...",\n'
            '  "changeSummary": "...",\n'
            '  "targetedMisalignmentTypes": ["AI_STRICT"],\n'
            '  "riskNotes": "...",\n'
            '  "promptDiffHints": [{"section": "...", "change": "..."}]\n'
            "}"
        )
