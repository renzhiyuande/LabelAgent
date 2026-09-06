"""Auxiliary seed universe for preference_compare (task/submission/ops state coverage)."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Callable

from seed_llm_constants import LLM_ASSIST_CONFIG, resolve_preference_model
from seed_permission_constants import (
    REVIEWER_LEVEL_PERM_IDS,
    REVIEWER_ROLE_ID,
    REVIEWER_WORKBENCH_PERM_ID,
    SEED_ROLE_REVIEWER_L1,
    SEED_ROLE_REVIEWER_L2L3,
)


@dataclass
class MinimalSubmissionRefs:
    submission_id: int = 0
    assignment_id: int = 0
    item_id: int = 0
    version_id: int | None = None

# Imported from generate_preference_compare_seed at runtime to avoid circular imports
AddAuditDefaults = Callable[..., dict[str, Any]]
Dt = Callable[[int], str]

SINGLE_LEVEL_REVIEW_WORKFLOW: dict[str, Any] = {
    "levels": [{"key": "L1", "label": "初审", "actions": ["approve", "reject", "return"]}],
}


def append_seed_universe(
    tables: dict[str, list[dict[str, Any]]],
    *,
    owner_id: int,
    labeler_id: int,
    reviewer_lin_id: int,
    reviewer_qiao_id: int,
    reviewer_ming_id: int,
    template_version_id: int,
    schema_json: dict[str, Any],
    review_prompt: str,
    review_output_schema: dict[str, Any],
    workflow_json: dict[str, Any],
    add_audit_defaults: AddAuditDefaults,
    dt: Dt,
    id_pools: dict[str, Any],
    tenant_id: int,
    system_user_id: int,
) -> None:
    """Append auxiliary tasks, roles, markets (if not main), submissions, ops rows."""
    _append_seed_roles_and_permissions(tables, add_audit_defaults, dt, id_pools, tenant_id, system_user_id)
    _append_template_market_extras(
        tables,
        owner_id=owner_id,
        template_version_id=template_version_id,
        schema_json=schema_json,
        review_prompt=review_prompt,
        review_output_schema=review_output_schema,
        workflow_json=workflow_json,
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
        tenant_id=tenant_id,
    )
    _append_task_status_aux(
        tables,
        owner_id=owner_id,
        labeler_id=labeler_id,
        reviewer_lin_id=reviewer_lin_id,
        reviewer_qiao_id=reviewer_qiao_id,
        reviewer_ming_id=reviewer_ming_id,
        template_version_id=template_version_id,
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
    )
    _append_single_level_review_aux(
        tables,
        owner_id=owner_id,
        labeler_id=labeler_id,
        reviewer_lin_id=reviewer_lin_id,
        template_version_id=template_version_id,
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
    )
    _append_submission_status_aux(
        tables,
        owner_id=owner_id,
        labeler_id=labeler_id,
        reviewer_lin_id=reviewer_lin_id,
        reviewer_qiao_id=reviewer_qiao_id,
        reviewer_ming_id=reviewer_ming_id,
        template_version_id=template_version_id,
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
    )
    _append_assignment_status_aux(
        tables,
        owner_id=owner_id,
        labeler_id=labeler_id,
        template_version_id=template_version_id,
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
    )
    _append_ops_status_aux(
        tables,
        owner_id=owner_id,
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
    )


def _append_seed_roles_and_permissions(
    tables: dict[str, list[ dict[str, Any]]],
    add_audit_defaults: AddAuditDefaults,
    dt: Dt,
    id_pools: dict[str, Any],
    tenant_id: int,
    system_user_id: int,
) -> None:
    # Referenced by seed user_roles; INSERT IGNORE in SQL when V2 migration already applied
    platform_roles = [
        (2001, "OWNER", "Owner", "Platform owner"),
        (2003, "LABELER", "Labeler", "Labeling operator"),
        (REVIEWER_ROLE_ID, "REVIEWER", "Reviewer", "Review operator"),
    ]
    seed_roles = [
        (SEED_ROLE_REVIEWER_L1, "SEED_REVIEWER_L1", "Seed 初审审核员", "仅 L1 审核权限"),
        (SEED_ROLE_REVIEWER_L2L3, "SEED_REVIEWER_L2L3", "Seed 复审终审审核员", "L2/L3 审核权限"),
    ]
    for role_id, code, name, remark in platform_roles + seed_roles:
        tables.setdefault("roles", []).append(
            add_audit_defaults(
                {
                    "id": role_id,
                    "role_code": code,
                    "role_name": name,
                    "status": "ACTIVE",
                    "remark": remark,
                },
                created_by=system_user_id,
                updated_by=system_user_id,
            )
        )

    perm_map = [
        (SEED_ROLE_REVIEWER_L1, REVIEWER_WORKBENCH_PERM_ID),
        (SEED_ROLE_REVIEWER_L1, REVIEWER_LEVEL_PERM_IDS["L1"]),
        (SEED_ROLE_REVIEWER_L2L3, REVIEWER_WORKBENCH_PERM_ID),
        (SEED_ROLE_REVIEWER_L2L3, REVIEWER_LEVEL_PERM_IDS["L2"]),
        (SEED_ROLE_REVIEWER_L2L3, REVIEWER_LEVEL_PERM_IDS["L3"]),
    ]
    for role_id, perm_id in perm_map:
        tables.setdefault("role_permissions", []).append(
            add_audit_defaults(
                {
                    "id": id_pools["seed_role_perm"].next(),
                    "role_id": role_id,
                    "permission_id": perm_id,
                    "grant_source": "SEED",
                },
                created_by=system_user_id,
                updated_by=system_user_id,
            )
        )

    from seed_owner_permissions import append_owner_role_menus, append_owner_role_permissions

    append_owner_role_permissions(
        tables,
        add_audit_defaults=add_audit_defaults,
        id_pools=id_pools,
        system_user_id=system_user_id,
    )
    append_owner_role_menus(
        tables,
        add_audit_defaults=add_audit_defaults,
        system_user_id=system_user_id,
    )


def _append_template_market_extras(
    tables: dict[str, list[dict[str, Any]]],
    *,
    owner_id: int,
    template_version_id: int,
    schema_json: dict[str, Any],
    review_prompt: str,
    review_output_schema: dict[str, Any],
    workflow_json: dict[str, Any],
    add_audit_defaults: AddAuditDefaults,
    dt: Dt,
    id_pools: dict[str, Any],
    tenant_id: int,
) -> None:
    """PENDING + REJECTED market rows (APPROVED is wired on main template)."""
    base = {
        "tenant_id": tenant_id,
        "template_description": "偏好对比模板市场条目",
        "category_code": "PREFERENCE",
        "scene_code": "PREFERENCE_COMPARE",
        "cover_image_file_id": None,
        "author_id": owner_id,
        "source_tenant_id": tenant_id,
        "source_task_id": None,
        "template_version_id": None,
        "schema_json": schema_json,
        "review_prompt_template": review_prompt,
        "review_output_schema_json": review_output_schema,
        "review_workflow_json": workflow_json,
        "acceptance_rule_json": {"mode": "RATIO", "value": 0.2},
        "llm_assist_config_json": LLM_ASSIST_CONFIG,
        "tags_json": ["seed", "preference_compare"],
        "download_count": 0,
        "like_count": 0,
        "view_count": 0,
        "favorite_count": 0,
        "rating_avg": None,
        "rating_count": 0,
        "is_public": 1,
        "is_featured": 0,
        "status": "ACTIVE",
    }
    tables.setdefault("template_market", []).append(
        add_audit_defaults(
            {
                **base,
                "id": id_pools["template_market"].next(),
                "template_code": "TPL_MARKET_PREF_PENDING",
                "template_name": "偏好对比（待审上架）",
                "audit_status": "PENDING",
                "published_at": None,
            },
            created_by=owner_id,
            updated_by=owner_id,
        )
    )
    tables["template_market"].append(
        add_audit_defaults(
            {
                **base,
                "id": id_pools["template_market"].next(),
                "template_code": "TPL_MARKET_PREF_REJECTED",
                "template_name": "偏好对比（上架被拒）",
                "audit_status": "REJECTED",
                "published_at": None,
                "ext_json": {"rejectReason": "示例：审核维度配置不完整"},
            },
            created_by=owner_id,
            updated_by=owner_id,
        )
    )


def _append_task_members(
    tables: dict[str, list[dict[str, Any]]],
    *,
    task_id: int,
    owner_id: int,
    labeler_ids: list[int],
    reviewer_ids: list[int],
    add_audit_defaults: AddAuditDefaults,
    dt: Dt,
    id_pools: dict[str, Any],
) -> None:
    for user_id in labeler_ids:
        tables["task_members"].append(
            add_audit_defaults(
                {
                    "id": id_pools["task_members"].next(),
                    "task_id": task_id,
                    "user_id": user_id,
                    "member_role": "LABELER",
                    "permission_set_json": ["READ", "WRITE"],
                    "status": "ACTIVE",
                    "joined_at": dt(18),
                },
                created_by=owner_id,
                updated_by=owner_id,
            )
        )
    for user_id in reviewer_ids:
        tables["task_members"].append(
            add_audit_defaults(
                {
                    "id": id_pools["task_members"].next(),
                    "task_id": task_id,
                    "user_id": user_id,
                    "member_role": "REVIEWER",
                    "permission_set_json": ["READ", "REVIEW"],
                    "status": "ACTIVE",
                    "joined_at": dt(19),
                },
                created_by=owner_id,
                updated_by=owner_id,
            )
        )


def _append_standalone_task_items(
    tables: dict[str, list[dict[str, Any]]],
    *,
    task_id: int,
    sample_prefix: str,
    count: int,
    owner_id: int,
    add_audit_defaults: AddAuditDefaults,
    id_pools: dict[str, Any],
) -> None:
    for index in range(1, count + 1):
        sample_id = f"{sample_prefix}_{index:02d}"
        tables["task_items"].append(
            add_audit_defaults(
                {
                    "id": id_pools["task_item"].next(),
                    "task_id": task_id,
                    "import_batch_id": None,
                    "seq_no": index,
                    "source_item_key": sample_id,
                    "payload_json": _fixture_payload(sample_id, f"PLACEHOLDER 辅任务 {sample_id}"),
                    "payload_hash": "seed",
                    "item_status": "ACTIVE",
                    "difficulty_level": 0,
                    "current_assignment_count": 0,
                    "current_approved_count": 0,
                    "acceptance_sampled_flag": 0,
                    "disabled_reason": None,
                    "last_accepted_at": None,
                },
                created_by=owner_id,
                updated_by=owner_id,
            )
        )


def _fixture_payload(sample_id: str, fallback_prompt: str) -> dict[str, Any]:
    from preference_compare_fixtures import pick_fixtures

    fixtures = pick_fixtures(1, prefix=sample_id.rsplit("_", 1)[0], seed=sum(ord(c) for c in sample_id))
    if fixtures:
        ref = fixtures[0]
        return {
            "sample_id": sample_id,
            "task_type": ref["task_type"],
            "lang": ref["lang"],
            "prompt": ref["prompt"],
            "response_a": ref["response_a"],
            "response_b": ref["response_b"],
            "model_a": ref["model_a"],
            "model_b": ref["model_b"],
        }
    return {
        "sample_id": sample_id,
        "task_type": "知识问答",
        "lang": "zh",
        "prompt": fallback_prompt,
        "response_a": "PLACEHOLDER 回答 A（状态机演示）",
        "response_b": "PLACEHOLDER 回答 B（状态机演示）",
        "model_a": resolve_preference_model("deepseek-v4-flash"),
        "model_b": resolve_preference_model("deepseek-reasoner"),
    }


def _append_task_row(
    tables: dict[str, list[dict[str, Any]]],
    *,
    task_code: str,
    title: str,
    status: str,
    owner_id: int,
    template_version_id: int | None,
    quota: int,
    acceptance_status: str,
    reward_settlement_status: str,
    add_audit_defaults: AddAuditDefaults,
    dt: Dt,
    id_pools: dict[str, Any],
    workflow_json: dict[str, Any],
    **extra: Any,
) -> int:
    task_id = id_pools["task"].next()
    row = add_audit_defaults(
        {
            "id": task_id,
            "task_code": task_code,
            "owner_id": owner_id,
            "title": title,
            "description_text": f"Seed 辅任务：{title}",
            "description_rich": f"<p>{title}</p>",
            "scene_code": "PREFERENCE_COMPARE",
            "status": status,
            "distribute_strategy": "FIRST_COME",
            "quota": quota,
            "max_claim_per_user": 3,
            "acceptance_required_flag": 1 if acceptance_status != "NONE" else 0,
            "acceptance_status": acceptance_status if acceptance_status != "NONE" else "PENDING",
            "latest_acceptance_id": extra.get("latest_acceptance_id"),
            "reward_settlement_status": reward_settlement_status,
            "deadline_at": dt(60 * 24 * 14),
            "published_at": extra.get("published_at"),
            "paused_at": extra.get("paused_at"),
            "finished_at": None,
            "archived_at": extra.get("archived_at"),
            "restored_at": None,
            "current_template_version_id": template_version_id,
            "tags_json": ["seed", "aux"],
            "reward_rule_json": {
                "mode": "PER_APPROVED",
                "base_amount": Decimal("10"),
                "currency": "CNY",
                "settle_unit": "SUBMISSION",
            },
            "settings_json": {"allowTie": True},
            "import_payload_contract_json": None,
            "published_check_result_json": {"ok": True, "issues": []},
            "status_reason": "Seed auxiliary task",
            "review_workflow_json": workflow_json,
            "version_no": 1,
        },
        created_by=owner_id,
        updated_by=owner_id,
    )
    tables["tasks"].append(row)
    return task_id


def _append_task_status_aux(
    tables: dict[str, list[dict[str, Any]]],
    *,
    owner_id: int,
    labeler_id: int,
    reviewer_lin_id: int,
    reviewer_qiao_id: int,
    reviewer_ming_id: int,
    template_version_id: int,
    add_audit_defaults: AddAuditDefaults,
    dt: Dt,
    id_pools: dict[str, Any],
) -> None:
    from generate_preference_compare_seed import THREE_LEVEL_REVIEW_WORKFLOW

    wf = THREE_LEVEL_REVIEW_WORKFLOW

    draft_task = _append_task_row(
        tables,
        task_code="TASK_SM_DRAFT",
        title="任务状态 · 草稿",
        status="DRAFT",
        owner_id=owner_id,
        template_version_id=template_version_id,
        quota=2,
        acceptance_status="NONE",
        reward_settlement_status="DRAFT",
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
        workflow_json=wf,
        published_at=None,
    )
    _append_standalone_task_items(
        tables,
        task_id=draft_task,
        sample_prefix="SM_DRAFT",
        count=2,
        owner_id=owner_id,
        add_audit_defaults=add_audit_defaults,
        id_pools=id_pools,
    )
    paused_task = _append_task_row(
        tables,
        task_code="TASK_SM_PAUSED",
        title="任务状态 · 已暂停",
        status="PAUSED",
        owner_id=owner_id,
        template_version_id=template_version_id,
        quota=2,
        acceptance_status="NONE",
        reward_settlement_status="DRAFT",
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
        workflow_json=wf,
        published_at=dt(10),
        paused_at=dt(100),
    )
    _append_standalone_task_items(
        tables,
        task_id=paused_task,
        sample_prefix="SM_PAUSED",
        count=2,
        owner_id=owner_id,
        add_audit_defaults=add_audit_defaults,
        id_pools=id_pools,
    )
    archived_task = _append_task_row(
        tables,
        task_code="TASK_SM_ARCHIVED",
        title="任务状态 · 已归档",
        status="ARCHIVED",
        owner_id=owner_id,
        template_version_id=template_version_id,
        quota=1,
        acceptance_status="NONE",
        reward_settlement_status="DRAFT",
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
        workflow_json=wf,
        published_at=dt(10),
        archived_at=dt(200),
    )
    _append_standalone_task_items(
        tables,
        task_id=archived_task,
        sample_prefix="SM_ARCH",
        count=1,
        owner_id=owner_id,
        add_audit_defaults=add_audit_defaults,
        id_pools=id_pools,
    )

    accept_task = _append_task_row(
        tables,
        task_code="TASK_SM_ACCEPT",
        title="验收状态 · 抽样中",
        status="PUBLISHED",
        owner_id=owner_id,
        template_version_id=template_version_id,
        quota=2,
        acceptance_status="PENDING",
        reward_settlement_status="DRAFT",
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
        workflow_json=wf,
        published_at=dt(15),
    )
    pending_acceptance_id = id_pools["acceptance"].next()
    tables["task_acceptance_records"].append(
        add_audit_defaults(
            {
                "id": pending_acceptance_id,
                "task_id": accept_task,
                "acceptance_type": "FINAL_CONFIRM",
                "accepted_by": owner_id,
                "status": "PENDING",
                "sample_rule_json": {"mode": "RATIO", "value": 0.5},
                "target_scope_json": {"status": ["APPROVED"]},
                "sample_total_count": 0,
                "sampled_count": 0,
                "pass_count": 0,
                "failed_count": 0,
                "comment_text": "Seed 验收待启动",
                "confirmed_at": None,
                "reopened_at": None,
                "archived_at": None,
            },
            created_by=owner_id,
            updated_by=owner_id,
        )
    )
    acceptance_id = id_pools["acceptance"].next()
    tables["task_acceptance_records"].append(
        add_audit_defaults(
            {
                "id": acceptance_id,
                "task_id": accept_task,
                "acceptance_type": "FINAL_CONFIRM",
                "accepted_by": owner_id,
                "status": "SAMPLING",
                "sample_rule_json": {"mode": "RATIO", "value": 0.5},
                "target_scope_json": {"status": ["APPROVED"]},
                "sample_total_count": 0,
                "sampled_count": 0,
                "pass_count": 0,
                "failed_count": 0,
                "comment_text": "Seed 验收抽样进行中",
                "confirmed_at": None,
                "reopened_at": None,
                "archived_at": None,
            },
            created_by=owner_id,
            updated_by=owner_id,
        )
    )
    for t in tables["tasks"]:
        if t["id"] == accept_task:
            t["acceptance_status"] = "PENDING"
            t["latest_acceptance_id"] = acceptance_id
            break
    _append_task_members(
        tables,
        task_id=accept_task,
        owner_id=owner_id,
        labeler_ids=[labeler_id],
        reviewer_ids=[reviewer_lin_id, reviewer_qiao_id, reviewer_ming_id],
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
    )

    accept_samples: list[tuple[MinimalSubmissionRefs, str]] = []
    for index, (sample_id, owner_decision) in enumerate(
        (("S_ACC_01", "PASS"), ("S_ACC_02", "FAIL")),
        start=1,
    ):
        refs = _append_minimal_submission(
            tables,
            task_id=accept_task,
            sample_id=sample_id,
            prompt=f"验收抽样样本 {sample_id}",
            labeler_id=labeler_id,
            template_version_id=template_version_id,
            assignment_status="SUBMITTED",
            submission_status="APPROVED",
            add_audit_defaults=add_audit_defaults,
            dt=dt,
            id_pools=id_pools,
            owner_id=owner_id,
            seq_no=index,
            with_version=True,
            submit_count=1,
            last_submitted_at=dt(170 + index),
            finalized_at=dt(175 + index),
            last_action_code="APPROVE",
            last_action_at=dt(175 + index),
            current_review_level="L3",
        )
        accept_samples.append((refs, owner_decision))

    for row in tables["task_acceptance_records"]:
        if row["id"] == acceptance_id:
            row["sample_total_count"] = len(accept_samples)
            row["sampled_count"] = len(accept_samples)
            row["pass_count"] = sum(1 for _, decision in accept_samples if decision == "PASS")
            row["failed_count"] = sum(1 for _, decision in accept_samples if decision == "FAIL")
            break

    for refs, owner_decision in accept_samples:
        tables["task_acceptance_samples"].append(
            add_audit_defaults(
                {
                    "id": id_pools["acceptance_sample"].next(),
                    "acceptance_id": acceptance_id,
                    "task_id": accept_task,
                    "submission_id": refs.submission_id,
                    "submission_version_id": refs.version_id,
                    "assignment_id": refs.assignment_id,
                    "labeler_id": labeler_id,
                    "reviewer_id": reviewer_lin_id,
                    "sample_source": "AUTO",
                    "sample_status": "CHECKED",
                    "owner_decision": owner_decision,
                    "owner_comment_text": f"Seed 验收抽样 {owner_decision}",
                    "checked_at": dt(176),
                },
                created_by=owner_id,
                updated_by=owner_id,
            )
        )
        for item in tables["task_items"]:
            if item["id"] == refs.item_id:
                item["acceptance_sampled_flag"] = 1
                break

    reopened_acceptance_id = id_pools["acceptance"].next()
    tables["task_acceptance_records"].append(
        add_audit_defaults(
            {
                "id": reopened_acceptance_id,
                "task_id": accept_task,
                "acceptance_type": "FINAL_CONFIRM",
                "accepted_by": owner_id,
                "status": "REOPENED",
                "sample_rule_json": {"mode": "RATIO", "value": 0.3},
                "target_scope_json": {"status": ["APPROVED"]},
                "sample_total_count": 1,
                "sampled_count": 1,
                "pass_count": 0,
                "failed_count": 1,
                "comment_text": "Seed 验收已确认后重开",
                "confirmed_at": dt(160),
                "reopened_at": dt(165),
                "archived_at": None,
            },
            created_by=owner_id,
            updated_by=owner_id,
        )
    )

    finished_task = _append_task_row(
        tables,
        task_code="TASK_SM_FINISHED",
        title="任务状态 · 已结束",
        status="FINISHED",
        owner_id=owner_id,
        template_version_id=template_version_id,
        quota=1,
        acceptance_status="NONE",
        reward_settlement_status="DRAFT",
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
        workflow_json=wf,
        published_at=dt(10),
        finished_at=dt(175),
    )
    _append_standalone_task_items(
        tables,
        task_id=finished_task,
        sample_prefix="SM_FIN",
        count=1,
        owner_id=owner_id,
        add_audit_defaults=add_audit_defaults,
        id_pools=id_pools,
    )

    reward_task = _append_task_row(
        tables,
        task_code="TASK_SM_REWARD",
        title="奖励结算 · 多状态梯子",
        status="PUBLISHED",
        owner_id=owner_id,
        template_version_id=template_version_id,
        quota=5,
        acceptance_status="NONE",
        reward_settlement_status="DRAFT",
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
        workflow_json=wf,
        published_at=dt(15),
    )
    _append_task_members(
        tables,
        task_id=reward_task,
        owner_id=owner_id,
        labeler_ids=[labeler_id],
        reviewer_ids=[reviewer_lin_id, reviewer_qiao_id, reviewer_ming_id],
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
    )
    batch_statuses = ["DRAFT", "CONFIRMED", "PENDING", "PAID", "REVERSED"]
    batch_ids_by_status: dict[str, int] = {}
    for index, batch_status in enumerate(batch_statuses, start=1):
        batch_id = id_pools["reward_batch"].next()
        batch_ids_by_status[batch_status] = batch_id
        tables["reward_settlement_batches"].append(
            add_audit_defaults(
                {
                    "id": batch_id,
                    "task_id": reward_task,
                    "batch_no": f"RB-SM-{batch_status}",
                    "status": batch_status,
                    "settle_scope": "APPROVED_ONLY",
                    "currency_code": "CNY",
                    "reward_rule_snapshot_json": {"mode": "PER_APPROVED", "base_amount": 10, "currency": "CNY"},
                    "target_total_count": 1,
                    "effective_total_count": 1 if batch_status in {"PAID", "REVERSED"} else 0,
                    "user_total_count": 1 if batch_status in {"PAID", "REVERSED"} else 0,
                    "total_amount": Decimal("10.00") if batch_status in {"PAID", "REVERSED"} else Decimal("0"),
                    "confirmed_by": owner_id if batch_status != "DRAFT" else None,
                    "confirmed_at": dt(300 + index) if batch_status != "DRAFT" else None,
                    "paid_at": dt(310 + index) if batch_status == "PAID" else None,
                    "reversed_at": dt(320 + index) if batch_status == "REVERSED" else None,
                    "export_file_id": None,
                    "remark": f"Seed reward batch {batch_status}",
                },
                created_by=owner_id,
                updated_by=owner_id,
            )
        )
    for t in tables["tasks"]:
        if t["id"] == reward_task and batch_statuses:
            t["reward_settlement_status"] = "REVERSED"

    reward_refs = _append_minimal_submission(
        tables,
        task_id=reward_task,
        sample_id="S_RWD_PAID",
        prompt="奖励结算样本（已支付）",
        labeler_id=labeler_id,
        template_version_id=template_version_id,
        assignment_status="SUBMITTED",
        submission_status="APPROVED",
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
        owner_id=owner_id,
        seq_no=1,
        with_version=True,
        submit_count=1,
        last_submitted_at=dt(280),
        finalized_at=dt(290),
        last_action_code="APPROVE",
        last_action_at=dt(290),
        current_review_level="L3",
    )
    for detail_status, batch_status in (("PAID", "PAID"), ("REVERSED", "REVERSED")):
        tables["reward_settlement_details"].append(
            add_audit_defaults(
                {
                    "id": id_pools["reward_detail"].next(),
                    "batch_id": batch_ids_by_status[batch_status],
                    "task_id": reward_task,
                    "user_id": labeler_id,
                    "submission_id": reward_refs.submission_id,
                    "submission_version_id": reward_refs.version_id,
                    "assignment_id": reward_refs.assignment_id,
                    "currency_code": "CNY",
                    "amount": Decimal("10.00"),
                    "status": detail_status,
                    "quality_score": Decimal("88.0"),
                    "reward_reason": "SEED_AUX",
                    "calc_basis_json": {"mode": "SEED", "sampleId": "S_RWD_PAID"},
                    "effective_at": dt(305),
                    "settled_at": dt(310) if detail_status == "PAID" else None,
                    "reversed_at": dt(320) if detail_status == "REVERSED" else None,
                },
                created_by=owner_id,
                updated_by=owner_id,
            )
        )

    for aux_task_id, member_labeler in ((draft_task, labeler_id), (paused_task, labeler_id)):
        tables["task_members"].append(
            add_audit_defaults(
                {
                    "id": id_pools["task_members"].next(),
                    "task_id": aux_task_id,
                    "user_id": member_labeler,
                    "member_role": "LABELER",
                    "permission_set_json": ["READ", "WRITE"],
                    "status": "ACTIVE",
                    "joined_at": dt(18),
                },
                created_by=owner_id,
                updated_by=owner_id,
            )
        )


def _append_minimal_submission(
    tables: dict[str, list[dict[str, Any]]],
    *,
    task_id: int,
    sample_id: str,
    prompt: str,
    labeler_id: int,
    template_version_id: int,
    assignment_status: str,
    submission_status: str,
    add_audit_defaults: AddAuditDefaults,
    dt: Dt,
    id_pools: dict[str, Any],
    owner_id: int,
    seq_no: int = 1,
    with_version: bool = False,
    **submission_extra: Any,
) -> MinimalSubmissionRefs:
    payload = _fixture_payload(sample_id, prompt)
    item_id = id_pools["task_item"].next()
    tables["task_items"].append(
        add_audit_defaults(
            {
                "id": item_id,
                "task_id": task_id,
                "import_batch_id": None,
                "seq_no": seq_no,
                "source_item_key": sample_id,
                "payload_json": payload,
                "payload_hash": "seed",
                "item_status": "ACTIVE",
                "difficulty_level": 0,
                "current_assignment_count": 1 if assignment_status != "UNCLAIMED" else 0,
                "current_approved_count": 0,
                "acceptance_sampled_flag": 0,
                "disabled_reason": None,
                "last_accepted_at": None,
            },
            created_by=owner_id,
            updated_by=owner_id,
        )
    )
    assignment_id = id_pools["assignment"].next()
    tables["assignments"].append(
        add_audit_defaults(
            {
                "id": assignment_id,
                "task_id": task_id,
                "item_id": item_id,
                "slot_no": 1,
                "labeler_id": None if assignment_status == "UNCLAIMED" else labeler_id,
                "assign_type": "PRESEED" if assignment_status == "UNCLAIMED" else "AUTO_CLAIM",
                "claim_source": "MARKET",
                "status": assignment_status,
                "current_round_no": 1,
                "assigned_by": owner_id,
                "assigned_at": dt(40),
                "claimed_at": None if assignment_status == "UNCLAIMED" else dt(42),
                "deadline_at": dt(60 * 24),
                "closed_at": None,
                "canceled_at": dt(50) if assignment_status == "CANCELLED" else None,
                "revoked_at": None,
                "cancel_reason": "seed canceled" if assignment_status == "CANCELLED" else None,
            },
            created_by=owner_id,
            updated_by=owner_id,
        )
    )
    if submission_status is None:
        return MinimalSubmissionRefs(item_id=item_id, assignment_id=assignment_id)

    submission_id = id_pools["submission"].next()
    version_id = submission_extra.get("current_version_id")
    if with_version and version_id is None:
        version_id = id_pools["submission_version"].next()
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
                    "submit_source": "WORKBENCH",
                    "submit_data_json": {"result": {"preferred": "A", "margin": "相当", "annotator_note": "seed aux"}},
                    "submit_data_hash": "seed-aux-hash",
                    "submitted_at": submission_extra.get("last_submitted_at") or dt(50),
                },
                created_by=labeler_id,
                updated_by=labeler_id,
            )
        )

    approved_version_id = version_id if submission_status == "APPROVED" and with_version else None
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
                "approved_version_id": approved_version_id,
                "current_round_no": 1,
                "current_status": submission_status,
                "current_review_level": submission_extra.get("current_review_level"),
                "next_review_level": submission_extra.get("next_review_level"),
                "draft_data_json": submission_extra.get("draft_data_json"),
                "draft_checksum": None,
                "draft_saved_at": submission_extra.get("draft_saved_at"),
                "submit_count": submission_extra.get("submit_count", 0),
                "return_count": submission_extra.get("return_count", 0),
                "reopen_count": submission_extra.get("reopen_count", 0),
                "withdraw_count": submission_extra.get("withdraw_count", 0),
                "appeal_count": submission_extra.get("appeal_count", 0),
                "last_submitted_at": submission_extra.get("last_submitted_at"),
                "revision_required_at": None,
                "revision_deadline_at": None,
                "finalized_at": submission_extra.get("finalized_at"),
                "last_action_code": submission_extra.get("last_action_code"),
                "last_action_at": submission_extra.get("last_action_at"),
                "last_return_reason_text": None,
                "last_ai_review_id": submission_extra.get("last_ai_review_id"),
                "last_review_record_id": None,
            },
            created_by=labeler_id,
            updated_by=labeler_id,
        )
    )
    return MinimalSubmissionRefs(
        submission_id=submission_id,
        assignment_id=assignment_id,
        item_id=item_id,
        version_id=version_id,
    )


def _append_submission_status_aux(
    tables: dict[str, list[dict[str, Any]]],
    *,
    owner_id: int,
    labeler_id: int,
    reviewer_lin_id: int,
    reviewer_qiao_id: int,
    reviewer_ming_id: int,
    template_version_id: int,
    add_audit_defaults: AddAuditDefaults,
    dt: Dt,
    id_pools: dict[str, Any],
) -> None:
    from generate_preference_compare_seed import THREE_LEVEL_REVIEW_WORKFLOW

    task_id = _append_task_row(
        tables,
        task_code="TASK_SM_SUBMISSION",
        title="提交状态 · 合成覆盖",
        status="PUBLISHED",
        owner_id=owner_id,
        template_version_id=template_version_id,
        quota=9,
        acceptance_status="NONE",
        reward_settlement_status="DRAFT",
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
        workflow_json=THREE_LEVEL_REVIEW_WORKFLOW,
        published_at=dt(15),
    )
    _append_task_members(
        tables,
        task_id=task_id,
        owner_id=owner_id,
        labeler_ids=[labeler_id],
        reviewer_ids=[reviewer_lin_id, reviewer_qiao_id, reviewer_ming_id],
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
    )

    scenarios: list[tuple[str, str, str, dict[str, Any]]] = [
        ("S_SUB_WAIT", "SUBMITTED", "SUBMITTED", {"submit_count": 1, "last_submitted_at": dt(60), "last_action_code": "SUBMIT"}),
        ("S_AI_RUN", "SUBMITTED", "AI_REVIEWING", {"submit_count": 1, "last_submitted_at": dt(61), "last_action_code": "ENTER_AI_REVIEW"}),
        (
            "S_APL_01",
            "SUBMITTED",
            "APPEALING",
            {
                "submit_count": 1,
                "appeal_count": 1,
                "finalized_at": dt(70),
                "last_action_code": "SUBMIT_APPEAL",
                "last_action_at": dt(71),
                "current_review_level": None,
            },
        ),
        (
            "S_APL_02",
            "SUBMITTED",
            "APPEAL_APPROVED",
            {
                "submit_count": 1,
                "last_action_code": "APPEAL_APPROVE",
                "last_action_at": dt(72),
                "current_review_level": "L1",
            },
        ),
        (
            "S_APL_03",
            "SUBMITTED",
            "APPEAL_REJECTED",
            {
                "submit_count": 1,
                "finalized_at": dt(73),
                "last_action_code": "APPEAL_REJECT",
                "last_action_at": dt(73),
            },
        ),
        (
            "S_WTH_01",
            "CLAIMED",
            "DRAFT",
            {
                "submit_count": 1,
                "withdraw_count": 1,
                "last_action_code": "WITHDRAW",
                "last_action_at": dt(74),
                "draft_saved_at": dt(75),
            },
        ),
        (
            "S_HUM_L2",
            "SUBMITTED",
            "HUMAN_REVIEWING",
            {
                "submit_count": 1,
                "last_submitted_at": dt(76),
                "current_review_level": "L2",
                "next_review_level": "L3",
                "last_action_code": "APPROVE",
            },
        ),
        (
            "S_REJ_01",
            "SUBMITTED",
            "REJECTED",
            {
                "submit_count": 1,
                "finalized_at": dt(77),
                "last_action_code": "REJECT",
                "last_action_at": dt(77),
                "current_review_level": "L2",
            },
        ),
        (
            "S_AI_PASS",
            "SUBMITTED",
            "AI_PASSED",
            {
                "submit_count": 1,
                "last_submitted_at": dt(78),
                "finalized_at": dt(79),
                "last_action_code": "AI_PASS",
                "last_action_at": dt(79),
            },
        ),
    ]
    for index, (sample_id, assign_status, sub_status, extra) in enumerate(scenarios, start=1):
        _append_minimal_submission(
            tables,
            task_id=task_id,
            sample_id=sample_id,
            prompt=f"合成题目 {sample_id}",
            labeler_id=labeler_id,
            template_version_id=template_version_id,
            assignment_status=assign_status,
            submission_status=sub_status,
            add_audit_defaults=add_audit_defaults,
            dt=dt,
            id_pools=id_pools,
            owner_id=owner_id,
            seq_no=index,
            **extra,
        )


def _append_assignment_status_aux(
    tables: dict[str, list[dict[str, Any]]],
    *,
    owner_id: int,
    labeler_id: int,
    template_version_id: int,
    add_audit_defaults: AddAuditDefaults,
    dt: Dt,
    id_pools: dict[str, Any],
) -> None:
    from generate_preference_compare_seed import THREE_LEVEL_REVIEW_WORKFLOW

    task_id = _append_task_row(
        tables,
        task_code="TASK_SM_ASSIGN",
        title="分配状态 · 过期/取消",
        status="PUBLISHED",
        owner_id=owner_id,
        template_version_id=None,
        quota=3,
        acceptance_status="NONE",
        reward_settlement_status="DRAFT",
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
        workflow_json=THREE_LEVEL_REVIEW_WORKFLOW,
        published_at=dt(15),
    )
    _append_minimal_submission(
        tables,
        task_id=task_id,
        sample_id="S_UNC_01",
        prompt="未领取样本",
        labeler_id=labeler_id,
        template_version_id=template_version_id,
        assignment_status="UNCLAIMED",
        submission_status=None,
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
        owner_id=owner_id,
        seq_no=1,
    )
    _append_minimal_submission(
        tables,
        task_id=task_id,
        sample_id="S_EXP_01",
        prompt="过期未提交样本",
        labeler_id=labeler_id,
        template_version_id=template_version_id,
        assignment_status="EXPIRED",
        submission_status=None,
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
        owner_id=owner_id,
        seq_no=2,
    )
    _append_minimal_submission(
        tables,
        task_id=task_id,
        sample_id="S_CAN_01",
        prompt="已取消分配样本",
        labeler_id=labeler_id,
        template_version_id=template_version_id,
        assignment_status="CANCELLED",
        submission_status=None,
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
        owner_id=owner_id,
        seq_no=3,
    )


def _append_l1_final_approve(
    tables: dict[str, list[dict[str, Any]]],
    *,
    submission_id: int,
    version_id: int,
    task_id: int,
    assignment_id: int,
    reviewer_id: int,
    comment_text: str,
    sample: dict[str, Any],
    occurred_at: str,
    round_no: int,
    add_audit_defaults: AddAuditDefaults,
    id_pools: dict[str, Any],
) -> int:
    """Append L1 final approve without importing generate_preference_compare_seed (avoids dual ID_POOLS under __main__)."""
    review_record_id = id_pools["review_record"].next()
    tables["review_records"].append(
        add_audit_defaults(
            {
                "id": review_record_id,
                "submission_id": submission_id,
                "submission_version_id": version_id,
                "task_id": task_id,
                "assignment_id": assignment_id,
                "reviewer_id": reviewer_id,
                "review_level": "L1",
                "review_stage_no": 1,
                "review_node_code": "L1_MAIN",
                "action": "APPROVE",
                "from_status": "HUMAN_REVIEWING",
                "to_status": "APPROVED",
                "review_batch_key": f"seed-review-{task_id}",
                "next_review_level": None,
                "is_final_decision": 1,
                "comment_text": comment_text,
                "diff_json": {"winner": sample["preferred"], "margin": sample["margin"]},
                "decided_at": occurred_at,
            },
            created_by=reviewer_id,
            updated_by=reviewer_id,
        )
    )
    tables["submission_status_histories"].append(
        add_audit_defaults(
            {
                "id": id_pools["submission_history"].next(),
                "submission_id": submission_id,
                "submission_version_id": version_id,
                "task_id": task_id,
                "assignment_id": assignment_id,
                "round_no": round_no,
                "from_status": "HUMAN_REVIEWING",
                "to_status": "APPROVED",
                "action_code": "APPROVE",
                "operator_type": "USER",
                "operator_id": reviewer_id,
                "review_level": "L1",
                "batch_operation_key": f"seed-review-{task_id}",
                "reason_code": None,
                "reason_text": comment_text,
                "related_ai_review_id": None,
                "related_review_record_id": review_record_id,
                "request_id": f"seed-review-{submission_id}-{round_no}-L1",
                "idempotency_key": f"review-{submission_id}-{round_no}-L1",
                "occurred_at": occurred_at,
            },
            created_by=reviewer_id,
            updated_by=reviewer_id,
        )
    )
    return review_record_id


def _append_single_level_review_aux(
    tables: dict[str, list[dict[str, Any]]],
    *,
    owner_id: int,
    labeler_id: int,
    reviewer_lin_id: int,
    template_version_id: int,
    add_audit_defaults: AddAuditDefaults,
    dt: Dt,
    id_pools: dict[str, Any],
) -> None:
    """Single-level (L1-only) workflow contrast vs TASK_PREF_COMPARE_DEMO."""
    task_id = _append_task_row(
        tables,
        task_code="TASK_SM_REVIEW_L1",
        title="审核流程 · 仅初审",
        status="PUBLISHED",
        owner_id=owner_id,
        template_version_id=template_version_id,
        quota=2,
        acceptance_status="NONE",
        reward_settlement_status="DRAFT",
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
        workflow_json=SINGLE_LEVEL_REVIEW_WORKFLOW,
        published_at=dt(15),
    )
    _append_task_members(
        tables,
        task_id=task_id,
        owner_id=owner_id,
        labeler_ids=[labeler_id],
        reviewer_ids=[reviewer_lin_id],
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
    )

    review_sample = {"preferred": "A", "margin": "相当", "annotator_note": "单级流程 seed 样本"}
    approved_refs = _append_minimal_submission(
        tables,
        task_id=task_id,
        sample_id="S_L1_APP",
        prompt="单级审核 · 已通过",
        labeler_id=labeler_id,
        template_version_id=template_version_id,
        assignment_status="SUBMITTED",
        submission_status="HUMAN_REVIEWING",
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
        owner_id=owner_id,
        seq_no=1,
        with_version=True,
        submit_count=1,
        last_submitted_at=dt(500),
        current_review_level="L1",
        next_review_level=None,
        last_action_code="AI_MANUAL",
    )
    record_id = _append_l1_final_approve(
        tables,
        submission_id=approved_refs.submission_id,
        version_id=approved_refs.version_id or 0,
        task_id=task_id,
        assignment_id=approved_refs.assignment_id,
        reviewer_id=reviewer_lin_id,
        comment_text=review_sample["annotator_note"],
        sample=review_sample,
        occurred_at=dt(510),
        round_no=1,
        add_audit_defaults=add_audit_defaults,
        id_pools=id_pools,
    )
    for row in tables["submissions"]:
        if row["id"] == approved_refs.submission_id:
            row["current_status"] = "APPROVED"
            row["current_review_level"] = "L1"
            row["next_review_level"] = None
            row["finalized_at"] = dt(510)
            row["last_action_code"] = "APPROVE"
            row["last_action_at"] = dt(510)
            row["last_review_record_id"] = record_id
            row["approved_version_id"] = approved_refs.version_id
            break

    _append_minimal_submission(
        tables,
        task_id=task_id,
        sample_id="S_L1_WAIT",
        prompt="单级审核 · 待初审",
        labeler_id=labeler_id,
        template_version_id=template_version_id,
        assignment_status="SUBMITTED",
        submission_status="HUMAN_REVIEWING",
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
        owner_id=owner_id,
        seq_no=2,
        with_version=True,
        submit_count=1,
        last_submitted_at=dt(501),
        current_review_level="L1",
        next_review_level=None,
        last_action_code="ENTER_HUMAN_REVIEW",
        last_action_at=dt(502),
    )


def _append_ops_status_aux(
    tables: dict[str, list[dict[str, Any]]],
    *,
    owner_id: int,
    add_audit_defaults: AddAuditDefaults,
    dt: Dt,
    id_pools: dict[str, Any],
) -> None:
    ops_task = _append_task_row(
        tables,
        task_code="TASK_SM_OPS",
        title="运维态 · 异步/导出/导入/批量审核",
        status="PUBLISHED",
        owner_id=owner_id,
        template_version_id=None,
        quota=0,
        acceptance_status="NONE",
        reward_settlement_status="DRAFT",
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=id_pools,
        workflow_json={"levels": [{"key": "L1", "label": "初审", "actions": ["approve", "reject", "return"]}]},
        published_at=dt(15),
    )

    async_statuses = ["PENDING", "RUNNING", "SUCCESS", "DEAD_LETTER", "CANCELED"]
    for index, status in enumerate(async_statuses, start=1):
        tables["async_tasks"].append(
            add_audit_defaults(
                {
                    "id": id_pools["async_task"].next(),
                    "task_type": "AI_REVIEW",
                    "biz_type": "SUBMISSION",
                    "biz_id": ops_task,
                    "biz_key": f"seed-ops-async-{status.lower()}",
                    "priority": 5,
                    "status": status,
                    "payload_json": {"demo": status},
                    "retry_count": 1 if status == "DEAD_LETTER" else 0,
                    "max_retry_count": 3,
                    "manual_retry_count": 0,
                    "next_run_at": dt(400 + index),
                    "worker_id": "seed-ops-worker",
                    "locked_at": dt(400 + index) if status == "RUNNING" else None,
                    "started_at": dt(401 + index) if status in {"RUNNING", "SUCCESS", "DEAD_LETTER"} else None,
                    "finished_at": dt(402 + index) if status in {"SUCCESS", "DEAD_LETTER", "CANCELED"} else None,
                    "canceled_at": dt(403 + index) if status == "CANCELED" else None,
                    "dead_lettered_at": dt(404 + index) if status == "DEAD_LETTER" else None,
                    "last_error_code": "SEED_FAIL" if status == "DEAD_LETTER" else None,
                    "last_error_message": "synthetic dead letter" if status == "DEAD_LETTER" else None,
                }
            )
        )

    running_import_id = id_pools["import_batch"].next()
    tables["task_item_import_batches"].append(
        add_audit_defaults(
            {
                "id": running_import_id,
                "task_id": ops_task,
                "source_file_id": None,
                "source_filename": "ops-running.json",
                "source_format": "JSON",
                "import_status": "RUNNING",
                "overwrite_mode": "REPLACE",
                "file_checksum": "seed-running",
                "total_rows": 8,
                "success_rows": 3,
                "failed_rows": 0,
                "error_summary_json": None,
                "started_at": dt(408),
                "finished_at": None,
            },
            created_by=owner_id,
            updated_by=owner_id,
        )
    )
    processing_import_id = id_pools["import_batch"].next()
    tables["task_item_import_batches"].append(
        add_audit_defaults(
            {
                "id": processing_import_id,
                "task_id": ops_task,
                "source_file_id": None,
                "source_filename": "ops-processing.json",
                "source_format": "JSON",
                "import_status": "PROCESSING",
                "overwrite_mode": "REPLACE",
                "file_checksum": "seed-processing",
                "total_rows": 10,
                "success_rows": 0,
                "failed_rows": 0,
                "error_summary_json": None,
                "started_at": dt(410),
                "finished_at": None,
            },
            created_by=owner_id,
            updated_by=owner_id,
        )
    )
    failed_import_id = id_pools["import_batch"].next()
    tables["task_item_import_batches"].append(
        add_audit_defaults(
            {
                "id": failed_import_id,
                "task_id": ops_task,
                "source_file_id": None,
                "source_filename": "ops-failed.json",
                "source_format": "JSON",
                "import_status": "FAILED",
                "overwrite_mode": "REPLACE",
                "file_checksum": "seed-failed",
                "total_rows": 5,
                "success_rows": 0,
                "failed_rows": 5,
                "error_summary_json": {"VALIDATION_ERROR": 3, "MISSING_FIELD": 2},
                "started_at": dt(412),
                "finished_at": dt(413),
            },
            created_by=owner_id,
            updated_by=owner_id,
        )
    )
    tables["task_item_import_errors"].append(
        add_audit_defaults(
            {
                "id": id_pools["import_error"].next(),
                "batch_id": failed_import_id,
                "row_no": 2,
                "error_code": "VALIDATION_ERROR",
                "error_message": "sample_id 缺失",
                "raw_line_text": '{"prompt":"x"}',
                "raw_payload_json": {"prompt": "x"},
                "normalized_payload_json": None,
                "is_blocking": 1,
            },
            created_by=owner_id,
            updated_by=owner_id,
        )
    )

    export_statuses = ["PENDING", "RUNNING", "SUCCESS", "FAILED"]
    for index, status in enumerate(export_statuses, start=1):
        job_id = id_pools["export_job"].next()
        async_id = id_pools["async_task"].next()
        tables["async_tasks"].append(
            add_audit_defaults(
                {
                    "id": async_id,
                    "task_type": "DATA_EXPORT",
                    "biz_type": "EXPORT_JOB",
                    "biz_id": job_id,
                    "biz_key": f"seed-ops-export-{status.lower()}",
                    "priority": 5,
                    "status": "SUCCESS" if status == "SUCCESS" else ("RUNNING" if status == "RUNNING" else "PENDING"),
                    "payload_json": {"scope": "APPROVED_ONLY"},
                    "retry_count": 0,
                    "max_retry_count": 3,
                    "manual_retry_count": 0,
                    "next_run_at": dt(420 + index),
                    "worker_id": "seed-export-worker",
                    "locked_at": None,
                    "started_at": dt(421 + index) if status != "PENDING" else None,
                    "finished_at": dt(422 + index) if status in {"SUCCESS", "FAILED"} else None,
                    "canceled_at": None,
                    "dead_lettered_at": None,
                    "last_error_code": "EXPORT_FAIL" if status == "FAILED" else None,
                    "last_error_message": "synthetic export failure" if status == "FAILED" else None,
                }
            )
        )
        tables["export_jobs"].append(
            add_audit_defaults(
                {
                    "id": job_id,
                    "task_id": ops_task,
                    "biz_type": "APPROVED_DATA",
                    "source_biz_id": None,
                    "requested_by": owner_id,
                    "export_scope": "APPROVED_ONLY",
                    "template_scope": "BOUND_VERSION",
                    "format_code": "CSV",
                    "field_map_json": ["sample_id"],
                    "field_rename_json": None,
                    "filters_json": None,
                    "acceptance_id": None,
                    "include_review_flag": 0,
                    "include_ai_review_flag": 0,
                    "status": status,
                    "progress_percent": 100 if status == "SUCCESS" else (50 if status == "RUNNING" else 0),
                    "total_records": 0,
                    "exported_records": 0,
                    "result_file_id": None,
                    "async_task_id": async_id,
                    "checksum": None,
                    "error_message": "failed" if status == "FAILED" else None,
                    "started_at": dt(421 + index) if status != "PENDING" else None,
                    "finished_at": dt(422 + index) if status in {"SUCCESS", "FAILED"} else None,
                    "canceled_at": None,
                    "expire_at": dt(60 * 24 * 30),
                },
                created_by=owner_id,
                updated_by=owner_id,
            )
        )

    batch_statuses = ["PENDING", "RUNNING", "SUCCESS", "FAILED", "PARTIAL"]
    for index, status in enumerate(batch_statuses, start=1):
        batch_key = f"seed-ops-batch-{status.lower()}"
        op_id = id_pools["review_batch"].next()
        tables["review_batch_operations"].append(
            add_audit_defaults(
                {
                    "id": op_id,
                    "batch_key": batch_key,
                    "task_id": ops_task,
                    "operator_id": owner_id,
                    "review_level": "L1",
                    "batch_action": "approve",
                    "criteria_json": {"status": status},
                    "target_total_count": 3,
                    "success_count": 3 if status == "SUCCESS" else (2 if status == "PARTIAL" else 0),
                    "failed_count": 0 if status in {"SUCCESS", "PENDING", "RUNNING"} else (3 if status == "FAILED" else 1),
                    "status": status,
                    "started_at": dt(430 + index) if status != "PENDING" else None,
                    "finished_at": dt(431 + index) if status not in {"PENDING", "RUNNING"} else None,
                    "failure_summary_json": [{"submissionId": 1, "error": "x"}] if status in {"FAILED", "PARTIAL"} else None,
                },
                created_by=owner_id,
                updated_by=owner_id,
            )
        )
