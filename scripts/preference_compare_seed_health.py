"""AI review prompt health seed: metrics, misalignment cases, suggestions, bulk reviews."""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Any, Callable

from preference_compare_fixtures import (
    FIXTURE_BY_ID,
    fixture_payload,
    misalignment_scenario,
    pick_fixtures,
)
from seed_llm_constants import (
    DEEPSEEK_MODEL_CODE,
    DEEPSEEK_PLATFORM_KEY,
    LLM_ASSIST_CONFIG,
)

AddAuditDefaults = Callable[..., dict[str, Any]]
Dt = Callable[[int], str]

REFERENCE_DATE = date(2026, 6, 9)
VERSION_LEVEL_TASK_ID = 0
HEALTH_WINDOW_DAYS = 30
MIN_AGGREGATION_SAMPLES = 30

SINGLE_LEVEL_REVIEW_WORKFLOW: dict[str, Any] = {
    "levels": [{"key": "L1", "label": "初审", "actions": ["approve", "reject", "return"]}],
}


def health_ts(days_ago: int, hour: int = 10, minute: int = 0) -> str:
    value = datetime.combine(REFERENCE_DATE - timedelta(days=days_ago), time(hour, minute))
    return value.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]


def health_metric_date(days_ago: int) -> str:
    return (REFERENCE_DATE - timedelta(days=days_ago)).isoformat()


