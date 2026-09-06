"""将 OpenAPI 契约与无状态 ReviewEngine 对接。"""
from __future__ import annotations

import json
import logging
from dataclasses import replace
from typing import Any

from app.core.config import get_settings
from app.core.llm_runtime import resolve_llm_runtime
from app.core.logging_config import mask_secret, safe_json
from app.schemas.ai_review import (
    AiReviewDimensionResult,
    AiReviewDimensionSpec,
    AiReviewLlmAttemptResult,
    AiReviewRequest,
    AiReviewResult,
    AiReviewVerdict,
)
from app.services.prompt_service import PromptService
from app.services.review_engine import ReviewEngine, ReviewEngineInput, ReviewEngineResult
from app.services.score_calibration import calibrate_dimension_scores
from app.services.score_consensus import merge_review_results_by_median

logger = logging.getLogger(__name__)

def _spec_llm_dimension_name(spec: dict[str, Any]) -> str:
    name = str(spec.get("dimensionName") or spec.get("dimension_name") or "").strip()
    key = str(spec.get("dimensionKey") or spec.get("dimension_key") or "")
    return name or key


DEFAULT_SYSTEM_PROMPT = (
    "你是 LabelHub 标注质量 AI 预审助手。"
    "请严格依据任务要求，对标注员的提交进行多维度评分并给出整体判定。"
    "输出必须为合法 JSON，包含 scores、dimensionReasons、verdict、reason 字段。"
)


