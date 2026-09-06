"""Seed ai_review observability columns and llm_attempt traces (V54)."""

from __future__ import annotations

from typing import Any, Callable

AddAuditDefaults = Callable[..., dict[str, Any]]


def append_ai_review_observability(
    tables: dict[str, list[dict[str, Any]]],
    *,
    add_audit_defaults: AddAuditDefaults,
    id_pools: dict[str, Any],
    sample_ratio: float = 0.3,
) -> None:
    """Enrich ~30% of ai_review_records with telemetry and attempt rows."""
    ai_rows = tables.get("ai_review_records", [])
    if not ai_rows:
        return

    step = max(1, int(1 / sample_ratio))
    for index, row in enumerate(ai_rows):
        is_full_trace = index % step == 0
        attempt_count = 2 if is_full_trace and index % 2 == 0 else 1
        prompt_tokens = 820 + (index % 7) * 40 if is_full_trace else None
        completion_tokens = 210 + (index % 5) * 18 if is_full_trace else None
        total_tokens = (
            (prompt_tokens or 0) + (completion_tokens or 0) if is_full_trace else None
        )
        row["total_latency_ms"] = 1200 + (index % 9) * 110
        row["attempt_count"] = attempt_count
        row["prompt_tokens"] = prompt_tokens
        row["completion_tokens"] = completion_tokens
        row["total_tokens"] = total_tokens
        row["error_code"] = None if row.get("status") == "SUCCESS" else "ENGINE_FAILED"
        row["traceability_status"] = "FULL" if is_full_trace else "LEGACY_BACKFILLED"
        row["history_gap_reason"] = (
            None
            if is_full_trace
            else "历史记录仅保留最终快照；token 与逐次 attempt 明细不可追溯"
        )

        if not is_full_trace:
            tables["ai_review_llm_attempts"].append(
                add_audit_defaults(
                    {
                        "id": id_pools["ai_review_llm_attempt"].next(),
                        "ai_review_id": row["id"],
                        "submission_id": row["submission_id"],
                        "submission_version_id": row["submission_version_id"],
                        "task_id": row["task_id"],
                        "attempt_no": attempt_count,
                        "platform_key": row["platform_key"],
                        "model_id": row["model_id"],
                        "provider_request_id": row.get("provider_request_id"),
                        "prompt_snapshot": row.get("prompt_snapshot"),
                        "response_snapshot": row.get("raw_response_text"),
                        "error_message": row.get("failure_reason"),
                        "success_flag": 1 if row.get("status") == "SUCCESS" else 0,
                        "latency_ms": row["total_latency_ms"],
                        "prompt_tokens": None,
                        "completion_tokens": None,
                        "total_tokens": None,
                        "history_backfill_flag": 1,
                        "traceability_status": "LEGACY_BACKFILLED",
                        "history_gap_reason": "历史单次 attempt 由最终快照回填；token 不可追溯",
                        "started_at": row.get("started_at"),
                        "finished_at": row.get("finished_at"),
                    }
                )
            )
            continue

        # FULL trace: failed parse then success
        if attempt_count >= 2:
            tables["ai_review_llm_attempts"].append(
                add_audit_defaults(
                    {
                        "id": id_pools["ai_review_llm_attempt"].next(),
                        "ai_review_id": row["id"],
                        "submission_id": row["submission_id"],
                        "submission_version_id": row["submission_version_id"],
                        "task_id": row["task_id"],
                        "attempt_no": 1,
                        "platform_key": row["platform_key"],
                        "model_id": row["model_id"],
                        "provider_request_id": f"{row.get('provider_request_id')}-a1",
                        "prompt_snapshot": row.get("prompt_snapshot"),
                        "response_snapshot": '{"invalid": true}',
                        "error_message": "JSON 解析失败",
                        "success_flag": 0,
                        "latency_ms": 640,
                        "prompt_tokens": prompt_tokens,
                        "completion_tokens": 42,
                        "total_tokens": (prompt_tokens or 0) + 42,
                        "history_backfill_flag": 0,
                        "traceability_status": "FULL",
                        "history_gap_reason": None,
                        "started_at": row.get("started_at"),
                        "finished_at": row.get("finished_at"),
                    }
                )
            )
        tables["ai_review_llm_attempts"].append(
            add_audit_defaults(
                {
                    "id": id_pools["ai_review_llm_attempt"].next(),
                    "ai_review_id": row["id"],
                    "submission_id": row["submission_id"],
                    "submission_version_id": row["submission_version_id"],
                    "task_id": row["task_id"],
                    "attempt_no": attempt_count,
                    "platform_key": row["platform_key"],
                    "model_id": row["model_id"],
                    "provider_request_id": row.get("provider_request_id"),
                    "prompt_snapshot": row.get("prompt_snapshot"),
                    "response_snapshot": row.get("raw_response_text"),
                    "error_message": None,
                    "success_flag": 1 if row.get("status") == "SUCCESS" else 0,
                    "latency_ms": row["total_latency_ms"],
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": total_tokens,
                    "history_backfill_flag": 0,
                    "traceability_status": "FULL",
                    "history_gap_reason": None,
                    "started_at": row.get("started_at"),
                    "finished_at": row.get("finished_at"),
                }
            )
        )