def append_health_seed_universe(
    tables: dict[str, list[dict[str, Any]]],
    *,
    owner_id: int,
    labeler_id: int,
    reviewer_lin_id: int,
    reviewer_qiao_id: int,
    main_task_id: int,
    main_template_id: int,
    main_template_version_id: int,
    schema_json: dict[str, Any],
    schema_checksum: str,
    review_prompt: str,
    review_output_schema: dict[str, Any],
    workflow_json: dict[str, Any],
    review_dimensions: list[dict[str, str]],
    field_count: int,
    required_field_count: int,
    build_ai_result: Callable[..., dict[str, Any]],
    add_audit_defaults: AddAuditDefaults,
    dt: Dt,
    id_pools: dict[str, Any],
    system_user_id: int,
) -> None:
    """Seed health dashboard data: three aggregation states + main template artifacts."""
    sparse_ctx = _create_health_task_bundle(
        tables,
        owner_id=owner_id,
        labeler_id=labeler_id,
        reviewer_lin_id=reviewer_lin_id,
        reviewer_qiao_id=reviewer_qiao_id,
        task_code="TASK_HEALTH_SPARSE",
        task_title="AI 质检 · 未聚合（样本不足）",
        template_code="TPL_HEALTH_SPARSE",
        template_name="偏好对比 · 未聚合演示",
        schema_json=schema_json,
        schema_checksum=schema_checksum,
        review_prompt=review_prompt,
        review_output_schema=review_output_schema,
        workflow_json=SINGLE_LEVEL_REVIEW_WORKFLOW,
        review_dimensions=review_dimensions,
        field_count=field_count,
        required_field_count=required_field_count,
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
    )
    ready_ctx = _create_health_task_bundle(
        tables,
        owner_id=owner_id,
        labeler_id=labeler_id,
        reviewer_lin_id=reviewer_lin_id,
        reviewer_qiao_id=reviewer_qiao_id,
        task_code="TASK_HEALTH_READY",
        task_title="AI 质检 · 可聚合（待手动刷新）",
        template_code="TPL_HEALTH_READY",
        template_name="偏好对比 · 可聚合演示",
        schema_json=schema_json,
        schema_checksum=schema_checksum,
        review_prompt=review_prompt,
        review_output_schema=review_output_schema,
        workflow_json=SINGLE_LEVEL_REVIEW_WORKFLOW,
        review_dimensions=review_dimensions,
        field_count=field_count,
        required_field_count=required_field_count,
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
    )

    _append_ai_review_batch(
        tables,
        task_id=sparse_ctx["task_id"],
        template_version_id=sparse_ctx["template_version_id"],
        sample_prefix="H_SPARSE",
        count=8,
        owner_id=owner_id,
        labeler_id=labeler_id,
        reviewer_lin_id=reviewer_lin_id,
        review_prompt=review_prompt,
        review_output_schema=review_output_schema,
        review_dimensions=review_dimensions,
        build_ai_result=build_ai_result,
        add_audit_defaults=add_audit_defaults,
        id_pools=id_pools,
        system_user_id=system_user_id,
        agreement_ratio=0.75,
        include_human_review=True,
        start_days_ago=3,
    )

    _append_ai_review_batch(
        tables,
        task_id=ready_ctx["task_id"],
        template_version_id=ready_ctx["template_version_id"],
        sample_prefix="H_READY",
        count=42,
        owner_id=owner_id,
        labeler_id=labeler_id,
        reviewer_lin_id=reviewer_lin_id,
        review_prompt=review_prompt,
        review_output_schema=review_output_schema,
        review_dimensions=review_dimensions,
        build_ai_result=build_ai_result,
        add_audit_defaults=add_audit_defaults,
        id_pools=id_pools,
        system_user_id=system_user_id,
        agreement_ratio=0.62,
        include_human_review=True,
        start_days_ago=14,
    )

    _enrich_main_template_ai_reviews(
        tables,
        template_version_id=main_template_version_id,
        review_dimensions=review_dimensions,
    )
    _append_main_health_metrics(
        tables,
        template_version_id=main_template_version_id,
        add_audit_defaults=add_audit_defaults,
        id_pools=id_pools,
    )
    _append_main_misalignment_cases(
        tables,
        template_version_id=main_template_version_id,
        task_id=main_task_id,
        add_audit_defaults=add_audit_defaults,
        id_pools=id_pools,
    )
    _append_main_prompt_suggestions(
        tables,
        owner_id=owner_id,
        task_id=main_task_id,
        template_id=main_template_id,
        template_version_id=main_template_version_id,
        review_prompt=review_prompt,
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
    )
    optimize_ctx = _create_health_task_bundle(
        tables,
        owner_id=owner_id,
        labeler_id=labeler_id,
        reviewer_lin_id=reviewer_lin_id,
        reviewer_qiao_id=reviewer_qiao_id,
        task_code="TASK_HEALTH_OPTIMIZE",
        task_title="AI 质检 · 优化燃料专任务",
        template_code="TPL_HEALTH_OPTIMIZE",
        template_name="偏好对比 · 优化演示",
        schema_json=schema_json,
        schema_checksum=schema_checksum,
        review_prompt=review_prompt,
        review_output_schema=review_output_schema,
        workflow_json=SINGLE_LEVEL_REVIEW_WORKFLOW,
        review_dimensions=review_dimensions,
        field_count=field_count,
        required_field_count=required_field_count,
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
    )
    optimize_batch = _append_ai_review_batch(
        tables,
        task_id=optimize_ctx["task_id"],
        template_version_id=optimize_ctx["template_version_id"],
        sample_prefix="H_OPT",
        count=50,
        owner_id=owner_id,
        labeler_id=labeler_id,
        reviewer_lin_id=reviewer_lin_id,
        review_prompt=review_prompt,
        review_output_schema=review_output_schema,
        review_dimensions=review_dimensions,
        build_ai_result=build_ai_result,
        add_audit_defaults=add_audit_defaults,
        id_pools=id_pools,
        system_user_id=system_user_id,
        agreement_ratio=0.62,
        include_human_review=True,
        start_days_ago=21,
        seed_misalignment_cases=True,
        misalignment_target=22,
    )
    _append_optimize_health_metrics(
        tables,
        template_version_id=optimize_ctx["template_version_id"],
        add_audit_defaults=add_audit_defaults,
        id_pools=id_pools,
    )
    _ = optimize_batch


