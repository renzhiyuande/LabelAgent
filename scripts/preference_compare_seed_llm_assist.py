"""Seed llm_assist_records for chat and agent modes on preference compare."""

from __future__ import annotations

from typing import Any, Callable

from seed_llm_constants import DEEPSEEK_MODEL_CODE, DEEPSEEK_PLATFORM_KEY

AddAuditDefaults = Callable[..., dict[str, Any]]


def append_preference_llm_assist_records(
    tables: dict[str, list[dict[str, Any]]],
    *,
    main_task_id: int,
    main_template_version_id: int,
    add_audit_defaults: AddAuditDefaults,
    dt: Callable[[int], str],
    id_pools: dict[str, Any],
) -> None:
    """Add chat + agent assist history on main demo submissions."""
    submissions = [
        row
        for row in tables.get("submissions", [])
        if row["task_id"] == main_task_id and row.get("current_status") in {"APPROVED", "NEEDS_REVISION", "HUMAN_REVIEWING"}
    ]
    if not submissions:
        return

    version_by_id = {row["id"]: row for row in tables.get("submission_versions", [])}
    item_by_id = {row["id"]: row for row in tables.get("task_items", [])}

    chat_targets = submissions[:6]
    agent_targets = submissions[6:12] if len(submissions) >= 12 else submissions[:6]

    for index, submission in enumerate(chat_targets):
        version = version_by_id.get(submission["current_version_id"])
        if not version:
            continue
        item = item_by_id.get(submission["item_id"], {})
        payload = item.get("payload_json") or {}
        prompt_snippet = str(payload.get("prompt", ""))[:120]
        preferred = (version.get("submit_data_json") or {}).get("result", {}).get("preferred", "A")
        tables["llm_assist_records"].append(
            add_audit_defaults(
                {
                    "id": id_pools["llm_assist"].next(),
                    "submission_id": submission["id"],
                    "assignment_id": submission["assignment_id"],
                    "task_id": main_task_id,
                    "template_version_id": main_template_version_id,
                    "field_code": "runtime.ai_reference",
                    "platform_key": DEEPSEEK_PLATFORM_KEY,
                    "model_id": DEEPSEEK_MODEL_CODE,
                    "prompt_text": f"[chat] 比较题面：{prompt_snippet}",
                    "response_text": f"建议优先检查 {preferred} 侧回答的准确性与完整性。",
                    "parsed_output_json": {
                        "mode": "chat",
                        "winner": preferred,
                        "summary": f"基于题面片段，{preferred} 更可能更优。",
                    },
                    "status": "SUCCESS",
                    "total_tokens": 420 + index * 12,
                    "latency_ms": 380 + index * 15,
                    "invoked_by": submission["labeler_id"],
                    "invoked_at": dt(50 + index),
                },
                created_by=submission["labeler_id"],
                updated_by=submission["labeler_id"],
            )
        )

    for index, submission in enumerate(agent_targets):
        version = version_by_id.get(submission["current_version_id"])
        if not version:
            continue
        item = item_by_id.get(submission["item_id"], {})
        payload = item.get("payload_json") or {}
        prompt_snippet = str(payload.get("prompt", ""))[:80]
        preferred = (version.get("submit_data_json") or {}).get("result", {}).get("preferred", "A")
        tables["llm_assist_records"].append(
            add_audit_defaults(
                {
                    "id": id_pools["llm_assist"].next(),
                    "submission_id": submission["id"],
                    "assignment_id": submission["assignment_id"],
                    "task_id": main_task_id,
                    "template_version_id": main_template_version_id,
                    "field_code": "runtime.ai_structured",
                    "platform_key": DEEPSEEK_PLATFORM_KEY,
                    "model_id": DEEPSEEK_MODEL_CODE,
                    "prompt_text": f"[agent] 结构化比较：{prompt_snippet}",
                    "response_text": '{"winner":"' + str(preferred) + '","confidence":0.82}',
                    "parsed_output_json": {
                        "mode": "agent",
                        "winner": preferred,
                        "confidence": 0.82,
                        "risk_flags": [],
                        "dimension_hints": ["准确性", "完整性"],
                    },
                    "status": "SUCCESS",
                    "total_tokens": 560 + index * 10,
                    "latency_ms": 510 + index * 18,
                    "invoked_by": submission["labeler_id"],
                    "invoked_at": dt(70 + index),
                },
                created_by=submission["labeler_id"],
                updated_by=submission["labeler_id"],
            )
        )
