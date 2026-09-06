"""多次采样分数共识（中位数）。"""
from __future__ import annotations

from statistics import median

from app.services.review_engine import ReviewEngineResult


def merge_review_results_by_median(results: list[ReviewEngineResult]) -> ReviewEngineResult:
    if not results:
        raise ValueError("results must not be empty")
    if len(results) == 1:
        return results[0]

    successful = [item for item in results if item.success]
    if not successful:
        return results[-1]

    dimension_names = sorted(successful[0].scores.keys())
    merged_scores: dict[str, int] = {}
    merged_reasons: dict[str, str] = {}

    for name in dimension_names:
        values = [item.scores[name] for item in successful if name in item.scores]
        if not values:
            continue
        merged_scores[name] = int(round(float(median(values))))
        closest = min(
            successful,
            key=lambda item: abs(float(item.scores.get(name, 0)) - merged_scores[name]),
        )
        merged_reasons[name] = closest.dimension_reasons.get(name, closest.reason or "")

    totals = []
    for item in successful:
        weight_sum = sum(item.scores.values()) or 1
        totals.append(sum(item.scores.values()) / len(item.scores))
    representative = min(successful, key=lambda item: abs(sum(item.scores.values()) / max(len(item.scores), 1) - float(median(totals))))

    verdicts = [item.verdict for item in successful if item.verdict]
    verdict = max(set(verdicts), key=verdicts.count) if verdicts else representative.verdict

    total_latency = sum(item.llm_latency_ms or 0.0 for item in results)
    return ReviewEngineResult(
        success=True,
        verdict=verdict,
        reason=representative.reason,
        scores=merged_scores,
        dimension_reasons=merged_reasons,
        raw_output=representative.raw_output,
        attempts=sum(item.attempts for item in results),
        system_prompt=representative.system_prompt,
        user_prompt=representative.user_prompt,
        messages=representative.messages,
        llm_latency_ms=total_latency,
        llm_client_request_id=representative.llm_client_request_id,
        llm_completion_id=representative.llm_completion_id,
        consensus_run_count=len(results),
    )