def _create_health_task_bundle(
    tables: dict[str, list[dict[str, Any]]],
    *,
    owner_id: int,
    labeler_id: int,
    reviewer_lin_id: int,
    reviewer_qiao_id: int,
    task_code: str,
    task_title: str,
    template_code: str,
    template_name: str,
    schema_json: dict[str, Any],
    schema_checksum: str,
    review_prompt: str,
    review_output_schema: dict[str, Any],
    workflow_json: dict[str, Any],
    review_dimensions: list[dict[str, str]],
    field_count: int,
    required_field_count: int,
    add_audit_defaults: AddAuditDefaults,
    dt: Dt,
    id_pools: dict[str, Any],
) -> dict[str, int]:
    task_id = id_pools["task"].next()
    template_id = id_pools["template"].next()
    template_version_id = id_pools["template_version"].next()

    tables["tasks"].append(
        add_audit_defaults(
            {
                "id": task_id,
                "task_code": task_code,
                "owner_id": owner_id,
                "title": task_title,
                "description_text": f"Seed 健康度演示任务：{task_title}",
                "description_rich": f"<p>{task_title}</p>",
                "scene_code": "PREFERENCE_COMPARE",
                "status": "PUBLISHED",
                "distribute_strategy": "FIRST_COME",
                "quota": 50,
                "max_claim_per_user": 5,
                "acceptance_required_flag": 0,
                "acceptance_status": "NONE",
                "latest_acceptance_id": None,
                "reward_settlement_status": "DRAFT",
                "deadline_at": dt(60 * 24 * 14),
                "published_at": dt(12),
                "paused_at": None,
                "finished_at": None,
                "archived_at": None,
                "restored_at": None,
                "current_template_version_id": template_version_id,
                "tags_json": ["seed", "ai_review_health"],
                "reward_rule_json": {"mode": "PER_APPROVED", "base_amount": 10, "currency": "CNY"},
                "settings_json": {"allowTie": True},
                "import_payload_contract_json": None,
                "published_check_result_json": {"ok": True, "issues": []},
                "status_reason": "Seed health demo",
                "review_workflow_json": workflow_json,
                "version_no": 1,
            },
            created_by=owner_id,
            updated_by=owner_id,
        )
    )

    tables["templates"].append(
        add_audit_defaults(
            {
                "id": template_id,
                "task_id": task_id,
                "source_market_id": None,
                "template_code": template_code,
                "template_name": template_name,
                "scene_code": "PREFERENCE_COMPARE",
                "description_text": template_name,
                "current_template_version_id": template_version_id,
                "latest_version_no": 1,
                "status": "PUBLISHED",
            },
            created_by=owner_id,
            updated_by=owner_id,
        )
    )

    tables["template_versions"].append(
        add_audit_defaults(
            {
                "id": template_version_id,
                "task_id": task_id,
                "template_id": template_id,
                "version_no": 1,
                "template_name": f"{template_name} v1",
                "status": "PUBLISHED",
                "is_current": 1,
                "schema_json": schema_json,
                "schema_checksum": schema_checksum,
                "review_prompt_template": review_prompt,
                "review_output_schema_json": review_output_schema,
                "review_workflow_json": workflow_json,
                "acceptance_rule_json": {"mode": "RATIO", "value": 0.2},
                "llm_assist_config_json": LLM_ASSIST_CONFIG,
                "provider_platform_key": DEEPSEEK_PLATFORM_KEY,
                "model_id": DEEPSEEK_MODEL_CODE,
                "widget_count": field_count,
                "required_field_count": required_field_count,
                "validation_errors_json": [],
                "published_at": dt(13),
                "archived_at": None,
                "archived_reason": None,
            },
            created_by=owner_id,
            updated_by=owner_id,
        )
    )

    for index, dim in enumerate(review_dimensions, start=1):
        tables["template_review_dimensions"].append(
            add_audit_defaults(
                {
                    "id": id_pools["review_dimension"].next(),
                    "template_version_id": template_version_id,
                    "dimension_key": dim["dimension_key"],
                    "dimension_name": dim["dimension_name"],
                    "dimension_desc": dim["dimension_desc"],
                    "weight": Decimal(dim["weight"]),
                    "score_min": Decimal("0"),
                    "score_max": Decimal("100"),
                    "pass_threshold": Decimal(dim["pass_threshold"]),
                    "reject_threshold": Decimal(dim["reject_threshold"]),
                    "prompt_instruction": dim["prompt_instruction"],
                    "manual_review_hint": "结合题面和候选答案差异做判断。",
                    "severity_level": "MEDIUM",
                    "sort_no": index,
                    "required_flag": 1,
                },
                created_by=owner_id,
                updated_by=owner_id,
            )
        )

    for user_id, role in (
        (owner_id, "OWNER"),
        (labeler_id, "LABELER"),
        (reviewer_lin_id, "REVIEWER"),
    ):
        tables["task_members"].append(
            add_audit_defaults(
                {
                    "id": id_pools["task_members"].next(),
                    "task_id": task_id,
                    "user_id": user_id,
                    "member_role": role,
                    "permission_set_json": ["READ", "WRITE"] if role == "LABELER" else ["READ", "REVIEW"],
                    "status": "ACTIVE",
                    "joined_at": dt(14),
                },
                created_by=owner_id,
                updated_by=owner_id,
            )
        )

    return {
        "task_id": task_id,
        "template_id": template_id,
        "template_version_id": template_version_id,
    }