class AiReviewService:
    def __init__(
        self,
        review_engine: ReviewEngine | None = None,
        prompt_service: PromptService | None = None,
    ) -> None:
        self.review_engine = review_engine or ReviewEngine()
        self.prompt_service = prompt_service or PromptService()

    def execute(self, request: AiReviewRequest) -> AiReviewResult:
        dimension_specs = self._normalize_dimension_specs(request.dimensions)
        llm_dimension_names = [self._llm_dimension_name(spec) for spec in dimension_specs]
        logger.info(
            "ai-review engine start submission_id=%s dimensions=%s submit_keys=%s payload_keys=%s",
            request.submission_id,
            llm_dimension_names,
            sorted((request.submit_data or {}).keys()),
            sorted((request.item_payload or {}).keys()),
        )

        llm_runtime = resolve_llm_runtime(
            platform_key=request.platform_key,
            model_id=request.model_id,
            llm_base_url=request.llm_base_url,
            llm_api_key=request.llm_api_key,
        )

        settings = get_settings()
        consensus_runs = max(1, int(settings.ai_review_score_consensus_runs))
        stable_seed = ((int(request.submission_id) * 31) ^ int(request.submission_version_id)) & 0x7FFFFFFF
        llm_temperature = (
            float(settings.ai_review_score_consensus_temperature)
            if consensus_runs > 1
            else 0.0
        )

        engine_input = ReviewEngineInput(
            system_prompt=(request.prompt_template or DEFAULT_SYSTEM_PROMPT).strip(),
            source_data=request.item_payload or {},
            label_data=request.submit_data or {},
            dimensions=llm_dimension_names,
            memory_context=request.memory_context or [],
            llm_runtime=llm_runtime,
            stable_seed=stable_seed,
            temperature=llm_temperature,
        )

        user_prompt = self.prompt_service.build_review_prompt_from_specs(
            system_prompt=engine_input.system_prompt,
            source_data=engine_input.source_data,
            label_data=engine_input.label_data,
            dimension_specs=[spec.model_dump(by_alias=True) for spec in dimension_specs],
        )
        logger.info(
            "ai-review llm runtime base_url=%s model=%s api_key=%s platform=%s",
            llm_runtime.base_url,
            llm_runtime.model,
            mask_secret(llm_runtime.api_key),
            llm_runtime.platform_key or "-",
        )
        logger.debug("ai-review user_prompt preview=%s", safe_json(user_prompt, max_len=1200))

        if consensus_runs > 1:
            run_results = [
                self.review_engine.run(
                    replace(
                        engine_input,
                        stable_seed=(stable_seed + run_idx) & 0x7FFFFFFF,
                    ),
                    user_prompt=user_prompt,
                )
                for run_idx in range(consensus_runs)
            ]
            engine_result = merge_review_results_by_median(run_results)
        else:
            engine_result = self.review_engine.run(engine_input, user_prompt=user_prompt)

        dimension_spec_dicts = [spec.model_dump(by_alias=True) for spec in dimension_specs]
        calibrated_scores, score_calibrations = calibrate_dimension_scores(
            engine_result.scores,
            dimension_spec_dicts,
            llm_dimension_name=_spec_llm_dimension_name,
        )
        if score_calibrations:
            engine_result = replace(engine_result, scores=calibrated_scores)

        logger.info(
            "ai-review engine done submission_id=%s success=%s attempts=%s verdict=%s scores=%s "
            "latency_ms=%s client_request_id=%s completion_id=%s consensus_runs=%s",
            request.submission_id,
            engine_result.success,
            engine_result.attempts,
            engine_result.verdict,
            engine_result.scores,
            engine_result.llm_latency_ms,
            engine_result.llm_client_request_id,
            engine_result.llm_completion_id,
            consensus_runs if consensus_runs > 1 else 1,
        )

        return self._to_contract_result(
            request,
            dimension_specs,
            engine_result,
            consensus_runs=consensus_runs,
            score_calibrations=score_calibrations,
            llm_temperature=llm_temperature,
        )

    def _normalize_dimension_specs(
        self,
        specs: list[AiReviewDimensionSpec],
    ) -> list[AiReviewDimensionSpec]:
        if specs:
            return specs
        return [
            AiReviewDimensionSpec.model_validate(
                {
                    "dimensionKey": "overall_quality",
                    "dimensionName": "整体质量",
                    "weight": 1.0,
                    "scoreMin": 0,
                    "scoreMax": 100,
                    "passThreshold": 70,
                    "rejectThreshold": 40,
                }
            )
        ]

    @staticmethod
    def _llm_dimension_name(spec: AiReviewDimensionSpec) -> str:
        name = (spec.dimension_name or "").strip()
        return name or spec.dimension_key

    def _to_contract_result(
        self,
        request: AiReviewRequest,
        dimension_specs: list[AiReviewDimensionSpec],
        engine_result: ReviewEngineResult,
        *,
        consensus_runs: int = 1,
        score_calibrations: list[dict[str, Any]] | None = None,
        llm_temperature: float = 0.0,
    ) -> AiReviewResult:
        dimension_results: list[AiReviewDimensionResult] = []
        weighted_total = 0.0
        weight_sum = 0.0
        dimension_reasons = engine_result.dimension_reasons or {}

        for spec in dimension_specs:
            llm_name = self._llm_dimension_name(spec)
            raw_score = engine_result.scores.get(llm_name)
            if raw_score is None:
                raw_score = engine_result.scores.get(spec.dimension_key)
            score = float(raw_score if raw_score is not None else 0)
            weight = float(spec.weight if spec.weight is not None else 1.0)
            weighted_total += score * weight
            weight_sum += weight
            dim_verdict = self._resolve_dimension_verdict(score, spec)
            comment = (
                dimension_reasons.get(llm_name)
                or dimension_reasons.get(spec.dimension_key)
                or engine_result.reason
                or ""
            )
            dimension_results.append(
                AiReviewDimensionResult(
                    dimensionKey=spec.dimension_key,
                    dimensionName=spec.dimension_name,
                    score=round(score, 2),
                    weight=weight,
                    verdict=dim_verdict,
                    comment=comment,
                )
            )

        total_score = round(weighted_total / weight_sum, 2) if weight_sum > 0 else 0.0
        overall_verdict = self._map_engine_verdict(engine_result, total_score)

        memory_case_count = len(request.memory_context or [])
        parsed_result: dict[str, Any] = {
            "verdict": overall_verdict.value,
            "totalScore": total_score,
            "summary": engine_result.reason or "",
            "scores": engine_result.scores,
            "dimensionReasons": dimension_reasons,
            "engineSuccess": engine_result.success,
            "attempts": engine_result.attempts,
            "llmTemperature": llm_temperature,
            "memoryCaseCount": memory_case_count,
            "reactRetried": engine_result.attempts > 1,
            "scoreStability": "consensus_median" if consensus_runs > 1 else "single_shot",
            "scoreConsensusRuns": consensus_runs,
            "llmLatencyMs": engine_result.llm_latency_ms,
            "llmClientRequestId": engine_result.llm_client_request_id,
            "llmCompletionId": engine_result.llm_completion_id,
            "stableSeed": ((int(request.submission_id) * 31) ^ int(request.submission_version_id))
            & 0x7FFFFFFF,
        }
        if score_calibrations:
            parsed_result["scoreCalibrations"] = score_calibrations
        if engine_result.error:
            parsed_result["error"] = engine_result.error

        prompt_snapshot = (
            f"[system]\n{engine_result.system_prompt}\n\n[user]\n{engine_result.user_prompt}"
        )

        platform_key = (request.platform_key or "default").strip() or "default"
        model_id = (request.model_id or "default").strip() or "default"
        llm_attempts = [
            AiReviewLlmAttemptResult(
                attemptNo=trace.attempt_no,
                platformKey=platform_key,
                modelId=model_id,
                providerRequestId=trace.provider_request_id,
                promptSnapshot=trace.prompt_snapshot,
                responseSnapshot=trace.response_snapshot,
                errorMessage=trace.error_message,
                success=trace.success,
                latencyMs=int(trace.latency_ms) if trace.latency_ms is not None else None,
                promptTokens=trace.prompt_tokens,
                completionTokens=trace.completion_tokens,
                totalTokens=trace.total_tokens,
                traceabilityStatus="FULL",
            )
            for trace in engine_result.attempt_traces
        ]

        return AiReviewResult(
            platformKey=platform_key,
            modelId=model_id,
            verdict=overall_verdict,
            totalScore=total_score,
            summary=engine_result.reason or ("AI 预审未通过校验，需人工复核" if not engine_result.success else ""),
            promptSnapshot=prompt_snapshot,
            inputSnapshot={
                "submitData": request.submit_data,
                "itemPayload": request.item_payload,
                "submissionId": request.submission_id,
                "submissionVersionId": request.submission_version_id,
                "taskId": request.task_id,
            },
            parsedResult=parsed_result,
            rawResponseText=json.dumps(engine_result.raw_output, ensure_ascii=False)
            if engine_result.raw_output is not None
            else None,
            providerRequestId=(
                engine_result.llm_completion_id
                or engine_result.llm_client_request_id
                or f"agent-submission-{request.submission_id}"
            ),
            dimensions=dimension_results,
            totalLatencyMs=int(engine_result.llm_latency_ms) if engine_result.llm_latency_ms is not None else None,
            attemptCount=engine_result.attempts,
            promptTokens=engine_result.prompt_tokens,
            completionTokens=engine_result.completion_tokens,
            totalTokens=engine_result.total_tokens,
            llmAttempts=llm_attempts,
        )

    @staticmethod
    def _resolve_dimension_verdict(score: float, spec: AiReviewDimensionSpec) -> AiReviewVerdict:
        if spec.pass_threshold is not None and score >= spec.pass_threshold:
            return AiReviewVerdict.PASS
        if spec.reject_threshold is not None and score <= spec.reject_threshold:
            return AiReviewVerdict.REJECT
        return AiReviewVerdict.REQUIRE_HUMAN

    @staticmethod
    def _map_engine_verdict(engine_result: ReviewEngineResult, total_score: float) -> AiReviewVerdict:
        if not engine_result.success:
            return AiReviewVerdict.REQUIRE_HUMAN
        verdict = (engine_result.verdict or "").lower()
        if verdict == "pass":
            return AiReviewVerdict.PASS
        if verdict == "reject":
            return AiReviewVerdict.REJECT
        if total_score >= 70:
            return AiReviewVerdict.PASS
        if total_score <= 40:
            return AiReviewVerdict.REJECT
        return AiReviewVerdict.REQUIRE_HUMAN