def _health_fixture_payload(sample_id: str, fixture_ref: dict[str, Any]) -> dict[str, Any]:
    return {
        "sample_id": sample_id,
        "task_type": fixture_ref["task_type"],
        "lang": fixture_ref["lang"],
        "prompt": fixture_ref["prompt"],
        "response_a": fixture_ref["response_a"],
        "response_b": fixture_ref["response_b"],
        "model_a": fixture_ref["model_a"],
        "model_b": fixture_ref["model_b"],
    }


def _append_ai_review_batch(
    tables: dict[str, list[dict[str, Any]]],
    *,
    task_id: int,
    template_version_id: int,
    sample_prefix: str,
    count: int,
    owner_id: int,
    labeler_id: int,
    reviewer_lin_id: int,
    review_prompt: str,
    review_output_schema: dict[str, Any],
    review_dimensions: list[dict[str, str]],
    build_ai_result: Callable[..., dict[str, Any]],
    add_audit_defaults: AddAuditDefaults,
    id_pools: dict[str, Any],
    system_user_id: int,
    agreement_ratio: float,
    include_human_review: bool,
    start_days_ago: int,
    seed_misalignment_cases: bool = False,
    misalignment_target: int = 0,
) -> list[dict[str, Any]]:
    misalignment_kinds = ["AI_STRICT", "AI_LENIENT", "APPEAL_OVERTURN"]
    misaligned_rows: list[dict[str, Any]] = []

    for index in range(1, count + 1):
        sample_id = f"{sample_prefix}_{index:02d}"
        days_ago = start_days_ago - (index % 7)
        submitted_at = health_ts(days_ago, hour=9 + (index % 6), minute=index % 60)
        finished_at = health_ts(days_ago, hour=10 + (index % 5), minute=(index * 3) % 60)

        fixture_ref = pick_fixtures(1, prefix=sample_prefix, seed=index)[0]
        payload = _health_fixture_payload(sample_id, fixture_ref)
        item_id = id_pools["task_item"].next()
        assignment_id = id_pools["assignment"].next()
        submission_id = id_pools["submission"].next()
        version_id = id_pools["submission_version"].next()

        tables["task_items"].append(
            add_audit_defaults(
                {
                    "id": item_id,
                    "task_id": task_id,
                    "import_batch_id": None,
                    "seq_no": index,
                    "source_item_key": sample_id,
                    "payload_json": payload,
                    "payload_hash": f"seed-health-{sample_id}",
                    "item_status": "ACTIVE",
                    "difficulty_level": 0,
                    "current_assignment_count": 1,
                    "current_approved_count": 0,
                    "acceptance_sampled_flag": 0,
                    "disabled_reason": None,
                    "last_accepted_at": None,
                },
                created_by=owner_id,
                updated_by=owner_id,
            )
        )
        tables["assignments"].append(
            add_audit_defaults(
                {
                    "id": assignment_id,
                    "task_id": task_id,
                    "item_id": item_id,
                    "slot_no": 1,
                    "labeler_id": labeler_id,
                    "assign_type": "AUTO_CLAIM",
                    "claim_source": "MARKET",
                    "status": "SUBMITTED",
                    "current_round_no": 1,
                    "assigned_by": owner_id,
                    "assigned_at": submitted_at,
                    "claimed_at": submitted_at,
                    "deadline_at": health_ts(max(days_ago - 7, 0)),
                    "closed_at": None,
                    "canceled_at": None,
                    "revoked_at": None,
                    "cancel_reason": None,
                },
                created_by=owner_id,
                updated_by=owner_id,
            )
        )

        submit_data = {
            "result": {
                "preferred": "A",
                "margin": "略优于",
                "dimensions": ["准确性", "完整性"],
                "annotator_note": f"健康度 seed 样本 {sample_id}",
            }
        }
        tables["submission_versions"].append(
            add_audit_defaults(
                {
                    "id": version_id,
                    "submission_id": submission_id,
                    "assignment_id": assignment_id,
                    "task_id": task_id,
                    "item_id": item_id,
                    "labeler_id": labeler_id,
                    "round_no": 1,
                    "template_version_id": template_version_id,
                    "previous_version_id": None,
                    "submit_source": "MANUAL",
                    "submit_data_json": submit_data,
                    "submit_data_hash": f"seed-health-hash-{sample_id}",
                    "submitted_at": submitted_at,
                },
                created_by=labeler_id,
                updated_by=labeler_id,
            )
        )

        misaligned = (index / max(count, 1)) > agreement_ratio
        ai_summary = f"健康度 seed AI 摘要 {sample_id}"
        human_comment = f"人工复核 {sample_id}"
        if misaligned:
            kind = misalignment_kinds[index % len(misalignment_kinds)]
            ai_verdict, human_action, ai_summary, human_comment = misalignment_scenario(fixture_ref, kind)
            submission_status = "APPROVED" if human_action in {"APPROVE", "PASS"} else "REJECTED"
            total_score = Decimal("35.0") if ai_verdict == "REJECT" else Decimal("88.0")
        else:
            ai_verdict = "REQUIRE_HUMAN" if index % 5 == 0 else "PASS"
            human_action = "APPROVE"
            submission_status = "APPROVED"
            total_score = Decimal("91.0")

        ai_task_id = id_pools["async_task"].next()
        tables["async_tasks"].append(
            add_audit_defaults(
                {
                    "id": ai_task_id,
                    "task_type": "AI_REVIEW",
                    "biz_type": "SUBMISSION",
                    "biz_id": submission_id,
                    "biz_key": f"health-ai:{submission_id}",
                    "priority": 5,
                    "status": "SUCCESS",
                    "payload_json": {"submissionId": submission_id, "submissionVersionId": version_id},
                    "retry_count": 0,
                    "max_retry_count": 3,
                    "manual_retry_count": 0,
                    "next_run_at": submitted_at,
                    "worker_id": "seed-health-ai-worker",
                    "locked_at": submitted_at,
                    "started_at": submitted_at,
                    "finished_at": finished_at,
                    "canceled_at": None,
                    "dead_lettered_at": None,
                    "last_error_code": None,
                    "last_error_message": None,
                }
            )
        )

        ai_review_id = id_pools["ai_review"].next()
        ai_result = build_ai_result(
            {
                "id": sample_id,
                "preferred": "A",
                "annotator_note": f"AI 审核 {sample_id}",
            },
            ai_verdict,
            total_score,
        )
        if index % 4 == 0:
            ai_result = _with_score_calibrations(ai_result, review_dimensions, index)

        tables["ai_review_records"].append(
            add_audit_defaults(
                {
                    "id": ai_review_id,
                    "submission_id": submission_id,
                    "submission_version_id": version_id,
                    "task_id": task_id,
                    "assignment_id": assignment_id,
                    "review_round_no": 1,
                    "platform_key": DEEPSEEK_PLATFORM_KEY,
                    "model_id": DEEPSEEK_MODEL_CODE,
                    "async_task_id": ai_task_id,
                    "provider_request_id": f"health-ai-{submission_id}",
                    "prompt_snapshot": review_prompt,
                    "input_snapshot_json": payload,
                    "output_schema_snapshot_json": review_output_schema,
                    "parsed_result_json": ai_result,
                    "raw_response_text": str(ai_result),
                    "verdict": ai_verdict,
                    "total_score": total_score,
                    "summary_text": ai_summary,
                    "retry_no": 0,
                    "status": "SUCCESS",
                    "failure_reason": None,
                    "manual_retry_flag": 0,
                    "dead_letter_flag": 0,
                    "fallback_target_status": "HUMAN_REVIEWING" if ai_verdict == "REQUIRE_HUMAN" else submission_status,
                    "started_at": submitted_at,
                    "finished_at": finished_at,
                }
            )
        )

        for score_sort, dim in enumerate(review_dimensions, start=1):
            score = Decimal("88.0") if ai_verdict != "REJECT" else Decimal("42.0")
            tables["ai_review_dimension_scores"].append(
                add_audit_defaults(
                    {
                        "id": id_pools["ai_dimension_score"].next(),
                        "ai_review_id": ai_review_id,
                        "dimension_key": dim["dimension_key"],
                        "dimension_name": dim["dimension_name"],
                        "score": score,
                        "weight": Decimal(dim["weight"]),
                        "verdict": "PASS" if score >= Decimal(dim["reject_threshold"]) else "FAIL",
                        "comment_text": dim["prompt_instruction"],
                        "sort_no": score_sort,
                    }
                )
            )

        review_record_id = None
        if include_human_review and submission_status in {"APPROVED", "REJECTED"}:
            review_record_id = id_pools["review_record"].next()
            tables["review_records"].append(
                add_audit_defaults(
                    {
                        "id": review_record_id,
                        "submission_id": submission_id,
                        "submission_version_id": version_id,
                        "task_id": task_id,
                        "assignment_id": assignment_id,
                        "reviewer_id": reviewer_lin_id,
                        "review_level": "L1",
                        "review_stage_no": 1,
                        "review_node_code": "L1_MAIN",
                        "action": human_action,
                        "from_status": "HUMAN_REVIEWING",
                        "to_status": submission_status,
                        "review_batch_key": f"health-review-{task_id}",
                        "next_review_level": None,
                        "is_final_decision": 1,
                        "comment_text": human_comment,
                        "diff_json": {"preferred": "A"},
                        "decided_at": finished_at,
                    },
                    created_by=reviewer_lin_id,
                    updated_by=reviewer_lin_id,
                )
            )

        tables["submissions"].append(
            add_audit_defaults(
                {
                    "id": submission_id,
                    "assignment_id": assignment_id,
                    "task_id": task_id,
                    "item_id": item_id,
                    "labeler_id": labeler_id,
                    "current_template_version_id": template_version_id,
                    "current_version_id": version_id,
                    "approved_version_id": version_id if submission_status == "APPROVED" else None,
                    "current_round_no": 1,
                    "current_status": submission_status,
                    "current_review_level": "L1" if submission_status == "APPROVED" else None,
                    "next_review_level": None,
                    "draft_data_json": None,
                    "draft_checksum": None,
                    "draft_saved_at": None,
                    "submit_count": 1,
                    "return_count": 0,
                    "reopen_count": 0,
                    "withdraw_count": 0,
                    "appeal_count": 0,
                    "last_submitted_at": submitted_at,
                    "revision_required_at": None,
                    "revision_deadline_at": None,
                    "finalized_at": finished_at if submission_status in {"APPROVED", "REJECTED"} else None,
                    "last_action_code": human_action if review_record_id else "AI_PASS",
                    "last_action_at": finished_at,
                    "last_return_reason_text": None,
                    "last_ai_review_id": ai_review_id,
                    "last_review_record_id": review_record_id,
                },
                created_by=labeler_id,
                updated_by=labeler_id,
            )
        )

        if misaligned and seed_misalignment_cases and len(misaligned_rows) < misalignment_target:
            mis_type = misalignment_kinds[index % len(misalignment_kinds)]
            split_tag = "TRAIN" if len(misaligned_rows) < max(misalignment_target - 6, 1) else "TEST"
            tables["ai_review_misalignment_cases"].append(
                add_audit_defaults(
                    {
                        "id": id_pools["misalignment_case"].next(),
                        "template_version_id": template_version_id,
                        "task_id": task_id,
                        "submission_id": submission_id,
                        "submission_version_id": version_id,
                        "ai_review_id": ai_review_id,
                        "ai_verdict": ai_verdict,
                        "human_label": human_action,
                        "misalignment_type": mis_type,
                        "appeal_id": None,
                        "item_payload_json": payload,
                        "submit_data_json": submit_data,
                        "ai_summary_text": ai_summary,
                        "ai_dimension_scores_json": ai_result.get("dimensions"),
                        "human_comment_text": human_comment,
                        "split_tag": split_tag,
                    }
                )
            )
            misaligned_rows.append({"submission_id": submission_id})

    return misaligned_rows


def _with_score_calibrations(
    ai_result: dict[str, Any],
    review_dimensions: list[dict[str, str]],
    seed: int,
) -> dict[str, Any]:
    dim = review_dimensions[seed % len(review_dimensions)]
    raw_score = 92 if seed % 2 == 0 else 48
    calibrated_score = 88 if raw_score > 80 else 55
    enriched = dict(ai_result)
    enriched["scoreCalibrations"] = [
        {
            "dimensionKey": dim["dimension_key"],
            "dimensionName": dim["dimension_name"],
            "rawScore": raw_score,
            "calibratedScore": calibrated_score,
            "anchor": 88.0,
            "tolerance": 5.0,
        }
    ]
    return enriched


def _enrich_main_template_ai_reviews(
    tables: dict[str, list[dict[str, Any]]],
    *,
    template_version_id: int,
    review_dimensions: list[dict[str, str]],
) -> None:
    touched = 0
    for row in tables.get("ai_review_records", []):
        if row.get("template_version_id") == template_version_id:
            continue
        version_id = row.get("submission_version_id")
        version_rows = [v for v in tables.get("submission_versions", []) if v["id"] == version_id]
        if not version_rows or version_rows[0]["template_version_id"] != template_version_id:
            continue
        if touched >= 6:
            break
        parsed = row.get("parsed_result_json")
        if not isinstance(parsed, dict):
            continue
        row["parsed_result_json"] = _with_score_calibrations(parsed, review_dimensions, touched + 3)
        touched += 1


def _append_main_health_metrics(
    tables: dict[str, list[dict[str, Any]]],
    *,
    template_version_id: int,
    add_audit_defaults: AddAuditDefaults,
    id_pools: dict[str, Any],
) -> None:
    trend_specs = [
        (7, 18, 0.58, 0.22, 0.18, 0.14, "WARNING"),
        (6, 24, 0.64, 0.20, 0.16, 0.13, "WARNING"),
        (5, 28, 0.68, 0.18, 0.15, 0.12, "WARNING"),
        (4, 33, 0.72, 0.16, 0.13, 0.11, "WARNING"),
        (3, 36, 0.76, 0.14, 0.11, 0.10, "HEALTHY"),
        (2, 39, 0.79, 0.12, 0.10, 0.09, "HEALTHY"),
        (1, 41, 0.66, 0.38, 0.22, 0.11, "NEEDS_OPTIMIZATION"),
    ]
    for days_ago, sample_count, agreement, appeal_pass, pass_reject, require_human, status in trend_specs:
        tables["ai_review_prompt_health_metrics"].append(
            add_audit_defaults(
                {
                    "id": id_pools["prompt_health_metric"].next(),
                    "template_version_id": template_version_id,
                    "task_id": VERSION_LEVEL_TASK_ID,
                    "metric_date": health_metric_date(days_ago),
                    "window_days": HEALTH_WINDOW_DAYS,
                    "sample_count": sample_count,
                    "metrics_json": {
                        "aiHumanAgreementRate": agreement,
                        "aiRejectAppealPassRate": appeal_pass,
                        "aiPassHumanRejectRate": pass_reject,
                        "requireHumanRatio": require_human,
                    },
                    "health_status": status,
                }
            )
        )


def _append_main_misalignment_cases(
    tables: dict[str, list[dict[str, Any]]],
    *,
    template_version_id: int,
    task_id: int,
    add_audit_defaults: AddAuditDefaults,
    id_pools: dict[str, Any],
) -> None:
    version_by_id = {row["id"]: row for row in tables.get("submission_versions", [])}
    main_ai_rows = [
        ai_row
        for ai_row in tables.get("ai_review_records", [])
        if version_by_id.get(ai_row["submission_version_id"], {}).get("template_version_id") == template_version_id
    ]
    if not main_ai_rows:
        return

    fixture_ids = ["P0001", "P0002", "P0004", "P0007", "P0008"]
    explicit_kinds: list[str] = ["AI_STRICT", "AI_STRICT", "AI_LENIENT", "AI_LENIENT", "APPEAL_OVERTURN"]
    for index, (fixture_id, mis_type) in enumerate(zip(fixture_ids, explicit_kinds)):
        ai_row = main_ai_rows[index % len(main_ai_rows)]
        version = version_by_id[ai_row["submission_version_id"]]
        fixture = FIXTURE_BY_ID[fixture_id]
        ai_verdict, human_label, ai_summary, human_comment = misalignment_scenario(fixture, mis_type)  # type: ignore[arg-type]
        payload = fixture_payload(fixture_id)
        split_tag = "TRAIN" if index < 4 else "TEST"
        tables["ai_review_misalignment_cases"].append(
            add_audit_defaults(
                {
                    "id": id_pools["misalignment_case"].next(),
                    "template_version_id": template_version_id,
                    "task_id": task_id,
                    "submission_id": version["submission_id"],
                    "submission_version_id": version["id"],
                    "ai_review_id": ai_row["id"],
                    "ai_verdict": ai_verdict,
                    "human_label": human_label,
                    "misalignment_type": mis_type,
                    "appeal_id": None,
                    "item_payload_json": payload,
                    "submit_data_json": version.get("submit_data_json"),
                    "ai_summary_text": ai_summary,
                    "ai_dimension_scores_json": ai_row.get("parsed_result_json", {}).get("dimensions"),
                    "human_comment_text": human_comment,
                    "split_tag": split_tag,
                }
            )
        )


def _append_optimize_health_metrics(
    tables: dict[str, list[dict[str, Any]]],
    *,
    template_version_id: int,
    add_audit_defaults: AddAuditDefaults,
    id_pools: dict[str, Any],
) -> None:
    tables["ai_review_prompt_health_metrics"].append(
        add_audit_defaults(
            {
                "id": id_pools["prompt_health_metric"].next(),
                "template_version_id": template_version_id,
                "task_id": VERSION_LEVEL_TASK_ID,
                "metric_date": health_metric_date(1),
                "window_days": HEALTH_WINDOW_DAYS,
                "sample_count": 50,
                "metrics_json": {
                    "aiHumanAgreementRate": 0.62,
                    "aiRejectAppealPassRate": 0.38,
                    "aiPassHumanRejectRate": 0.22,
                    "requireHumanRatio": 0.11,
                },
                "health_status": "NEEDS_OPTIMIZATION",
            }
        )
    )


def _sample_ab_test_report(*, passed: bool) -> dict[str, Any]:
    return {
        "testSampleCount": 12,
        "trainSampleCount": 28,
        "baselineTestAgreementRate": 0.66,
        "candidateTestAgreementRate": 0.79 if passed else 0.69,
        "baselineTestAiStrictRate": 0.34,
        "candidateTestAiStrictRate": 0.19 if passed else 0.30,
        "baselineTestAiLenientRate": 0.18,
        "candidateTestAiLenientRate": 0.10 if passed else 0.16,
        "baselineTestStabilityMedianDev": 0.05,
        "candidateTestStabilityMedianDev": 0.03,
        "trainOverfitGap": 0.02 if passed else 0.08,
        "overallPassed": passed,
        "comparisons": [
            {
                "metricKey": "test_agreement_rate",
                "metricLabel": "测试集一致率",
                "baselineValue": 0.66,
                "candidateValue": 0.79 if passed else 0.69,
                "delta": 0.13 if passed else 0.03,
                "passed": passed,
            },
            {
                "metricKey": "test_ai_strict_rate",
                "metricLabel": "AI 过严率",
                "baselineValue": 0.34,
                "candidateValue": 0.19 if passed else 0.30,
                "delta": -0.15 if passed else -0.04,
                "passed": passed,
            },
        ],
    }


def _append_main_prompt_suggestions(
    tables: dict[str, list[dict[str, Any]]],
    *,
    owner_id: int,
    task_id: int,
    template_id: int,
    template_version_id: int,
    review_prompt: str,
    add_audit_defaults: AddAuditDefaults,
    dt: Dt,
    id_pools: dict[str, Any],
) -> None:
    candidate_prompt = (
        review_prompt
        + "\n\n【优化补充】当标注员核心判断正确时，对次要表述差异倾向通过，降低 AI 过严误驳回。"
    )
    baseline_metrics = {
        "sampleCount": 41,
        "healthStatus": "NEEDS_OPTIMIZATION",
        "metrics": {
            "aiHumanAgreementRate": 0.66,
            "aiRejectAppealPassRate": 0.38,
            "aiPassHumanRejectRate": 0.22,
            "requireHumanRatio": 0.11,
        },
    }
    specs = [
        ("PENDING", None, None, None, None, _sample_ab_test_report(passed=True)),
        ("ACCEPTED", owner_id, dt(300), None, template_version_id, _sample_ab_test_report(passed=True)),
        ("DISMISSED", owner_id, dt(280), "当前版本已手动调整，暂不采纳系统建议", None, _sample_ab_test_report(passed=False)),
        ("EXPIRED", None, None, None, None, _sample_ab_test_report(passed=False)),
    ]
    for status, decided_by, decided_at, dismiss_reason, accepted_version_id, ab_report in specs:
        tables["ai_review_prompt_suggestions"].append(
            add_audit_defaults(
                {
                    "id": id_pools["prompt_suggestion"].next(),
                    "template_version_id": template_version_id,
                    "task_id": task_id,
                    "owner_id": owner_id,
                    "baseline_prompt_template": review_prompt,
                    "candidate_prompt_template": candidate_prompt,
                    "change_summary": {
                        "PENDING": "放宽 AI 过严驳回条件，针对 AI_STRICT 误判优化",
                        "ACCEPTED": "已采纳：补充「核心判断正确时倾向通过」条款",
                        "DISMISSED": "已忽略：Owner 选择维持当前 Prompt",
                        "EXPIRED": "已过期：超过处理窗口未操作",
                    }[status],
                    "baseline_metrics_json": baseline_metrics,
                    "ab_test_report_json": ab_report,
                    "status": status,
                    "decided_by": decided_by,
                    "decided_at": decided_at,
                    "dismiss_reason": dismiss_reason,
                    "accepted_template_version_id": accepted_version_id,
                    "cooldown_until": dt(60 * 24 * 14) if status == "DISMISSED" else None,
                },
                created_by=owner_id,
                updated_by=owner_id,
            )
        )

    _ = template_id  # reserved for future cross-links
