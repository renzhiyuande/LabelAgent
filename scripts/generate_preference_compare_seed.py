#!/usr/bin/env python3
"""Generate full-flow LabelHub seed SQL for the preference_compare dataset.

Seed universe (tenant 1):
- TASK_PREF_COMPARE_DEMO: 12 real samples, 3-level review, CONFIRMED acceptance, PAID reward
- TASK_HEALTH_SPARSE / TASK_HEALTH_READY: AI 预审质检三种聚合状态（未聚合 / 可聚合 / 已聚合）
- TASK_SM_* auxiliary tasks: task/submission/assignment/ops state coverage
- TASK_SM_REVIEW_L1: single-level review workflow contrast (vs 3-level demo task)
- Users: seed_owner, seed_labeler_{anna,ben,cici}, seed_reviewer_{lin,qiao,ming}
  - Lin: SEED_REVIEWER_L1 (workbench + level L1); Qiao: SEED_REVIEWER_L2L3 (workbench + L2/L3); Ming: platform REVIEWER (workbench only, all levels)
- Password for all seed users: same bcrypt hash as legacy demo accounts
"""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any

from seed_llm_constants import (
    DEEPSEEK_MODEL_CODE,
    DEEPSEEK_PLATFORM_KEY,
    LLM_ASSIST_CONFIG,
    resolve_preference_model,
)

TENANT_ID = 1
SYSTEM_USER_ID = 0
OWNER_ROLE_ID = 2001
LABELER_ROLE_ID = 2003
REVIEWER_ROLE_ID = 2004
PASSWORD_HASH = "$2y$10$1RfoZFIzbXcHyq0LBGbloeddaFT.RswgBtOWxROPvGN4cdAL4ToTi"

_REPO_ROOT = Path(__file__).resolve().parents[1]


def _resolve_default_dataset() -> Path:
    return _REPO_ROOT / "testdata" / "preference_compare" / "preference_compare.json"


def _resolve_default_requirements() -> Path:
    return _REPO_ROOT / "testdata" / "preference_compare" / "标注要求.md"


DEFAULT_DATASET = _resolve_default_dataset()
DEFAULT_REQUIREMENTS = _resolve_default_requirements()
DEFAULT_OUTPUT = (
    _REPO_ROOT / "backend/host-app/src/test/resources/preference_compare_full_flow_seed.sql"
)

BASE_TIME = datetime(2026, 6, 3, 9, 0, 0)

THREE_LEVEL_REVIEW_WORKFLOW: dict[str, Any] = {
    "levels": [
        {"key": "L1", "label": "初审", "actions": ["approve", "reject", "return"]},
        {"key": "L2", "label": "复审", "actions": ["approve", "reject", "return"]},
        {"key": "L3", "label": "终审", "actions": ["approve", "reject", "return"]},
    ]
}

USER_IDS = {
    "owner": 910100000001,
    "labeler_anna": 910100000101,
    "labeler_ben": 910100000102,
    "labeler_cici": 910100000103,
    "reviewer_lin": 910100000201,
    "reviewer_qiao": 910100000202,
    "reviewer_ming": 910100000203,
}

from seed_permission_constants import SEED_ROLE_REVIEWER_L1, SEED_ROLE_REVIEWER_L2L3

USER_ROLE_BY_KEY = {
    "owner": OWNER_ROLE_ID,
    "labeler_anna": LABELER_ROLE_ID,
    "labeler_ben": LABELER_ROLE_ID,
    "labeler_cici": LABELER_ROLE_ID,
    "reviewer_lin": SEED_ROLE_REVIEWER_L1,
    "reviewer_qiao": SEED_ROLE_REVIEWER_L2L3,
    "reviewer_ming": REVIEWER_ROLE_ID,
}


class IdPool:
    def __init__(self, start: int) -> None:
        self.current = start

    def next(self) -> int:
        value = self.current
        self.current += 1
        return value


ID_POOLS = {
    "user_roles": IdPool(910200000001),
    "task_members": IdPool(910210000001),
    "files": IdPool(910220000001),
    "file_refs": IdPool(910221000001),
    "task": IdPool(910230000001),
    "template": IdPool(910231000001),
    "template_version": IdPool(910232000001),
    "template_field": IdPool(910233000001),
    "review_dimension": IdPool(910234000001),
    "import_batch": IdPool(910235000001),
    "import_error": IdPool(910235900001),
    "task_item": IdPool(910236000001),
    "assignment": IdPool(910237000001),
    "submission": IdPool(910238000001),
    "submission_version": IdPool(910239000001),
    "submission_history": IdPool(910240000001),
    "llm_assist": IdPool(910241000001),
    "async_task": IdPool(910242000001),
    "ai_review": IdPool(910243000001),
    "ai_dimension_score": IdPool(910244000001),
    "review_record": IdPool(910245000001),
    "acceptance": IdPool(910246000001),
    "acceptance_sample": IdPool(910247000001),
    "reward_batch": IdPool(910248000001),
    "reward_detail": IdPool(910249000001),
    "export_job": IdPool(910250000001),
    "scheduled_task": IdPool(910251000001),
    "template_market": IdPool(910260000001),
    "review_batch": IdPool(910261000001),
    "seed_role_perm": IdPool(910291000001),
    "prompt_health_metric": IdPool(910270000001),
    "misalignment_case": IdPool(910271000001),
    "prompt_suggestion": IdPool(910272000001),
    "ai_review_llm_attempt": IdPool(910273000001),
}


@dataclass(frozen=True)
class UserSpec:
    key: str
    user_id: int
    username: str
    display_name: str
    email: str
    role_id: int


USERS = [
    UserSpec("owner", USER_IDS["owner"], "seed_owner", "Seed Owner", "owner.seed@labelhub.local", OWNER_ROLE_ID),
    UserSpec(
        "labeler_anna",
        USER_IDS["labeler_anna"],
        "seed_labeler_anna",
        "标注员 Anna",
        "anna.seed@labelhub.local",
        LABELER_ROLE_ID,
    ),
    UserSpec(
        "labeler_ben",
        USER_IDS["labeler_ben"],
        "seed_labeler_ben",
        "标注员 Ben",
        "ben.seed@labelhub.local",
        LABELER_ROLE_ID,
    ),
    UserSpec(
        "labeler_cici",
        USER_IDS["labeler_cici"],
        "seed_labeler_cici",
        "标注员 Cici",
        "cici.seed@labelhub.local",
        LABELER_ROLE_ID,
    ),
    UserSpec(
        "reviewer_lin",
        USER_IDS["reviewer_lin"],
        "seed_reviewer_lin",
        "审核员 Lin",
        "lin.seed@labelhub.local",
        REVIEWER_ROLE_ID,
    ),
    UserSpec(
        "reviewer_qiao",
        USER_IDS["reviewer_qiao"],
        "seed_reviewer_qiao",
        "审核员 Qiao",
        "qiao.seed@labelhub.local",
        REVIEWER_ROLE_ID,
    ),
    UserSpec(
        "reviewer_ming",
        USER_IDS["reviewer_ming"],
        "seed_reviewer_ming",
        "审核员 Ming（全级）",
        "ming.seed@labelhub.local",
        REVIEWER_ROLE_ID,
    ),
]


WORKFLOW_LEVELS = ["L1", "L2", "L3"]
FINAL_REVIEW_LEVEL = WORKFLOW_LEVELS[-1]
REVIEWER_BY_LEVEL = {
    "L1": USER_IDS["reviewer_lin"],
    "L2": USER_IDS["reviewer_qiao"],
    "L3": USER_IDS["reviewer_qiao"],
}

# human_review 与三级 workflow 对齐；rounds 使用 ai_human / returned / ai_passed / ai_rejected
FLOW_BY_SAMPLE = {
    "P0001": {
        "assignment_status": "SUBMITTED",
        "submission_status": "APPROVED",
        "rounds": ["ai_human"],
        "human_review": "approve_all",
    },
    "P0002": {
        "assignment_status": "SUBMITTED",
        "submission_status": "APPROVED",
        "rounds": ["returned", "ai_human"],
        "human_review": "approve_all",
    },
    "P0003": {
        "assignment_status": "SUBMITTED",
        "submission_status": "HUMAN_REVIEWING",
        "rounds": ["ai_human"],
        "human_review": "wait:L2",
    },
    "P0004": {
        "assignment_status": "SUBMITTED",
        "submission_status": "REJECTED",
        "rounds": ["ai_human"],
        "human_review": "reject:L2",
    },
    "P0005": {
        "assignment_status": "CLAIMED",
        "submission_status": "NEEDS_REVISION",
        "rounds": ["returned"],
    },
    "P0006": {
        "assignment_status": "SUBMITTED",
        "submission_status": "HUMAN_REVIEWING",
        "rounds": ["ai_human"],
        "human_review": "wait:L1",
    },
    "P0007": {
        "assignment_status": "SUBMITTED",
        "submission_status": "HUMAN_REVIEWING",
        "rounds": ["ai_human"],
        "human_review": "wait:L3",
    },
    "P0008": {
        "assignment_status": "SUBMITTED",
        "submission_status": "AI_REJECTED",
        "rounds": ["ai_rejected"],
    },
    "P0009": {
        "assignment_status": "SUBMITTED",
        "submission_status": "APPROVED",
        "rounds": ["ai_human"],
        "human_review": "approve_all",
    },
    "P0010": {
        "assignment_status": "SUBMITTED",
        "submission_status": "AI_PASSED",
        "rounds": ["ai_passed"],
    },
    "P0011": {"assignment_status": "CLAIMED", "submission_status": "DRAFT", "rounds": []},
    "P0012": {"assignment_status": "UNCLAIMED", "submission_status": None, "rounds": []},
}

APPROVED_SAMPLE_IDS = ["P0001", "P0002", "P0009"]
ACCEPTANCE_SAMPLE_DECISIONS = {"P0001": "PASS", "P0002": "FAIL"}

@dataclass
class SubmissionReviewState:
    current_status: str
    current_review_level: str | None = None
    next_review_level: str | None = None
    last_action_code: str | None = None
    assignment_status: str | None = None


def workflow_next_level(level: str) -> str | None:
    try:
        index = WORKFLOW_LEVELS.index(level)
    except ValueError:
        return None
    if index >= len(WORKFLOW_LEVELS) - 1:
        return None
    return WORKFLOW_LEVELS[index + 1]


def workflow_stage_no(level: str) -> int:
    try:
        return WORKFLOW_LEVELS.index(level) + 1
    except ValueError:
        return 1


def reviewer_for_level(level: str) -> int:
    return REVIEWER_BY_LEVEL.get(level, USER_IDS["reviewer_lin"])


def initial_review_levels(submission_status: str) -> tuple[str | None, str | None]:
    if submission_status == "HUMAN_REVIEWING":
        return WORKFLOW_LEVELS[0], workflow_next_level(WORKFLOW_LEVELS[0])
    if submission_status in {"APPROVED", "REJECTED"}:
        return FINAL_REVIEW_LEVEL, None
    if submission_status == "NEEDS_REVISION":
        return WORKFLOW_LEVELS[0], None
    return None, None


def apply_review_state_to_submission_row(submission_row: dict[str, Any], state: SubmissionReviewState) -> None:
    submission_row["current_status"] = state.current_status
    submission_row["current_review_level"] = state.current_review_level
    submission_row["next_review_level"] = state.next_review_level
    if state.last_action_code:
        submission_row["last_action_code"] = state.last_action_code
    if state.current_status in {"APPROVED", "REJECTED", "AI_REJECTED", "AI_PASSED"}:
        if submission_row.get("finalized_at") is None:
            submission_row["finalized_at"] = submission_row.get("last_action_at")


def append_review_record(
    tables: dict[str, list[dict[str, Any]]],
    *,
    submission_id: int,
    version_id: int,
    task_id: int,
    assignment_id: int,
    reviewer_id: int,
    review_level: str,
    action: str,
    from_status: str,
    to_status: str,
    next_review_level: str | None,
    is_final_decision: bool,
    comment_text: str,
    sample: dict[str, Any],
    occurred_at: str,
    round_no: int,
    ai_review_id: int | None,
    review_record_ids: list[int],
) -> int:
    review_record_id = ID_POOLS["review_record"].next()
    review_record_ids.append(review_record_id)
    tables["review_records"].append(
        add_audit_defaults(
            {
                "id": review_record_id,
                "submission_id": submission_id,
                "submission_version_id": version_id,
                "task_id": task_id,
                "assignment_id": assignment_id,
                "reviewer_id": reviewer_id,
                "review_level": review_level,
                "review_stage_no": workflow_stage_no(review_level),
                "review_node_code": f"{review_level}_MAIN",
                "action": action,
                "from_status": from_status,
                "to_status": to_status,
                "review_batch_key": f"seed-review-{task_id}",
                "next_review_level": next_review_level,
                "is_final_decision": 1 if is_final_decision else 0,
                "comment_text": comment_text,
                "diff_json": {"winner": sample["preferred"], "margin": sample["margin"]},
                "decided_at": occurred_at,
            },
            created_by=reviewer_id,
            updated_by=reviewer_id,
        )
    )
    action_code = {
        "APPROVE": "APPROVE",
        "RETURN": "RETURN_FOR_REVISION",
        "REJECT": "REJECT",
    }[action]
    tables["submission_status_histories"].append(
        add_audit_defaults(
            {
                "id": ID_POOLS["submission_history"].next(),
                "submission_id": submission_id,
                "submission_version_id": version_id,
                "task_id": task_id,
                "assignment_id": assignment_id,
                "round_no": round_no,
                "from_status": from_status,
                "to_status": to_status,
                "action_code": action_code,
                "operator_type": "USER",
                "operator_id": reviewer_id,
                "review_level": review_level,
                "batch_operation_key": f"seed-review-{task_id}",
                "reason_code": None,
                "reason_text": comment_text,
                "related_ai_review_id": ai_review_id,
                "related_review_record_id": review_record_id,
                "request_id": f"seed-review-{submission_id}-{round_no}-{review_level}",
                "idempotency_key": f"review-{submission_id}-{round_no}-{review_level}",
                "occurred_at": occurred_at,
            },
            created_by=reviewer_id,
            updated_by=reviewer_id,
        )
    )
    return review_record_id


def apply_human_review_spec(
    spec: str,
    *,
    tables: dict[str, list[dict[str, Any]]],
    state: SubmissionReviewState,
    submission_id: int,
    version_id: int,
    task_id: int,
    assignment_id: int,
    sample: dict[str, Any],
    round_no: int,
    time_base: int,
    ai_review_id: int | None,
    review_record_ids: list[int],
) -> None:
    comment = sample["annotator_note"]

    def approve_through(levels: list[str], *, terminal_status: str) -> None:
        for index, level in enumerate(levels):
            is_final = terminal_status != "HUMAN_REVIEWING" and index == len(levels) - 1
            next_level = None if is_final else workflow_next_level(level)
            to_status = terminal_status if is_final else "HUMAN_REVIEWING"
            append_review_record(
                tables,
                submission_id=submission_id,
                version_id=version_id,
                task_id=task_id,
                assignment_id=assignment_id,
                reviewer_id=reviewer_for_level(level),
                review_level=level,
                action="APPROVE",
                from_status="HUMAN_REVIEWING",
                to_status=to_status,
                next_review_level=next_level,
                is_final_decision=is_final,
                comment_text=comment,
                sample=sample,
                occurred_at=dt(time_base + index),
                round_no=round_no,
                ai_review_id=ai_review_id,
                review_record_ids=review_record_ids,
            )
            if is_final:
                state.current_status = terminal_status
                state.current_review_level = level
                state.next_review_level = None
                state.last_action_code = "APPROVE"
            else:
                state.current_status = "HUMAN_REVIEWING"
                state.current_review_level = next_level
                state.next_review_level = workflow_next_level(next_level) if next_level else None
                state.last_action_code = "APPROVE"

    if spec == "approve_all":
        approve_through(WORKFLOW_LEVELS, terminal_status="APPROVED")
        return

    if spec.startswith("wait:"):
        waiting_level = spec.split(":", 1)[1]
        if waiting_level not in WORKFLOW_LEVELS:
            raise ValueError(f"invalid wait level: {waiting_level}")
        completed = WORKFLOW_LEVELS[: WORKFLOW_LEVELS.index(waiting_level)]
        if completed:
            approve_through(completed, terminal_status="HUMAN_REVIEWING")
        state.current_status = "HUMAN_REVIEWING"
        state.current_review_level = waiting_level
        state.next_review_level = workflow_next_level(waiting_level)
        state.last_action_code = "APPROVE" if completed else "AI_MANUAL"
        return

    if spec.startswith("reject:"):
        reject_level = spec.split(":", 1)[1]
        if reject_level not in WORKFLOW_LEVELS:
            raise ValueError(f"invalid reject level: {reject_level}")
        prior = WORKFLOW_LEVELS[: WORKFLOW_LEVELS.index(reject_level)]
        if prior:
            approve_through(prior, terminal_status="HUMAN_REVIEWING")
        append_review_record(
            tables,
            submission_id=submission_id,
            version_id=version_id,
            task_id=task_id,
            assignment_id=assignment_id,
            reviewer_id=reviewer_for_level(reject_level),
            review_level=reject_level,
            action="REJECT",
            from_status="HUMAN_REVIEWING",
            to_status="REJECTED",
            next_review_level=None,
            is_final_decision=True,
            comment_text=comment,
            sample=sample,
            occurred_at=dt(time_base + len(prior)),
            round_no=round_no,
            ai_review_id=ai_review_id,
            review_record_ids=review_record_ids,
        )
        state.current_status = "REJECTED"
        state.current_review_level = reject_level
        state.next_review_level = None
        state.last_action_code = "REJECT"
        return

    raise ValueError(f"unsupported human_review spec: {spec}")


def apply_human_return_l1(
    *,
    tables: dict[str, list[dict[str, Any]]],
    state: SubmissionReviewState,
    submission_id: int,
    version_id: int,
    task_id: int,
    assignment_id: int,
    sample: dict[str, Any],
    round_no: int,
    time_base: int,
    ai_review_id: int | None,
    review_record_ids: list[int],
) -> None:
    append_review_record(
        tables,
        submission_id=submission_id,
        version_id=version_id,
        task_id=task_id,
        assignment_id=assignment_id,
        reviewer_id=reviewer_for_level("L1"),
        review_level="L1",
        action="RETURN",
        from_status="HUMAN_REVIEWING",
        to_status="NEEDS_REVISION",
        next_review_level=None,
        is_final_decision=True,
        comment_text=sample["annotator_note"],
        sample=sample,
        occurred_at=dt(time_base),
        round_no=round_no,
        ai_review_id=ai_review_id,
        review_record_ids=review_record_ids,
    )
    state.current_status = "NEEDS_REVISION"
    state.current_review_level = WORKFLOW_LEVELS[0]
    state.next_review_level = None
    state.last_action_code = "RETURN"
    state.assignment_status = "CLAIMED"


REVIEW_DIMENSIONS = [
    {
        "dimension_key": "ACCURACY",
        "dimension_name": "准确性",
        "dimension_desc": "判断答案是否事实正确、无明显错误。",
        "weight": "0.35",
        "pass_threshold": "85",
        "reject_threshold": "55",
        "prompt_instruction": "检查回答是否准确引用了事实、概念或方法。",
    },
    {
        "dimension_key": "COMPLETENESS",
        "dimension_name": "完整性",
        "dimension_desc": "判断是否覆盖题目所需关键信息。",
        "weight": "0.25",
        "pass_threshold": "80",
        "reject_threshold": "50",
        "prompt_instruction": "检查回答是否覆盖题面要求的关键信息点。",
    },
    {
        "dimension_key": "RELEVANCE",
        "dimension_name": "相关性",
        "dimension_desc": "判断是否真正回答了问题、是否紧扣上下文。",
        "weight": "0.15",
        "pass_threshold": "80",
        "reject_threshold": "50",
        "prompt_instruction": "检查回答是否紧扣题目，不跑题、不答非所问。",
    },
    {
        "dimension_key": "READABILITY",
        "dimension_name": "可读性",
        "dimension_desc": "判断表达是否清晰、简洁、便于理解。",
        "weight": "0.10",
        "pass_threshold": "75",
        "reject_threshold": "45",
        "prompt_instruction": "检查回答的结构、语气和可读性。",
    },
    {
        "dimension_key": "SAFETY",
        "dimension_name": "安全性",
        "dimension_desc": "判断是否存在违规、危险或不当内容。",
        "weight": "0.15",
        "pass_threshold": "100",
        "reject_threshold": "70",
        "prompt_instruction": "检查回答是否包含违规、危险、攻击性或不合规内容。",
    },
]


def json_default(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    raise TypeError(f"Object of type {value.__class__.__name__} is not JSON serializable")


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"), default=json_default)


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def dt(minutes: int) -> str:
    return (BASE_TIME + timedelta(minutes=minutes)).strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]


def sql_string(value: str) -> str:
    return "'" + value.replace("\\", "\\\\").replace("'", "''") + "'"


def sql_value(value: Any, *, json_mode: bool = False) -> str:
    if value is None:
        return "NULL"
    if json_mode:
        return f"CAST({sql_string(canonical_json(value))} AS JSON)"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, Decimal):
        return format(value, "f")
    if isinstance(value, (int, float)):
        return str(value)
    return sql_string(str(value))


def insert_sql(
    table: str,
    columns: list[str],
    rows: list[dict[str, Any]],
    json_columns: set[str] | None = None,
    *,
    insert_ignore: bool = False,
) -> str:
    if not rows:
        return f"-- {table}: no rows\n"
    json_columns = json_columns or set()
    values_sql = []
    for row in rows:
        values = [sql_value(row.get(col), json_mode=col in json_columns) for col in columns]
        values_sql.append("  (" + ", ".join(values) + ")")
    verb = "INSERT IGNORE INTO" if insert_ignore else "INSERT INTO"
    return f"{verb} `{table}` (\n  " + ", ".join(f"`{col}`" for col in columns) + "\n) VALUES\n" + ",\n".join(values_sql) + ";\n"


# Idempotent when Flyway V2/V37 already seeded platform roles / reviewer perms / owner menus
INSERT_IGNORE_TABLES = frozenset({"roles", "role_permissions", "role_menus"})


def add_audit_defaults(row: dict[str, Any], *, created_by: int | None = None, updated_by: int | None = None) -> dict[str, Any]:
    result = {
        "tenant_id": TENANT_ID,
        "created_by": SYSTEM_USER_ID if created_by is None else created_by,
        "updated_by": SYSTEM_USER_ID if updated_by is None else updated_by,
        "deleted_flag": 0,
        "ext_json": None,
    }
    result.update(row)
    return result


def build_field_definitions(requirements_md: str) -> list[dict[str, Any]]:
    return [
        {
            "key": "__instructions",
            "path": "__instructions",
            "label": "标注说明",
            "component": "showItem",
            "value_type": "string",
            "showItem": {
                "contentSource": "static",
                "renderAs": "markdown",
                "layout": "pre",
                "staticContent": requirements_md.strip(),
            },
            "meta": {"importRole": "runtime", "payloadSource": "runtime"},
            "readonly": True,
            "span": 24,
        },
        {
            "key": "sampleId",
            "path": "sample_id",
            "label": "样本ID",
            "component": "showItem",
            "value_type": "string",
            "showItem": {"contentSource": "payload", "renderAs": "text", "layout": "inline"},
            "readonly": True,
            "span": 12,
        },
        {
            "key": "taskType",
            "path": "task_type",
            "label": "任务类型",
            "component": "showItem",
            "value_type": "string",
            "showItem": {"contentSource": "payload", "renderAs": "text", "layout": "inline"},
            "readonly": True,
            "span": 6,
        },
        {
            "key": "lang",
            "path": "lang",
            "label": "语言方向",
            "component": "showItem",
            "value_type": "string",
            "showItem": {"contentSource": "payload", "renderAs": "text", "layout": "inline"},
            "readonly": True,
            "span": 6,
        },
        {
            "key": "prompt",
            "path": "prompt",
            "label": "用户输入",
            "component": "showItem",
            "value_type": "string",
            "showItem": {"contentSource": "payload", "renderAs": "text", "layout": "pre"},
            "readonly": True,
            "span": 24,
        },
        {
            "key": "responseA",
            "path": "response_a",
            "label": "回答 A",
            "component": "showItem",
            "value_type": "string",
            "showItem": {"contentSource": "payload", "renderAs": "text", "layout": "pre"},
            "readonly": True,
            "span": 12,
        },
        {
            "key": "responseB",
            "path": "response_b",
            "label": "回答 B",
            "component": "showItem",
            "value_type": "string",
            "showItem": {"contentSource": "payload", "renderAs": "text", "layout": "pre"},
            "readonly": True,
            "span": 12,
        },
        {
            "key": "modelA",
            "path": "model_a",
            "label": "模型 A",
            "component": "showItem",
            "value_type": "string",
            "showItem": {"contentSource": "payload", "renderAs": "text", "layout": "inline"},
            "readonly": True,
            "span": 12,
        },
        {
            "key": "modelB",
            "path": "model_b",
            "label": "模型 B",
            "component": "showItem",
            "value_type": "string",
            "showItem": {"contentSource": "payload", "renderAs": "text", "layout": "inline"},
            "readonly": True,
            "span": 12,
        },
        {
            "key": "preferred",
            "path": "result.preferred",
            "label": "偏好结论",
            "component": "radioGroup",
            "value_type": "string",
            "required": True,
            "options": [
                {"label": "A 更优", "value": "A"},
                {"label": "B 更优", "value": "B"},
                {"label": "平局", "value": "tie"},
            ],
            "meta": {"importRole": "input", "payloadSource": "annotation"},
            "span": 12,
        },
        {
            "key": "margin",
            "path": "result.margin",
            "label": "优势程度",
            "component": "radioGroup",
            "value_type": "string",
            "required": True,
            "options": [
                {"label": "明显优于", "value": "明显优于"},
                {"label": "略优于", "value": "略优于"},
                {"label": "相当", "value": "相当"},
            ],
            "meta": {"importRole": "input", "payloadSource": "annotation"},
            "span": 12,
        },
        {
            "key": "judgeDimensions",
            "path": "result.dimensions",
            "label": "判断依据维度",
            "component": "checkboxGroup",
            "value_type": "array",
            "required": True,
            "options": [
                {"label": "相关性", "value": "相关性"},
                {"label": "准确性", "value": "准确性"},
                {"label": "安全性", "value": "安全性"},
                {"label": "完整性", "value": "完整性"},
                {"label": "可读性", "value": "可读性"},
                {"label": "创意性", "value": "创意性"},
                {"label": "地道性", "value": "地道性"},
                {"label": "简洁性", "value": "简洁性"},
                {"label": "可执行性", "value": "可执行性"},
                {"label": "上下文一致", "value": "上下文一致"},
                {"label": "贴合度", "value": "贴合度"},
                {"label": "感染力", "value": "感染力"},
                {"label": "合规性", "value": "合规性"},
                {"label": "安全提示", "value": "安全提示"},
            ],
            "meta": {"importRole": "input", "payloadSource": "annotation"},
            "span": 24,
        },
        {
            "key": "safetyFlag",
            "path": "result.safety_flag",
            "label": "是否存在安全风险",
            "component": "radioGroup",
            "value_type": "boolean",
            "required": True,
            "options": [
                {"label": "否", "value": False},
                {"label": "是", "value": True},
            ],
            "meta": {"importRole": "input", "payloadSource": "annotation"},
            "span": 12,
        },
        {
            "key": "quickConclusion",
            "path": "result.quick_conclusion",
            "label": "一句话结论",
            "component": "text",
            "value_type": "string",
            "required": True,
            "meta": {"importRole": "input", "payloadSource": "annotation"},
            "span": 12,
        },
        {
            "key": "annotatorNote",
            "path": "result.annotator_note",
            "label": "判断理由",
            "component": "textarea",
            "value_type": "string",
            "required": True,
            "meta": {"importRole": "input", "payloadSource": "annotation"},
            "span": 24,
        },
        {
            "key": "rewriteSuggestion",
            "path": "result.rewrite_suggestion",
            "label": "改写 / 修订建议",
            "component": "richText",
            "value_type": "string",
            "meta": {"importRole": "input", "payloadSource": "annotation"},
            "span": 24,
        },
        {
            "key": "structuredAnnotation",
            "path": "result.structured_annotation",
            "label": "结构化批注",
            "component": "jsonEditor",
            "value_type": "object",
            "meta": {"importRole": "input", "payloadSource": "annotation"},
            "span": 24,
        },
        {
            "key": "evidenceFiles",
            "path": "result.evidence_files",
            "label": "证据素材",
            "component": "fileUpload",
            "value_type": "array",
            "meta": {"importRole": "input", "payloadSource": "annotation"},
            "span": 24,
        },
        {
            "key": "aiReference",
            "path": "runtime.ai_reference",
            "label": "AI 预判参考",
            "component": "llmSuggest",
            "value_type": "string",
            "meta": {"importRole": "runtime", "payloadSource": "runtime"},
            "llm": {
                **LLM_ASSIST_CONFIG,
                "mode": "chat",
                "buttonLabel": "生成 AI 参考",
                "contextFields": ["prompt", "response_a", "response_b"],
                "promptTemplate": "请比较回答 A 与 B，给出更优项、理由和安全风险提示。",
            },
            "span": 24,
        },
        {
            "key": "aiStructured",
            "path": "runtime.ai_structured",
            "label": "AI 结构化辅助",
            "component": "llmSuggest",
            "value_type": "object",
            "meta": {"importRole": "runtime", "payloadSource": "runtime"},
            "llm": {
                **LLM_ASSIST_CONFIG,
                "mode": "agent",
                "buttonLabel": "生成结构化参考",
                "contextFields": ["prompt", "response_a", "response_b", "model_a", "model_b"],
                "promptTemplate": (
                    "比较两回答，输出 JSON：winner(A|B|tie), confidence(0-1), "
                    "risk_flags, dimension_hints(须从表单维度选项中选择，如准确性、完整性、相关性等)"
                ),
                "agentPromptSuffix": "仅输出 JSON，不要 Markdown。",
                "applyMappings": [
                    {"sourceKey": "winner", "targetPath": "result.preferred"},
                    {"sourceKey": "dimension_hints", "targetPath": "result.dimensions"},
                ],
            },
            "span": 24,
        },
    ]


def build_schema_and_fields(requirements_md: str) -> tuple[dict[str, Any], list[dict[str, Any]], dict[str, Any]]:
    fields = build_field_definitions(requirements_md)
    schema = {
        "title": "偏好对比标注",
        "description": "对同一 prompt 下的两个回答进行偏好判断，用于奖励模型训练与对齐。",
        "width": "xl",
        "sections": [
            {
                "key": "instructions",
                "title": "标注说明",
                "description": "先阅读规则，再进行偏好判断。",
                "fields": [fields[0]],
            },
            {
                "key": "context",
                "title": "题目上下文",
                "description": "以下信息只读展示，不直接提交。",
                "fields": fields[1:9],
            },
            {
                "key": "labeling",
                "title": "标注结果",
                "description": "请填写偏好结论、理由和结构化批注。",
                "fields": fields[9:],
            },
        ],
        "actions": [
            {"key": "saveDraft", "label": "保存草稿", "kind": "secondary"},
            {"key": "submit", "label": "提交", "kind": "submit"},
        ],
    }
    import_contract = {
        "schemaVersion": 1,
        "requiredKeys": ["sample_id", "task_type", "lang", "prompt", "response_a", "response_b", "model_a", "model_b"],
        "optionalKeys": [
            "result.preferred",
            "result.margin",
            "result.dimensions",
            "result.safety_flag",
            "result.quick_conclusion",
            "result.annotator_note",
            "result.rewrite_suggestion",
            "result.structured_annotation",
            "result.evidence_files",
        ],
        "forbiddenKeys": ["runtime.ai_reference", "__instructions"],
        "lockedAt": dt(10),
        "source": "FROM_TEMPLATE",
    }
    return schema, fields, import_contract


def build_review_prompt(dimensions: list[dict[str, str]]) -> str:
    lines = ["你是 LabelHub 偏好对比审核 Agent，请按以下维度给出结构化审核结果："]
    for dim in dimensions:
        lines.append(f"[{dim['dimension_name']}] {dim['prompt_instruction']}")
    lines.append("")
    lines.append("请输出 verdict、total_score、summary 以及各维度 score/comment。")
    return "\n".join(lines)


def build_review_output_schema(dimensions: list[dict[str, str]]) -> dict[str, Any]:
    return {
        "type": "object",
        "required": ["verdict", "summary", "dimensions"],
        "properties": {
            "verdict": {"type": "string", "enum": ["PASS", "REJECT", "REQUIRE_HUMAN"]},
            "total_score": {"type": "number"},
            "summary": {"type": "string"},
            "dimensions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "required": ["dimensionKey", "score"],
                    "properties": {
                        "dimensionKey": {"type": "string", "enum": [dim["dimension_key"] for dim in dimensions]},
                        "score": {"type": "number"},
                        "comment": {"type": "string"},
                    },
                },
            },
        },
    }


def line_summary(sample: dict[str, Any]) -> str:
    preferred = sample["preferred"]
    if preferred == "tie":
        return "两者整体质量接近，可判平局。"
    return f"{preferred} 在 {','.join(sample['dimensions'])} 上更优。"


def rich_rewrite(sample: dict[str, Any]) -> str:
    winner = sample["preferred"]
    if winner == "tie":
        return "<p>两条回答都可保留原意，建议统一压缩冗余表达并补充更明确的理由。</p>"
    winning_text = sample["response_a"] if winner == "A" else sample["response_b"]
    return f"<p>建议保留更优回答的核心表达，并进一步补充风险提示或更明确的步骤。</p><blockquote>{winning_text}</blockquote>"


def structured_annotation(sample: dict[str, Any]) -> dict[str, Any]:
    return {
        "winner": sample["preferred"],
        "margin": sample["margin"],
        "dimensions": sample["dimensions"],
        "safetyFlag": sample["safety_flag"],
        "note": sample["annotator_note"],
    }


def evidence_refs(file_ids: list[int]) -> list[dict[str, Any]]:
    results = []
    for file_id in file_ids:
        results.append(
            {
                "fileId": file_id,
                "name": f"evidence-{file_id}.png",
                "mimeType": "image/png",
                "sizeBytes": 20480,
            }
        )
    return results


def build_submission_payload(sample: dict[str, Any], evidence_file_ids: list[int]) -> dict[str, Any]:
    return {
        "result": {
            "preferred": sample["preferred"],
            "margin": sample["margin"],
            "dimensions": sample["dimensions"],
            "safety_flag": sample["safety_flag"],
            "quick_conclusion": line_summary(sample),
            "annotator_note": sample["annotator_note"],
            "rewrite_suggestion": rich_rewrite(sample),
            "structured_annotation": structured_annotation(sample),
            "evidence_files": evidence_refs(evidence_file_ids),
        },
        "runtime": {
            "ai_reference": f"AI 认为 {sample['preferred']} 更优，建议重点检查 {', '.join(sample['dimensions'])}。",
        },
    }


def build_ai_result(sample: dict[str, Any], verdict: str, total_score: Decimal) -> dict[str, Any]:
    comments = {
        "ACCURACY": "答案是否准确命中需求。",
        "COMPLETENESS": "是否覆盖关键点。",
        "RELEVANCE": "是否直接回应问题。",
        "READABILITY": "语言是否清晰简洁。",
        "SAFETY": "是否存在违规或风险表达。",
    }
    return {
        "winner": sample["preferred"],
        "verdict": verdict,
        "summary": sample["annotator_note"],
        "dimensions": [
            {
                "dimensionKey": key,
                "score": 95 if verdict != "REJECT" else (40 if key == "SAFETY" else 55),
                "comment": comments[key],
            }
            for key in ["ACCURACY", "COMPLETENESS", "RELEVANCE", "READABILITY", "SAFETY"]
        ],
        "totalScore": float(total_score),
    }


def build_file_assets(dataset_path: Path, requirements_path: Path) -> tuple[list[dict[str, Any]], dict[str, int]]:
    file_rows: list[dict[str, Any]] = []
    file_map: dict[str, int] = {}
    mime_map = {
        ".json": "application/json",
        ".md": "text/markdown",
        ".png": "image/png",
        ".csv": "text/csv",
    }

    def add_file(key: str, original_name: str, category: str, object_key: str, uploaded_by: int) -> int:
        file_id = ID_POOLS["files"].next()
        suffix = Path(original_name).suffix.lower()
        file_rows.append(
            add_audit_defaults(
                {
                    "id": file_id,
                    "storage_provider": "MINIO",
                    "bucket_name": "labelhub-demo",
                    "object_key": object_key,
                    "original_name": original_name,
                    "stored_name": object_key.rsplit("/", 1)[-1],
                    "file_ext": suffix[1:] if suffix else None,
                    "mime_type": mime_map.get(suffix, "application/octet-stream"),
                    "size_bytes": 1024,
                    "sha256": sha256_text(key),
                    "category_code": category,
                    "upload_status": "SUCCESS",
                    "is_public": 0,
                    "uploaded_by": uploaded_by,
                    "uploaded_at": dt(0),
                    "scan_status": "PASSED",
                },
                created_by=uploaded_by,
                updated_by=uploaded_by,
            )
        )
        file_map[key] = file_id
        return file_id

    add_file("dataset-json", dataset_path.name, "TASK_IMPORT", f"seed/preference/{dataset_path.name}", USER_IDS["owner"])
    add_file("requirements-md", requirements_path.name, "MATERIAL", f"seed/preference/{requirements_path.name}", USER_IDS["owner"])
    for sample_key in ["P0001", "P0005", "P0008"]:
        add_file(
            f"evidence-{sample_key}",
            f"{sample_key.lower()}-evidence.png",
            "SUBMISSION_EVIDENCE",
            f"seed/preference/evidence/{sample_key.lower()}-evidence.png",
            USER_IDS["labeler_anna"],
        )
    add_file("export-approved", "preference-compare-approved.csv", "EXPORT_RESULT", "seed/preference/export/preference-compare-approved.csv", USER_IDS["owner"])
    return file_rows, file_map


def build_seed(dataset: list[dict[str, Any]], requirements_md: str, dataset_path: Path, requirements_path: Path) -> dict[str, list[dict[str, Any]]]:
    schema, field_defs, import_contract = build_schema_and_fields(requirements_md)
    review_prompt = build_review_prompt(REVIEW_DIMENSIONS)
    review_output_schema = build_review_output_schema(REVIEW_DIMENSIONS)
    schema_json = canonical_json(schema)
    schema_checksum = sha256_text(schema_json)
    file_assets, file_map = build_file_assets(dataset_path, requirements_path)

    tables: dict[str, list[dict[str, Any]]] = defaultdict(list)
    tables["users"] = [
        add_audit_defaults(
            {
                "id": user.user_id,
                "username": user.username,
                "password_hash": PASSWORD_HASH,
                "display_name": user.display_name,
                "email": user.email,
                "phone": f"1380000{str(user.user_id)[-4:]}",
                "status": "ACTIVE",
                "register_source": "SEED",
                "last_login_at": dt(5),
            },
            created_by=SYSTEM_USER_ID,
            updated_by=SYSTEM_USER_ID,
        )
        for user in USERS
    ]

    for user in USERS:
        tables["user_roles"].append(
            add_audit_defaults(
                {
                    "id": ID_POOLS["user_roles"].next(),
                    "user_id": user.user_id,
                    "role_id": USER_ROLE_BY_KEY[user.key],
                    "effective_at": dt(0),
                    "expired_at": None,
                },
                created_by=SYSTEM_USER_ID,
                updated_by=SYSTEM_USER_ID,
            )
        )

    task_id = ID_POOLS["task"].next()
    template_id = ID_POOLS["template"].next()
    template_version_v1_id = ID_POOLS["template_version"].next()
    template_version_v2_id = ID_POOLS["template_version"].next()
    template_version_v3_id = ID_POOLS["template_version"].next()
    template_version_id = template_version_v2_id
    market_approved_id = ID_POOLS["template_market"].next()

    tables["template_market"].append(
        add_audit_defaults(
            {
                "id": market_approved_id,
                "template_code": "TPL_MARKET_PREF_APPROVED",
                "template_name": "偏好对比（已上架）",
                "template_description": "与演示任务绑定的已上架模板市场条目",
                "category_code": "PREFERENCE",
                "scene_code": "PREFERENCE_COMPARE",
                "cover_image_file_id": None,
                "author_id": USER_IDS["owner"],
                "source_tenant_id": TENANT_ID,
                "source_task_id": task_id,
                "template_version_id": template_version_v2_id,
                "schema_json": json.loads(schema_json),
                "review_prompt_template": review_prompt,
                "review_output_schema_json": review_output_schema,
                "review_workflow_json": THREE_LEVEL_REVIEW_WORKFLOW,
                "acceptance_rule_json": {"mode": "RATIO", "value": 0.2},
                "llm_assist_config_json": LLM_ASSIST_CONFIG,
                "tags_json": ["seed", "preference_compare", "featured"],
                "download_count": 128,
                "like_count": 12,
                "view_count": 560,
                "favorite_count": 8,
                "rating_avg": Decimal("4.80"),
                "rating_count": 25,
                "is_public": 1,
                "is_featured": 1,
                "audit_status": "APPROVED",
                "status": "ACTIVE",
                "published_at": dt(16),
            },
            created_by=USER_IDS["owner"],
            updated_by=USER_IDS["owner"],
        )
    )

    tables["templates"].append(
        add_audit_defaults(
            {
                "id": template_id,
                "task_id": task_id,
                "source_market_id": market_approved_id,
                "template_code": "TPL_PREF_COMPARE_V1",
                "template_name": "偏好对比标注模板",
                "scene_code": "PREFERENCE_COMPARE",
                "description_text": "基于 preference_compare 数据集的偏好对比标注模板。",
                "current_template_version_id": template_version_v2_id,
                "latest_version_no": 3,
                "status": "PUBLISHED",
            },
            created_by=USER_IDS["owner"],
            updated_by=USER_IDS["owner"],
        )
    )

    version_specs = [
        (template_version_v1_id, 1, "偏好对比标注模板 v1", "ARCHIVED", 0, dt(15), dt(200), "迭代至 v2"),
        (template_version_v2_id, 2, "偏好对比标注模板 v2", "PUBLISHED", 1, dt(210), None, None),
        (template_version_v3_id, 3, "偏好对比标注模板 v3（草稿）", "DRAFT", 0, None, None, None),
    ]
    for vid, vno, vname, vstatus, is_current, published_at, archived_at, archived_reason in version_specs:
        tables["template_versions"].append(
            add_audit_defaults(
                {
                    "id": vid,
                    "task_id": task_id,
                    "template_id": template_id,
                    "version_no": vno,
                    "template_name": vname,
                    "status": vstatus,
                    "is_current": is_current,
                    "schema_json": json.loads(schema_json),
                    "schema_checksum": schema_checksum,
                    "review_prompt_template": review_prompt,
                    "review_output_schema_json": review_output_schema,
                    "review_workflow_json": THREE_LEVEL_REVIEW_WORKFLOW,
                    "acceptance_rule_json": {"mode": "RATIO", "value": 0.2},
                    "llm_assist_config_json": LLM_ASSIST_CONFIG,
                    "provider_platform_key": DEEPSEEK_PLATFORM_KEY,
                    "model_id": DEEPSEEK_MODEL_CODE,
                    "widget_count": len(field_defs),
                    "required_field_count": sum(1 for field in field_defs if field.get("required")),
                    "validation_errors_json": [],
                    "published_at": published_at,
                    "archived_at": archived_at,
                    "archived_reason": archived_reason,
                },
                created_by=USER_IDS["owner"],
                updated_by=USER_IDS["owner"],
            )
        )

    for field_version_id in (template_version_v1_id, template_version_v2_id, template_version_v3_id):
        for sort_no, field in enumerate(field_defs, start=1):
            tables["template_version_fields"].append(
                add_audit_defaults(
                    {
                        "id": ID_POOLS["template_field"].next(),
                        "template_version_id": field_version_id,
                        "field_code": field["key"],
                        "field_path": field.get("path") or field["key"],
                        "field_title": field["label"],
                        "widget_type": field["component"],
                        "value_type": field["value_type"],
                        "is_required": 1 if field.get("required") else 0,
                        "is_display_only": 1 if field.get("readonly") else 0,
                        "sort_no": sort_no,
                        "default_value_json": field.get("defaultValue"),
                        "validator_rule_json": field.get("rules"),
                        "linkage_rule_json": None,
                        "visibility_rule_json": field.get("visibleWhen"),
                        "dependency_field_codes_json": [field["dependsOn"]] if field.get("dependsOn") else None,
                        "enum_options_json": field.get("options"),
                        "widget_config_json": {
                            key: field[key]
                            for key in ("showItem", "llm", "description", "placeholder", "span")
                            if key in field
                        }
                        or None,
                    },
                    created_by=USER_IDS["owner"],
                    updated_by=USER_IDS["owner"],
                )
            )

    for index, dim in enumerate(REVIEW_DIMENSIONS, start=1):
        tables["template_review_dimensions"].append(
            add_audit_defaults(
                {
                    "id": ID_POOLS["review_dimension"].next(),
                    "template_version_id": template_version_v2_id,
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
                created_by=USER_IDS["owner"],
                updated_by=USER_IDS["owner"],
            )
        )

    tables["file_references"].append(
        add_audit_defaults(
            {
                "id": ID_POOLS["file_refs"].next(),
                "file_id": file_map["requirements-md"],
                "biz_type": "TEMPLATE_VERSION",
                "biz_id": template_version_v2_id,
                "biz_sub_id": None,
                "field_code": "guidelines",
                "relation_role": "REFERENCE",
                "sort_no": 1,
                "ref_status": "ACTIVE",
            },
            created_by=USER_IDS["owner"],
            updated_by=USER_IDS["owner"],
        )
    )

    tables["tasks"].append(
        add_audit_defaults(
            {
                "id": task_id,
                "task_code": "TASK_PREF_COMPARE_DEMO",
                "owner_id": USER_IDS["owner"],
                "title": "偏好对比标注演示任务",
                "description_text": "覆盖导入、分配、标注、AI 审核、人工审核、奖励、导出与运维链路的完整 seed 任务。",
                "description_rich": "<p>基于 preference_compare 数据集生成的全流程演示任务。</p>",
                "scene_code": "PREFERENCE_COMPARE",
                "status": "PUBLISHED",
                "distribute_strategy": "FIRST_COME",
                "quota": len(dataset),
                "max_claim_per_user": 3,
                "acceptance_required_flag": 1,
                "acceptance_status": "CONFIRMED",
                "latest_acceptance_id": None,
                "reward_settlement_status": "PAID",
                "deadline_at": dt(60 * 24 * 7),
                "published_at": dt(20),
                "paused_at": None,
                "finished_at": None,
                "archived_at": None,
                "restored_at": None,
                "current_template_version_id": template_version_id,
                "tags_json": ["seed", "preference_compare", "demo"],
                "reward_rule_json": {"mode": "PER_APPROVED", "base_amount": Decimal("12"), "currency": "CNY", "settle_unit": "SUBMISSION"},
                "settings_json": {"showModelName": True, "allowTie": True},
                "import_payload_contract_json": import_contract,
                "published_check_result_json": {"ok": True, "issues": []},
                "status_reason": "Seed initialized",
                "review_workflow_json": THREE_LEVEL_REVIEW_WORKFLOW,
                "version_no": 1,
            },
            created_by=USER_IDS["owner"],
            updated_by=USER_IDS["owner"],
        )
    )

    for member_key in ("labeler_anna", "labeler_ben", "labeler_cici", "reviewer_lin", "reviewer_qiao", "reviewer_ming"):
        role = "LABELER" if member_key.startswith("labeler") else "REVIEWER"
        tables["task_members"].append(
            add_audit_defaults(
                {
                    "id": ID_POOLS["task_members"].next(),
                    "task_id": task_id,
                    "user_id": USER_IDS[member_key],
                    "member_role": role,
                    "permission_set_json": ["READ", "WRITE"] if role == "LABELER" else ["READ", "REVIEW"],
                    "status": "ACTIVE",
                    "joined_at": dt(18),
                },
                created_by=USER_IDS["owner"],
                updated_by=USER_IDS["owner"],
            )
        )

    tables["file_assets"].extend(file_assets)

    import_batch_id = ID_POOLS["import_batch"].next()
    tables["task_item_import_batches"].append(
        add_audit_defaults(
            {
                "id": import_batch_id,
                "task_id": task_id,
                "source_file_id": file_map["dataset-json"],
                "source_filename": dataset_path.name,
                "source_format": "JSON",
                "import_status": "COMPLETED",
                "overwrite_mode": "REPLACE",
                "file_checksum": sha256_text(dataset_path.read_text(encoding="utf-8")),
                "total_rows": len(dataset) + 1,
                "success_rows": len(dataset),
                "failed_rows": 1,
                "error_summary_json": {"VALIDATION_ERROR": 1},
                "started_at": dt(25),
                "finished_at": dt(26),
            },
            created_by=USER_IDS["owner"],
            updated_by=USER_IDS["owner"],
        )
    )

    tables["task_item_import_errors"].append(
        add_audit_defaults(
            {
                "id": ID_POOLS["import_error"].next(),
                "batch_id": import_batch_id,
                "row_no": len(dataset) + 1,
                "error_code": "VALIDATION_ERROR",
                "error_message": "synthetic invalid row for import error demo",
                "raw_line_text": '{"id":"BAD","prompt":""}',
                "raw_payload_json": {"id": "BAD", "prompt": ""},
                "normalized_payload_json": {"sample_id": "BAD"},
                "is_blocking": 1,
            },
            created_by=USER_IDS["owner"],
            updated_by=USER_IDS["owner"],
        )
    )

    assignment_user_cycle = [
        USER_IDS["labeler_anna"],
        USER_IDS["labeler_ben"],
        USER_IDS["labeler_cici"],
    ]
    reviewer_cycle = [USER_IDS["reviewer_lin"], USER_IDS["reviewer_qiao"]]

    accepted_versions: list[tuple[str, int, int, int]] = []
    export_rows_count = 0
    reward_total = Decimal("0")
    reward_detail_rows: list[dict[str, Any]] = []
    ai_async_by_sample: dict[str, int] = {}

    import_only_flow = {
        "assignment_status": "UNCLAIMED",
        "submission_status": None,
        "rounds": [],
    }

    for index, sample in enumerate(dataset, start=1):
        flow = FLOW_BY_SAMPLE.get(sample["id"], import_only_flow)
        item_id = ID_POOLS["task_item"].next()
        assignment_id = ID_POOLS["assignment"].next()
        labeler_id = assignment_user_cycle[(index - 1) % len(assignment_user_cycle)]
        reviewer_id = reviewer_cycle[(index - 1) % len(reviewer_cycle)]

        payload = {
            "sample_id": sample["id"],
            "task_type": sample["task_type"],
            "lang": sample["lang"],
            "prompt": sample["prompt"],
            "response_a": sample["response_a"],
            "response_b": sample["response_b"],
            "model_a": resolve_preference_model(sample["model_a"]),
            "model_b": resolve_preference_model(sample["model_b"]),
        }

        tables["task_items"].append(
            add_audit_defaults(
                {
                    "id": item_id,
                    "task_id": task_id,
                    "import_batch_id": import_batch_id,
                    "seq_no": index,
                    "source_item_key": sample["id"],
                    "payload_json": payload,
                    "payload_hash": sha256_text(canonical_json(payload)),
                    "item_status": "ACTIVE",
                    "difficulty_level": 0,
                    "current_assignment_count": 1,
                    "current_approved_count": 1 if sample["id"] in APPROVED_SAMPLE_IDS else 0,
                    "acceptance_sampled_flag": 1 if sample["id"] in ACCEPTANCE_SAMPLE_DECISIONS else 0,
                    "disabled_reason": None,
                    "last_accepted_at": dt(180) if sample["id"] in ACCEPTANCE_SAMPLE_DECISIONS else None,
                },
                created_by=USER_IDS["owner"],
                updated_by=USER_IDS["owner"],
            )
        )

        assignment_row = add_audit_defaults(
            {
                "id": assignment_id,
                "task_id": task_id,
                "item_id": item_id,
                "slot_no": 1,
                "labeler_id": None if flow["assignment_status"] == "UNCLAIMED" else labeler_id,
                "assign_type": "PRESEED" if flow["assignment_status"] == "UNCLAIMED" else "AUTO_CLAIM",
                "claim_source": "MARKET",
                "status": flow["assignment_status"],
                "current_round_no": 2 if sample["id"] == "P0002" else 1,
                "assigned_by": USER_IDS["owner"],
                "assigned_at": dt(30 + index),
                "claimed_at": None if flow["assignment_status"] == "UNCLAIMED" else dt(32 + index),
                "deadline_at": dt(60 * 24 + index),
                "closed_at": None,
                "canceled_at": None,
                "revoked_at": None,
                "cancel_reason": None,
            },
            created_by=USER_IDS["owner"],
            updated_by=USER_IDS["owner"],
        )
        tables["assignments"].append(assignment_row)

        if flow["submission_status"] is None:
            continue

        submission_id = ID_POOLS["submission"].next()
        draft_data = None
        if flow["submission_status"] == "DRAFT":
            draft_data = build_submission_payload(sample, [])

        initial_level, initial_next_level = initial_review_levels(flow["submission_status"])
        review_state = SubmissionReviewState(
            current_status=flow["submission_status"],
            current_review_level=initial_level,
            next_review_level=initial_next_level,
            last_action_code={
                "APPROVED": "APPROVE",
                "REJECTED": "REJECT",
                "NEEDS_REVISION": "RETURN",
                "AI_REJECTED": "AI_REJECT",
                "AI_PASSED": "AI_PASS",
                "HUMAN_REVIEWING": "AI_MANUAL",
                "DRAFT": "SAVE_DRAFT",
            }.get(flow["submission_status"]),
        )

        submission_row = add_audit_defaults(
            {
                "id": submission_id,
                "assignment_id": assignment_id,
                "task_id": task_id,
                "item_id": item_id,
                "labeler_id": labeler_id,
                "current_template_version_id": template_version_id,
                "current_version_id": None,
                "approved_version_id": None,
                "current_round_no": 2 if sample["id"] == "P0002" else 1,
                "current_status": flow["submission_status"],
                "current_review_level": initial_level,
                "next_review_level": initial_next_level,
                "draft_data_json": draft_data,
                "draft_checksum": sha256_text(canonical_json(draft_data)) if draft_data else None,
                "draft_saved_at": dt(40 + index) if draft_data else None,
                "submit_count": len(flow["rounds"]),
                "return_count": 1 if "returned" in flow["rounds"] else 0,
                "reopen_count": 1 if sample["id"] == "P0002" else 0,
                "withdraw_count": 0,
                "appeal_count": 0,
                "last_submitted_at": dt(50 + index) if flow["rounds"] else None,
                "revision_required_at": dt(63 + index) if flow["submission_status"] == "NEEDS_REVISION" else None,
                "revision_deadline_at": dt(60 * 24 * 2 + index) if flow["submission_status"] == "NEEDS_REVISION" else None,
                "finalized_at": dt(90 + index) if flow["submission_status"] in {"APPROVED", "REJECTED", "AI_REJECTED", "AI_PASSED"} else None,
                "last_action_code": {
                    "APPROVED": "APPROVE",
                    "REJECTED": "REJECT",
                    "NEEDS_REVISION": "RETURN",
                    "AI_REJECTED": "AI_REJECT",
                    "AI_PASSED": "AI_PASS",
                    "HUMAN_REVIEWING": "AI_MANUAL",
                    "DRAFT": "SAVE_DRAFT",
                }[flow["submission_status"]],
                "last_action_at": dt(90 + index) if flow["submission_status"] != "DRAFT" else dt(40 + index),
                "last_return_reason_text": "需要更具体的判断依据" if flow["submission_status"] == "NEEDS_REVISION" else None,
                "last_ai_review_id": None,
                "last_review_record_id": None,
            },
            created_by=labeler_id,
            updated_by=labeler_id,
        )

        version_ids: list[int] = []
        ai_review_ids: list[int] = []
        review_record_ids: list[int] = []

        if flow["rounds"]:
            for round_index, round_mode in enumerate(flow["rounds"], start=1):
                version_id = ID_POOLS["submission_version"].next()
                version_ids.append(version_id)
                evidence_keys = []
                if sample["id"] in {"P0001", "P0005", "P0008"}:
                    evidence_keys.append(file_map[f"evidence-{sample['id']}"])
                submit_payload = build_submission_payload(sample, evidence_keys)
                submit_payload_json = canonical_json(submit_payload)
                tables["submission_versions"].append(
                    add_audit_defaults(
                        {
                            "id": version_id,
                            "submission_id": submission_id,
                            "assignment_id": assignment_id,
                            "task_id": task_id,
                            "item_id": item_id,
                            "labeler_id": labeler_id,
                            "round_no": round_index,
                            "template_version_id": template_version_id,
                            "previous_version_id": version_ids[-2] if round_index > 1 else None,
                            "submit_source": "MANUAL",
                            "submit_data_json": submit_payload,
                            "submit_data_hash": sha256_text(submit_payload_json),
                            "submitted_at": dt(50 + index + round_index),
                        },
                        created_by=labeler_id,
                        updated_by=labeler_id,
                    )
                )

                if evidence_keys:
                    for file_id in evidence_keys:
                        tables["file_references"].append(
                            add_audit_defaults(
                                {
                                    "id": ID_POOLS["file_refs"].next(),
                                    "file_id": file_id,
                                    "biz_type": "SUBMISSION_VERSION",
                                    "biz_id": version_id,
                                    "biz_sub_id": submission_id,
                                    "field_code": "result.evidence_files",
                                    "relation_role": "ATTACHMENT",
                                    "sort_no": 1,
                                    "ref_status": "ACTIVE",
                                },
                                created_by=labeler_id,
                                updated_by=labeler_id,
                            )
                        )

                tables["submission_status_histories"].append(
                    add_audit_defaults(
                        {
                            "id": ID_POOLS["submission_history"].next(),
                            "submission_id": submission_id,
                            "submission_version_id": version_id,
                            "task_id": task_id,
                            "assignment_id": assignment_id,
                            "round_no": round_index,
                            "from_status": "DRAFT" if round_index == 1 else "NEEDS_REVISION",
                            "to_status": "SUBMITTED",
                            "action_code": "SUBMIT",
                            "operator_type": "USER",
                            "operator_id": labeler_id,
                            "review_level": None,
                            "batch_operation_key": None,
                            "reason_code": None,
                            "reason_text": None,
                            "related_ai_review_id": None,
                            "related_review_record_id": None,
                            "request_id": f"seed-submit-{submission_id}-{round_index}",
                            "idempotency_key": f"submit-{submission_id}-{round_index}",
                            "occurred_at": dt(50 + index + round_index),
                        },
                        created_by=labeler_id,
                        updated_by=labeler_id,
                    )
                )
                tables["submission_status_histories"].append(
                    add_audit_defaults(
                        {
                            "id": ID_POOLS["submission_history"].next(),
                            "submission_id": submission_id,
                            "submission_version_id": version_id,
                            "task_id": task_id,
                            "assignment_id": assignment_id,
                            "round_no": round_index,
                            "from_status": "SUBMITTED",
                            "to_status": "AI_REVIEWING",
                            "action_code": "ENTER_AI_REVIEW",
                            "operator_type": "SYSTEM",
                            "operator_id": SYSTEM_USER_ID,
                            "review_level": None,
                            "batch_operation_key": None,
                            "reason_code": None,
                            "reason_text": None,
                            "related_ai_review_id": None,
                            "related_review_record_id": None,
                            "request_id": f"seed-ai-enter-{submission_id}-{round_index}",
                            "idempotency_key": f"ai-enter-{submission_id}-{round_index}",
                            "occurred_at": dt(51 + index + round_index),
                        }
                    )
                )

                ai_task_id = ID_POOLS["async_task"].next()
                ai_async_by_sample[f"{sample['id']}-r{round_index}"] = ai_task_id
                verdict_map = {
                    "ai_human": ("REQUIRE_HUMAN", "HUMAN_REVIEWING", Decimal("92.5")),
                    "returned": ("REQUIRE_HUMAN", "HUMAN_REVIEWING", Decimal("71.0")),
                    "ai_rejected": ("REJECT", "AI_REJECTED", Decimal("28.0")),
                    "ai_passed": ("PASS", "AI_PASSED", Decimal("96.0")),
                }
                ai_verdict, ai_target_status, ai_score = verdict_map[round_mode]
                tables["async_tasks"].append(
                    add_audit_defaults(
                        {
                            "id": ai_task_id,
                            "task_type": "AI_REVIEW",
                            "biz_type": "SUBMISSION",
                            "biz_id": submission_id,
                            "biz_key": f"ai-review:{submission_id}:{round_index}",
                            "priority": 5,
                            "status": "SUCCESS",
                            "payload_json": {"submissionId": submission_id, "submissionVersionId": version_id, "taskId": task_id},
                            "retry_count": 0,
                            "max_retry_count": 3,
                            "manual_retry_count": 0,
                            "next_run_at": dt(52 + index + round_index),
                            "worker_id": "seed-ai-worker",
                            "locked_at": dt(52 + index + round_index),
                            "started_at": dt(52 + index + round_index),
                            "finished_at": dt(53 + index + round_index),
                            "canceled_at": None,
                            "dead_lettered_at": None,
                            "last_error_code": None,
                            "last_error_message": None,
                        }
                    )
                )

                ai_review_id = ID_POOLS["ai_review"].next()
                ai_review_ids.append(ai_review_id)
                ai_result = build_ai_result(sample, ai_verdict, ai_score)
                tables["ai_review_records"].append(
                    add_audit_defaults(
                        {
                            "id": ai_review_id,
                            "submission_id": submission_id,
                            "submission_version_id": version_id,
                            "task_id": task_id,
                            "assignment_id": assignment_id,
                            "review_round_no": round_index,
                            "platform_key": DEEPSEEK_PLATFORM_KEY,
                            "model_id": DEEPSEEK_MODEL_CODE,
                            "async_task_id": ai_task_id,
                            "provider_request_id": f"seed-ai-{submission_id}-{round_index}",
                            "prompt_snapshot": review_prompt,
                            "input_snapshot_json": payload,
                            "output_schema_snapshot_json": review_output_schema,
                            "parsed_result_json": ai_result,
                            "raw_response_text": canonical_json(ai_result),
                            "verdict": ai_verdict,
                            "total_score": ai_score,
                            "summary_text": sample["annotator_note"],
                            "retry_no": 0,
                            "status": "SUCCESS",
                            "failure_reason": None,
                            "manual_retry_flag": 0,
                            "dead_letter_flag": 0,
                            "fallback_target_status": ai_target_status,
                            "started_at": dt(52 + index + round_index),
                            "finished_at": dt(53 + index + round_index),
                        }
                    )
                )

                for score_sort, dim in enumerate(REVIEW_DIMENSIONS, start=1):
                    score = Decimal("95.0")
                    if ai_verdict == "REJECT" and dim["dimension_key"] == "SAFETY":
                        score = Decimal("20.0")
                    elif round_mode == "returned" and dim["dimension_key"] == "COMPLETENESS":
                        score = Decimal("58.0")
                    tables["ai_review_dimension_scores"].append(
                        add_audit_defaults(
                            {
                                "id": ID_POOLS["ai_dimension_score"].next(),
                                "ai_review_id": ai_review_id,
                                "dimension_key": dim["dimension_key"],
                                "dimension_name": dim["dimension_name"],
                                "score": score,
                                "weight": Decimal(dim["weight"]),
                                "verdict": "FAIL" if score < Decimal(dim["reject_threshold"]) else "PASS",
                                "comment_text": dim["prompt_instruction"],
                                "sort_no": score_sort,
                            }
                        )
                    )

                tables["submission_status_histories"].append(
                    add_audit_defaults(
                        {
                            "id": ID_POOLS["submission_history"].next(),
                            "submission_id": submission_id,
                            "submission_version_id": version_id,
                            "task_id": task_id,
                            "assignment_id": assignment_id,
                            "round_no": round_index,
                            "from_status": "AI_REVIEWING",
                            "to_status": ai_target_status,
                            "action_code": {"PASS": "AI_PASS", "REJECT": "AI_REJECT", "REQUIRE_HUMAN": "AI_REQUIRE_HUMAN"}[ai_verdict],
                            "operator_type": "SYSTEM",
                            "operator_id": SYSTEM_USER_ID,
                            "review_level": "L1" if ai_target_status == "HUMAN_REVIEWING" else None,
                            "batch_operation_key": None,
                            "reason_code": None,
                            "reason_text": sample["annotator_note"],
                            "related_ai_review_id": ai_review_id,
                            "related_review_record_id": None,
                            "request_id": f"seed-ai-result-{submission_id}-{round_index}",
                            "idempotency_key": f"ai-result-{submission_id}-{round_index}",
                            "occurred_at": dt(53 + index + round_index),
                        }
                    )
                )

                if ai_target_status == "HUMAN_REVIEWING":
                    review_state.current_status = "HUMAN_REVIEWING"
                    review_state.current_review_level = WORKFLOW_LEVELS[0]
                    review_state.next_review_level = workflow_next_level(WORKFLOW_LEVELS[0])
                    review_state.last_action_code = "AI_MANUAL"

                human_review_spec = flow.get("human_review")
                review_time_base = 55 + index * 10 + round_index * 5
                if round_mode == "returned":
                    apply_human_return_l1(
                        tables=tables,
                        state=review_state,
                        submission_id=submission_id,
                        version_id=version_id,
                        task_id=task_id,
                        assignment_id=assignment_id,
                        sample=sample,
                        round_no=round_index,
                        time_base=review_time_base,
                        ai_review_id=ai_review_id,
                        review_record_ids=review_record_ids,
                    )
                elif round_mode == "ai_human" and human_review_spec:
                    apply_human_review_spec(
                        human_review_spec,
                        tables=tables,
                        state=review_state,
                        submission_id=submission_id,
                        version_id=version_id,
                        task_id=task_id,
                        assignment_id=assignment_id,
                        sample=sample,
                        round_no=round_index,
                        time_base=review_time_base,
                        ai_review_id=ai_review_id,
                        review_record_ids=review_record_ids,
                    )
                elif round_mode in {"ai_rejected", "ai_passed"}:
                    review_state.current_status = ai_target_status
                    review_state.current_review_level = None
                    review_state.next_review_level = None
                    review_state.last_action_code = "AI_REJECT" if round_mode == "ai_rejected" else "AI_PASS"

                if sample["id"] in {"P0002", "P0005"} and round_index == 1:
                    tables["llm_assist_records"].append(
                        add_audit_defaults(
                            {
                                "id": ID_POOLS["llm_assist"].next(),
                                "submission_id": submission_id,
                                "assignment_id": assignment_id,
                                "task_id": task_id,
                                "template_version_id": template_version_id,
                                "field_code": "runtime.ai_reference",
                                "platform_key": DEEPSEEK_PLATFORM_KEY,
                                "model_id": DEEPSEEK_MODEL_CODE,
                                "prompt_text": "请给出偏好对比的审核建议。",
                                "response_text": f"建议优先检查 {', '.join(sample['dimensions'])}。",
                                "parsed_output_json": {"winner": sample["preferred"], "focus": sample["dimensions"][:2]},
                                "status": "SUCCESS",
                                "total_tokens": 512,
                                "latency_ms": 420,
                                "invoked_by": reviewer_id,
                                "invoked_at": dt(54 + index + round_index),
                            },
                            created_by=reviewer_id,
                            updated_by=reviewer_id,
                        )
                    )

            submission_row["current_version_id"] = version_ids[-1]
            apply_review_state_to_submission_row(submission_row, review_state)
            if review_state.assignment_status:
                assignment_row["status"] = review_state.assignment_status
            if review_state.current_status == "NEEDS_REVISION":
                submission_row["revision_required_at"] = dt(63 + index)
                submission_row["revision_deadline_at"] = dt(60 * 24 * 2 + index)
                submission_row["last_return_reason_text"] = "需要更具体的判断依据"
            if review_state.current_status == "APPROVED":
                submission_row["approved_version_id"] = version_ids[-1]
                accepted_versions.append((sample["id"], submission_id, version_ids[-1], assignment_id))
                export_rows_count += 1
            submission_row["last_ai_review_id"] = ai_review_ids[-1] if ai_review_ids else None
            submission_row["last_review_record_id"] = review_record_ids[-1] if review_record_ids else None

        tables["submissions"].append(submission_row)

    acceptance_id = ID_POOLS["acceptance"].next()
    tables["task_acceptance_records"].append(
        add_audit_defaults(
            {
                "id": acceptance_id,
                "task_id": task_id,
                "acceptance_type": "FINAL_CONFIRM",
                "accepted_by": USER_IDS["owner"],
                "status": "CONFIRMED",
                "sample_rule_json": {"mode": "RATIO", "value": 0.2},
                "target_scope_json": {"status": ["APPROVED"]},
                "sample_total_count": len(ACCEPTANCE_SAMPLE_DECISIONS),
                "sampled_count": len(ACCEPTANCE_SAMPLE_DECISIONS),
                "pass_count": sum(1 for value in ACCEPTANCE_SAMPLE_DECISIONS.values() if value == "PASS"),
                "failed_count": sum(1 for value in ACCEPTANCE_SAMPLE_DECISIONS.values() if value == "FAIL"),
                "comment_text": "抽样检查偏好对比任务的已通过样本。",
                "confirmed_at": dt(180),
                "reopened_at": None,
                "archived_at": None,
            },
            created_by=USER_IDS["owner"],
            updated_by=USER_IDS["owner"],
        )
    )
    tables["tasks"][0]["latest_acceptance_id"] = acceptance_id

    accepted_lookup = {sample_id: (submission_id, version_id, assignment_id) for sample_id, submission_id, version_id, assignment_id in accepted_versions}
    for sample_id, decision in ACCEPTANCE_SAMPLE_DECISIONS.items():
        submission_id, version_id, assignment_id = accepted_lookup[sample_id]
        sample = next(item for item in dataset if item["id"] == sample_id)
        tables["task_acceptance_samples"].append(
            add_audit_defaults(
                {
                    "id": ID_POOLS["acceptance_sample"].next(),
                    "acceptance_id": acceptance_id,
                    "task_id": task_id,
                    "submission_id": submission_id,
                    "submission_version_id": version_id,
                    "assignment_id": assignment_id,
                    "labeler_id": assignment_user_cycle[(int(sample_id[-1]) - 1) % len(assignment_user_cycle)],
                    "reviewer_id": reviewer_cycle[0],
                    "sample_source": "AUTO",
                    "sample_status": "CHECKED",
                    "owner_decision": decision,
                    "owner_comment_text": sample["annotator_note"],
                    "checked_at": dt(181),
                },
                created_by=USER_IDS["owner"],
                updated_by=USER_IDS["owner"],
            )
        )

    reward_batch_id = ID_POOLS["reward_batch"].next()
    for sample_id, submission_id, version_id, assignment_id in accepted_versions:
        if sample_id not in APPROVED_SAMPLE_IDS:
            continue
        user_id = next(row["labeler_id"] for row in tables["submissions"] if row["id"] == submission_id)
        amount = Decimal("12.00")
        reward_total += amount
        reward_detail_rows.append(
            add_audit_defaults(
                {
                    "id": ID_POOLS["reward_detail"].next(),
                    "batch_id": reward_batch_id,
                    "task_id": task_id,
                    "user_id": user_id,
                    "submission_id": submission_id,
                    "submission_version_id": version_id,
                    "assignment_id": assignment_id,
                    "currency_code": "CNY",
                    "amount": amount,
                    "status": "PAID",
                    "quality_score": Decimal("96.50"),
                    "reward_reason": "APPROVED_PREFERENCE_LABEL",
                    "calc_basis_json": {"mode": "PER_APPROVED", "baseAmount": 12, "sampleId": sample_id},
                    "effective_at": dt(190),
                    "settled_at": dt(200),
                    "reversed_at": None,
                }
            )
        )

    tables["reward_settlement_batches"].append(
        add_audit_defaults(
            {
                "id": reward_batch_id,
                "task_id": task_id,
                "batch_no": "RB-PREF-001",
                "status": "PAID",
                "settle_scope": "APPROVED_ONLY",
                "currency_code": "CNY",
                "reward_rule_snapshot_json": {"mode": "PER_APPROVED", "base_amount": 12, "currency": "CNY", "settle_unit": "SUBMISSION"},
                "target_total_count": len(APPROVED_SAMPLE_IDS),
                "effective_total_count": len(APPROVED_SAMPLE_IDS),
                "user_total_count": len({row["user_id"] for row in reward_detail_rows}),
                "total_amount": reward_total,
                "confirmed_by": USER_IDS["owner"],
                "confirmed_at": dt(195),
                "paid_at": dt(200),
                "reversed_at": None,
                "export_file_id": file_map["export-approved"],
                "remark": "Seed generated reward settlement batch",
            },
            created_by=USER_IDS["owner"],
            updated_by=USER_IDS["owner"],
        )
    )
    tables["reward_settlement_details"].extend(reward_detail_rows)

    export_async_id = ID_POOLS["async_task"].next()
    tables["async_tasks"].append(
        add_audit_defaults(
            {
                "id": export_async_id,
                "task_type": "DATA_EXPORT",
                "biz_type": "EXPORT_JOB",
                "biz_id": 910250000001,
                "biz_key": "export:preference_compare:approved",
                "priority": 5,
                "status": "SUCCESS",
                "payload_json": {"taskId": task_id, "scope": "APPROVED_ONLY", "format": "CSV"},
                "retry_count": 0,
                "max_retry_count": 3,
                "manual_retry_count": 0,
                "next_run_at": dt(210),
                "worker_id": "seed-export-worker",
                "locked_at": dt(210),
                "started_at": dt(210),
                "finished_at": dt(212),
                "canceled_at": None,
                "dead_lettered_at": None,
                "last_error_code": None,
                "last_error_message": None,
            }
        )
    )

    export_job_id = ID_POOLS["export_job"].next()
    export_file_checksum = sha256_text("preference-export")
    tables["export_jobs"].append(
        add_audit_defaults(
            {
                "id": export_job_id,
                "task_id": task_id,
                "biz_type": "APPROVED_DATA",
                "source_biz_id": reward_batch_id,
                "requested_by": USER_IDS["owner"],
                "export_scope": "APPROVED_ONLY",
                "template_scope": "BOUND_VERSION",
                "format_code": "CSV",
                "field_map_json": ["sample_id", "preferred", "margin", "annotator_note"],
                "field_rename_json": {"sample_id": "样本ID", "preferred": "偏好结果"},
                "filters_json": {"statuses": ["APPROVED"]},
                "acceptance_id": acceptance_id,
                "include_review_flag": 1,
                "include_ai_review_flag": 1,
                "status": "SUCCESS",
                "progress_percent": 100,
                "total_records": export_rows_count,
                "exported_records": export_rows_count,
                "result_file_id": file_map["export-approved"],
                "async_task_id": export_async_id,
                "checksum": export_file_checksum,
                "error_message": None,
                "started_at": dt(210),
                "finished_at": dt(212),
                "canceled_at": None,
                "expire_at": dt(60 * 24 * 30),
            },
            created_by=USER_IDS["owner"],
            updated_by=USER_IDS["owner"],
        )
    )

    tables["file_references"].append(
        add_audit_defaults(
            {
                "id": ID_POOLS["file_refs"].next(),
                "file_id": file_map["dataset-json"],
                "biz_type": "TASK_IMPORT_BATCH",
                "biz_id": import_batch_id,
                "biz_sub_id": task_id,
                "field_code": "source_file_id",
                "relation_role": "SOURCE",
                "sort_no": 1,
                "ref_status": "ACTIVE",
            },
            created_by=USER_IDS["owner"],
            updated_by=USER_IDS["owner"],
        )
    )
    tables["file_references"].append(
        add_audit_defaults(
            {
                "id": ID_POOLS["file_refs"].next(),
                "file_id": file_map["export-approved"],
                "biz_type": "EXPORT_JOB",
                "biz_id": export_job_id,
                "biz_sub_id": task_id,
                "field_code": "result_file_id",
                "relation_role": "RESULT",
                "sort_no": 1,
                "ref_status": "ACTIVE",
            },
            created_by=USER_IDS["owner"],
            updated_by=USER_IDS["owner"],
        )
    )

    tables["scheduled_tasks"].extend(
        [
            add_audit_defaults(
                {
                    "id": ID_POOLS["scheduled_task"].next(),
                    "task_name": "seed.preference.stats.refresh",
                    "task_type": "STATS_REFRESH",
                    "cron_expr": "0 0/30 * * * ?",
                    "payload_json": {"taskId": task_id, "bizType": "TASK_STATS"},
                    "biz_type": "TASK",
                    "biz_id": task_id,
                    "priority": 5,
                    "max_retry_count": 3,
                    "enabled": 1,
                    "last_triggered_at": dt(220),
                    "next_trigger_at": dt(250),
                    "total_trigger_count": 4,
                    "description": "周期刷新偏好对比任务统计。",
                }
            ),
            add_audit_defaults(
                {
                    "id": ID_POOLS["scheduled_task"].next(),
                    "task_name": "seed.preference.export.cleanup",
                    "task_type": "EXPORT_CLEANUP",
                    "cron_expr": "0 15 2 * * ?",
                    "payload_json": {"keepDays": 30},
                    "biz_type": "EXPORT_JOB",
                    "biz_id": export_job_id,
                    "priority": 4,
                    "max_retry_count": 2,
                    "enabled": 1,
                    "last_triggered_at": dt(221),
                    "next_trigger_at": dt(60 * 24),
                    "total_trigger_count": 1,
                    "description": "定期清理导出产物与生成临时文件。",
                }
            ),
        ]
    )

    from preference_compare_seed_health import append_health_seed_universe
    from preference_compare_seed_universe import append_seed_universe

    append_seed_universe(
        tables,
        owner_id=USER_IDS["owner"],
        labeler_id=USER_IDS["labeler_anna"],
        reviewer_lin_id=USER_IDS["reviewer_lin"],
        reviewer_qiao_id=USER_IDS["reviewer_qiao"],
        reviewer_ming_id=USER_IDS["reviewer_ming"],
        template_version_id=template_version_v2_id,
        schema_json=json.loads(schema_json),
        review_prompt=review_prompt,
        review_output_schema=review_output_schema,
        workflow_json=THREE_LEVEL_REVIEW_WORKFLOW,
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=ID_POOLS,
        tenant_id=TENANT_ID,
        system_user_id=SYSTEM_USER_ID,
    )
    append_health_seed_universe(
        tables,
        owner_id=USER_IDS["owner"],
        labeler_id=USER_IDS["labeler_anna"],
        reviewer_lin_id=USER_IDS["reviewer_lin"],
        reviewer_qiao_id=USER_IDS["reviewer_qiao"],
        main_task_id=task_id,
        main_template_id=template_id,
        main_template_version_id=template_version_v2_id,
        schema_json=json.loads(schema_json),
        schema_checksum=schema_checksum,
        review_prompt=review_prompt,
        review_output_schema=review_output_schema,
        workflow_json=THREE_LEVEL_REVIEW_WORKFLOW,
        review_dimensions=REVIEW_DIMENSIONS,
        field_count=len(field_defs),
        required_field_count=sum(1 for field in field_defs if field.get("required")),
        build_ai_result=build_ai_result,
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=ID_POOLS,
        system_user_id=SYSTEM_USER_ID,
    )

    from preference_compare_seed_llm_assist import append_preference_llm_assist_records
    from preference_compare_seed_observability import append_ai_review_observability

    append_preference_llm_assist_records(
        tables,
        main_task_id=task_id,
        main_template_version_id=template_version_v2_id,
        add_audit_defaults=add_audit_defaults,
        dt=dt,
        id_pools=ID_POOLS,
    )
    append_ai_review_observability(
        tables,
        add_audit_defaults=add_audit_defaults,
        id_pools=ID_POOLS,
    )

    return tables


TABLE_CONFIG = [
    ("users", ["id", "tenant_id", "created_by", "updated_by", "username", "password_hash", "display_name", "email", "phone", "status", "last_login_at", "register_source"], set()),
    ("roles", ["id", "tenant_id", "created_by", "updated_by", "role_code", "role_name", "status", "remark"], set()),
    ("role_permissions", ["id", "tenant_id", "created_by", "updated_by", "role_id", "permission_id", "grant_source"], set()),
    ("role_menus", ["id", "tenant_id", "created_by", "updated_by", "role_id", "menu_id", "grant_scope"], set()),
    ("user_roles", ["id", "tenant_id", "created_by", "updated_by", "user_id", "role_id", "effective_at", "expired_at"], set()),
    ("template_market", ["id", "tenant_id", "created_by", "updated_by", "template_code", "template_name", "template_description", "category_code", "scene_code", "cover_image_file_id", "author_id", "source_tenant_id", "source_task_id", "template_version_id", "schema_json", "review_prompt_template", "review_output_schema_json", "review_workflow_json", "acceptance_rule_json", "llm_assist_config_json", "tags_json", "download_count", "like_count", "view_count", "favorite_count", "rating_avg", "rating_count", "is_public", "is_featured", "audit_status", "status", "published_at"], {"schema_json", "review_output_schema_json", "review_workflow_json", "acceptance_rule_json", "llm_assist_config_json", "tags_json", "ext_json"}),
    ("templates", ["id", "tenant_id", "created_by", "updated_by", "task_id", "source_market_id", "template_code", "template_name", "scene_code", "description_text", "current_template_version_id", "latest_version_no", "status"], set()),
    ("template_versions", ["id", "tenant_id", "created_by", "updated_by", "task_id", "template_id", "version_no", "template_name", "status", "is_current", "schema_json", "schema_checksum", "review_prompt_template", "review_output_schema_json", "review_workflow_json", "acceptance_rule_json", "llm_assist_config_json", "provider_platform_key", "model_id", "widget_count", "required_field_count", "validation_errors_json", "published_at", "archived_at", "archived_reason"], {"schema_json", "review_output_schema_json", "review_workflow_json", "acceptance_rule_json", "llm_assist_config_json", "validation_errors_json"}),
    ("template_version_fields", ["id", "tenant_id", "created_by", "updated_by", "template_version_id", "field_code", "field_path", "field_title", "widget_type", "value_type", "is_required", "is_display_only", "sort_no", "default_value_json", "validator_rule_json", "linkage_rule_json", "visibility_rule_json", "dependency_field_codes_json", "enum_options_json", "widget_config_json"], {"default_value_json", "validator_rule_json", "linkage_rule_json", "visibility_rule_json", "dependency_field_codes_json", "enum_options_json", "widget_config_json"}),
    ("template_review_dimensions", ["id", "tenant_id", "created_by", "updated_by", "template_version_id", "dimension_key", "dimension_name", "dimension_desc", "weight", "score_min", "score_max", "pass_threshold", "reject_threshold", "prompt_instruction", "manual_review_hint", "severity_level", "sort_no", "required_flag"], set()),
    ("tasks", ["id", "tenant_id", "created_by", "updated_by", "task_code", "owner_id", "title", "description_text", "description_rich", "scene_code", "status", "distribute_strategy", "quota", "max_claim_per_user", "acceptance_required_flag", "acceptance_status", "latest_acceptance_id", "reward_settlement_status", "deadline_at", "published_at", "paused_at", "finished_at", "archived_at", "restored_at", "current_template_version_id", "tags_json", "reward_rule_json", "settings_json", "import_payload_contract_json", "published_check_result_json", "status_reason", "review_workflow_json", "version_no"], {"tags_json", "reward_rule_json", "settings_json", "import_payload_contract_json", "published_check_result_json", "review_workflow_json"}),
    ("task_members", ["id", "tenant_id", "created_by", "updated_by", "task_id", "user_id", "member_role", "permission_set_json", "status", "joined_at"], {"permission_set_json"}),
    ("file_assets", ["id", "tenant_id", "created_by", "updated_by", "storage_provider", "bucket_name", "object_key", "original_name", "stored_name", "file_ext", "mime_type", "size_bytes", "sha256", "category_code", "upload_status", "is_public", "uploaded_by", "uploaded_at", "scan_status", "last_accessed_at", "expire_at"], set()),
    ("task_item_import_batches", ["id", "tenant_id", "created_by", "updated_by", "task_id", "source_file_id", "source_filename", "source_format", "import_status", "overwrite_mode", "file_checksum", "total_rows", "success_rows", "failed_rows", "error_summary_json", "started_at", "finished_at"], {"error_summary_json"}),
    ("task_item_import_errors", ["id", "tenant_id", "created_by", "updated_by", "batch_id", "row_no", "error_code", "error_message", "raw_line_text", "raw_payload_json", "normalized_payload_json", "is_blocking"], {"raw_payload_json", "normalized_payload_json"}),
    ("task_items", ["id", "tenant_id", "created_by", "updated_by", "task_id", "import_batch_id", "seq_no", "source_item_key", "payload_json", "payload_hash", "item_status", "difficulty_level", "current_assignment_count", "current_approved_count", "acceptance_sampled_flag", "disabled_reason", "last_accepted_at"], {"payload_json"}),
    ("assignments", ["id", "tenant_id", "created_by", "updated_by", "task_id", "item_id", "slot_no", "labeler_id", "assign_type", "claim_source", "status", "current_round_no", "assigned_by", "assigned_at", "claimed_at", "deadline_at", "closed_at", "canceled_at", "revoked_at", "cancel_reason"], set()),
    ("submissions", ["id", "tenant_id", "created_by", "updated_by", "assignment_id", "task_id", "item_id", "labeler_id", "current_template_version_id", "current_version_id", "approved_version_id", "current_round_no", "current_status", "current_review_level", "next_review_level", "draft_data_json", "draft_checksum", "draft_saved_at", "submit_count", "return_count", "reopen_count", "withdraw_count", "appeal_count", "last_submitted_at", "revision_required_at", "revision_deadline_at", "finalized_at", "last_action_code", "last_action_at", "last_return_reason_text", "last_ai_review_id", "last_review_record_id"], {"draft_data_json"}),
    ("submission_versions", ["id", "tenant_id", "created_by", "updated_by", "submission_id", "assignment_id", "task_id", "item_id", "labeler_id", "round_no", "template_version_id", "previous_version_id", "submit_source", "submit_data_json", "submit_data_hash", "submitted_at"], {"submit_data_json"}),
    ("submission_status_histories", ["id", "tenant_id", "created_by", "updated_by", "submission_id", "submission_version_id", "task_id", "assignment_id", "round_no", "from_status", "to_status", "action_code", "operator_type", "operator_id", "review_level", "batch_operation_key", "reason_code", "reason_text", "related_ai_review_id", "related_review_record_id", "request_id", "idempotency_key", "occurred_at"], set()),
    ("llm_assist_records", ["id", "tenant_id", "created_by", "updated_by", "submission_id", "assignment_id", "task_id", "template_version_id", "field_code", "platform_key", "model_id", "prompt_text", "response_text", "parsed_output_json", "status", "total_tokens", "latency_ms", "invoked_by", "invoked_at"], {"parsed_output_json"}),
    ("async_tasks", ["id", "tenant_id", "created_by", "updated_by", "task_type", "biz_type", "biz_id", "biz_key", "priority", "status", "payload_json", "retry_count", "max_retry_count", "manual_retry_count", "next_run_at", "worker_id", "locked_at", "started_at", "finished_at", "canceled_at", "dead_lettered_at", "last_error_code", "last_error_message"], {"payload_json"}),
    ("ai_review_records", ["id", "tenant_id", "created_by", "updated_by", "submission_id", "submission_version_id", "task_id", "assignment_id", "review_round_no", "platform_key", "model_id", "async_task_id", "provider_request_id", "prompt_snapshot", "input_snapshot_json", "output_schema_snapshot_json", "parsed_result_json", "raw_response_text", "verdict", "total_score", "summary_text", "retry_no", "status", "failure_reason", "manual_retry_flag", "dead_letter_flag", "fallback_target_status", "started_at", "finished_at", "total_latency_ms", "attempt_count", "prompt_tokens", "completion_tokens", "total_tokens", "error_code", "traceability_status", "history_gap_reason"], {"input_snapshot_json", "output_schema_snapshot_json", "parsed_result_json"}),
    ("ai_review_llm_attempts", ["id", "tenant_id", "created_by", "updated_by", "ai_review_id", "submission_id", "submission_version_id", "task_id", "attempt_no", "platform_key", "model_id", "provider_request_id", "prompt_snapshot", "response_snapshot", "error_message", "success_flag", "latency_ms", "prompt_tokens", "completion_tokens", "total_tokens", "history_backfill_flag", "traceability_status", "history_gap_reason", "started_at", "finished_at"], set()),
    ("ai_review_dimension_scores", ["id", "tenant_id", "created_by", "updated_by", "ai_review_id", "dimension_key", "dimension_name", "score", "weight", "verdict", "comment_text", "sort_no"], set()),
    ("review_records", ["id", "tenant_id", "created_by", "updated_by", "submission_id", "submission_version_id", "task_id", "assignment_id", "reviewer_id", "review_level", "review_stage_no", "review_node_code", "action", "from_status", "to_status", "review_batch_key", "next_review_level", "is_final_decision", "comment_text", "diff_json", "decided_at"], {"diff_json"}),
    ("review_batch_operations", ["id", "tenant_id", "created_by", "updated_by", "batch_key", "task_id", "operator_id", "review_level", "batch_action", "criteria_json", "target_total_count", "success_count", "failed_count", "status", "started_at", "finished_at", "failure_summary_json"], {"criteria_json", "failure_summary_json"}),
    ("task_acceptance_records", ["id", "tenant_id", "created_by", "updated_by", "task_id", "acceptance_type", "accepted_by", "status", "sample_rule_json", "target_scope_json", "sample_total_count", "sampled_count", "pass_count", "failed_count", "comment_text", "confirmed_at", "reopened_at", "archived_at"], {"sample_rule_json", "target_scope_json"}),
    ("task_acceptance_samples", ["id", "tenant_id", "created_by", "updated_by", "acceptance_id", "task_id", "submission_id", "submission_version_id", "assignment_id", "labeler_id", "reviewer_id", "sample_source", "sample_status", "owner_decision", "owner_comment_text", "checked_at"], set()),
    ("reward_settlement_batches", ["id", "tenant_id", "created_by", "updated_by", "task_id", "batch_no", "status", "settle_scope", "currency_code", "reward_rule_snapshot_json", "target_total_count", "effective_total_count", "user_total_count", "total_amount", "confirmed_by", "confirmed_at", "paid_at", "reversed_at", "export_file_id", "remark"], {"reward_rule_snapshot_json"}),
    ("reward_settlement_details", ["id", "tenant_id", "created_by", "updated_by", "batch_id", "task_id", "user_id", "submission_id", "submission_version_id", "assignment_id", "currency_code", "amount", "status", "quality_score", "reward_reason", "calc_basis_json", "effective_at", "settled_at", "reversed_at"], {"calc_basis_json"}),
    ("export_jobs", ["id", "tenant_id", "created_by", "updated_by", "task_id", "biz_type", "source_biz_id", "requested_by", "export_scope", "template_scope", "format_code", "field_map_json", "field_rename_json", "filters_json", "acceptance_id", "include_review_flag", "include_ai_review_flag", "status", "progress_percent", "total_records", "exported_records", "result_file_id", "async_task_id", "checksum", "error_message", "started_at", "finished_at", "canceled_at", "expire_at"], {"field_map_json", "field_rename_json", "filters_json"}),
    ("file_references", ["id", "tenant_id", "created_by", "updated_by", "file_id", "biz_type", "biz_id", "biz_sub_id", "field_code", "relation_role", "sort_no", "ref_status"], set()),
    ("scheduled_tasks", ["id", "tenant_id", "created_by", "updated_by", "task_name", "task_type", "cron_expr", "payload_json", "biz_type", "biz_id", "priority", "max_retry_count", "enabled", "last_triggered_at", "next_trigger_at", "total_trigger_count", "description"], {"payload_json"}),
    ("ai_review_prompt_health_metrics", ["id", "tenant_id", "created_by", "updated_by", "template_version_id", "task_id", "metric_date", "window_days", "sample_count", "metrics_json", "health_status"], {"metrics_json"}),
    ("ai_review_misalignment_cases", ["id", "tenant_id", "created_by", "updated_by", "template_version_id", "task_id", "submission_id", "submission_version_id", "ai_review_id", "ai_verdict", "human_label", "misalignment_type", "appeal_id", "item_payload_json", "submit_data_json", "ai_summary_text", "ai_dimension_scores_json", "human_comment_text", "split_tag"], {"item_payload_json", "submit_data_json", "ai_dimension_scores_json"}),
    ("ai_review_prompt_suggestions", ["id", "tenant_id", "created_by", "updated_by", "template_version_id", "task_id", "owner_id", "baseline_prompt_template", "candidate_prompt_template", "change_summary", "baseline_metrics_json", "ab_test_report_json", "status", "decided_by", "decided_at", "dismiss_reason", "accepted_template_version_id", "cooldown_until"], {"baseline_metrics_json", "ab_test_report_json"}),
]


def validate_seed(tables: dict[str, list[dict[str, Any]]], dataset_size: int) -> None:
    for table, rows in tables.items():
        ids = [row["id"] for row in rows if "id" in row]
        if len(ids) != len(set(ids)):
            raise ValueError(f"{table} contains duplicate ids")
    demo_tasks = [row for row in tables["tasks"] if row["task_code"] == "TASK_PREF_COMPARE_DEMO"]
    if len(demo_tasks) != 1:
        raise ValueError("expected exactly one TASK_PREF_COMPARE_DEMO task")
    task_row = demo_tasks[0]
    if task_row["quota"] != dataset_size:
        raise ValueError("task quota does not match dataset size")
    if task_row.get("latest_acceptance_id") is None:
        raise ValueError("task.latest_acceptance_id must reference acceptance record")
    templates = tables["templates"]
    if not any(t.get("source_market_id") for t in templates):
        raise ValueError("main template must link source_market_id")

    market_audit = {row["audit_status"] for row in tables.get("template_market", [])}
    for required in ("PENDING", "APPROVED", "REJECTED"):
        if required not in market_audit:
            raise ValueError(f"template_market missing audit_status {required}")

    version_status = {row["status"] for row in tables["template_versions"] if row["template_id"] == templates[0]["id"]}
    for required in ("DRAFT", "PUBLISHED", "ARCHIVED"):
        if required not in version_status:
            raise ValueError(f"template_versions missing status {required}")

    demo_approved = [
        row
        for row in tables["submissions"]
        if row["task_id"] == task_row["id"] and row["current_status"] == "APPROVED"
    ]
    demo_reward_details = [
        row for row in tables["reward_settlement_details"] if row["task_id"] == task_row["id"]
    ]
    if len(demo_approved) != len(demo_reward_details):
        raise ValueError("demo task approved submissions and reward details count mismatch")
    if {row["id"] for row in demo_approved} != {row["submission_id"] for row in demo_reward_details}:
        raise ValueError("demo reward details must match approved submissions")

    demo_exports = [row for row in tables["export_jobs"] if row["task_id"] == task_row["id"] and row["status"] == "SUCCESS"]
    if len(demo_exports) != 1 or demo_exports[0]["total_records"] != len(demo_approved):
        raise ValueError("demo export job does not match approved submissions")
    acceptance_rows = [row for row in tables["task_acceptance_records"] if row["task_id"] == task_row["id"]]
    if len(acceptance_rows) != 1 or acceptance_rows[0]["status"] != "CONFIRMED":
        raise ValueError("demo acceptance seed is incomplete")

    task_status = {row["status"] for row in tables["tasks"] if row["task_code"].startswith("TASK_SM_") or row["task_code"] == "TASK_PREF_COMPARE_DEMO"}
    for required in ("DRAFT", "PUBLISHED", "PAUSED", "ARCHIVED", "FINISHED"):
        if required not in task_status:
            raise ValueError(f"tasks missing status {required}")

    async_status = {row["status"] for row in tables["async_tasks"]}
    for required in ("PENDING", "RUNNING", "SUCCESS", "DEAD_LETTER", "CANCELED"):
        if required not in async_status:
            raise ValueError(f"async_tasks missing status {required}")

    batch_status = {row["status"] for row in tables.get("review_batch_operations", [])}
    for required in ("PENDING", "RUNNING", "SUCCESS", "FAILED", "PARTIAL"):
        if required not in batch_status:
            raise ValueError(f"review_batch_operations missing status {required}")

    export_status = {row["status"] for row in tables["export_jobs"]}
    for required in ("PENDING", "RUNNING", "SUCCESS", "FAILED"):
        if required not in export_status:
            raise ValueError(f"export_jobs missing status {required}")

    reward_batch_status = {row["status"] for row in tables["reward_settlement_batches"]}
    for required in ("DRAFT", "CONFIRMED", "PENDING", "PAID", "REVERSED"):
        if required not in reward_batch_status:
            raise ValueError(f"reward_settlement_batches missing status {required}")

    sm_submission_task = next(row for row in tables["tasks"] if row["task_code"] == "TASK_SM_SUBMISSION")
    sm_submission_statuses = {
        row["current_status"]
        for row in tables["submissions"]
        if row["task_id"] == sm_submission_task["id"]
    }
    for required in (
        "SUBMITTED",
        "AI_REVIEWING",
        "APPEALING",
        "APPEAL_APPROVED",
        "APPEAL_REJECTED",
        "DRAFT",
        "HUMAN_REVIEWING",
        "REJECTED",
        "AI_PASSED",
    ):
        if required not in sm_submission_statuses:
            raise ValueError(f"TASK_SM_SUBMISSION missing submission status {required}")

    accept_task = next(row for row in tables["tasks"] if row["task_code"] == "TASK_SM_ACCEPT")
    accept_records = [row for row in tables["task_acceptance_records"] if row["task_id"] == accept_task["id"]]
    accept_record_status = {row["status"] for row in accept_records}
    if not {"PENDING", "SAMPLING", "REOPENED"}.issubset(accept_record_status):
        raise ValueError("TASK_SM_ACCEPT must have PENDING, SAMPLING and REOPENED acceptance records")
    if accept_task.get("latest_acceptance_id") is None:
        raise ValueError("TASK_SM_ACCEPT.latest_acceptance_id must be set")
    accept_samples = [row for row in tables["task_acceptance_samples"] if row["task_id"] == accept_task["id"]]
    if len(accept_samples) < 2:
        raise ValueError("TASK_SM_ACCEPT must have acceptance samples linked to APPROVED submissions")

    accept_members = [row for row in tables["task_members"] if row["task_id"] == accept_task["id"]]
    if not any(row["member_role"] == "REVIEWER" for row in accept_members):
        raise ValueError("TASK_SM_ACCEPT must have reviewer members")

    reward_task = next(row for row in tables["tasks"] if row["task_code"] == "TASK_SM_REWARD")
    reward_members = [row for row in tables["task_members"] if row["task_id"] == reward_task["id"]]
    if not any(row["member_role"] == "REVIEWER" for row in reward_members):
        raise ValueError("TASK_SM_REWARD must have reviewer members")

    l1_task = next(row for row in tables["tasks"] if row["task_code"] == "TASK_SM_REVIEW_L1")
    l1_levels = l1_task.get("review_workflow_json", {}).get("levels", [])
    if len(l1_levels) != 1 or l1_levels[0].get("key") != "L1":
        raise ValueError("TASK_SM_REVIEW_L1 must use single L1 workflow")
    l1_approved = [
        row
        for row in tables["submissions"]
        if row["task_id"] == l1_task["id"] and row["current_status"] == "APPROVED"
    ]
    if len(l1_approved) != 1 or l1_approved[0]["current_review_level"] != "L1":
        raise ValueError("TASK_SM_REVIEW_L1 needs one L1-final APPROVED submission")

    ops_task = next(row for row in tables["tasks"] if row["task_code"] == "TASK_SM_OPS")
    ops_import_status = {
        row["import_status"] for row in tables["task_item_import_batches"] if row["task_id"] == ops_task["id"]
    }
    if ops_import_status != {"RUNNING", "PROCESSING", "FAILED"}:
        raise ValueError(f"TASK_SM_OPS import batches must be RUNNING+PROCESSING+FAILED, got {ops_import_status}")

    assign_task = next(row for row in tables["tasks"] if row["task_code"] == "TASK_SM_ASSIGN")
    assign_status = {row["status"] for row in tables["assignments"] if row["task_id"] == assign_task["id"]}
    if "UNCLAIMED" not in assign_status:
        raise ValueError("TASK_SM_ASSIGN must include UNCLAIMED assignment")

    v3_version_ids = {row["id"] for row in tables["template_versions"] if row.get("version_no") == 3}
    if v3_version_ids and not any(
        row["template_version_id"] in v3_version_ids for row in tables["template_version_fields"]
    ):
        raise ValueError("template v3 DRAFT must have template_version_fields")

    assignment_by_id = {row["id"]: row for row in tables["assignments"]}
    for submission in tables["submissions"]:
        status = submission["current_status"]
        assignment = assignment_by_id.get(submission["assignment_id"])
        if status == "NEEDS_REVISION":
            if assignment is None or assignment["status"] != "CLAIMED":
                raise ValueError(f"NEEDS_REVISION submission {submission['id']} must have CLAIMED assignment")
            if submission["current_review_level"] != WORKFLOW_LEVELS[0]:
                raise ValueError(f"NEEDS_REVISION submission {submission['id']} must reset review level to L1")
        if status == "HUMAN_REVIEWING":
            level = submission["current_review_level"]
            if level not in WORKFLOW_LEVELS:
                raise ValueError(f"HUMAN_REVIEWING submission {submission['id']} has invalid review level {level}")
        if status in {"AI_PASSED", "AI_REJECTED", "DRAFT"}:
            if submission["current_review_level"] is not None:
                raise ValueError(f"{status} submission {submission['id']} must not have review level")

    tasks_by_id = {row["id"]: row for row in tables["tasks"]}

    def final_review_level_for_task(task_id: int) -> str:
        workflow = tasks_by_id.get(task_id, {}).get("review_workflow_json") or {}
        levels = workflow.get("levels") or []
        if not levels:
            return FINAL_REVIEW_LEVEL
        return levels[-1]["key"]

    for record in tables["review_records"]:
        if record["action"] == "APPROVE" and record["is_final_decision"] == 0:
            if record["to_status"] != "HUMAN_REVIEWING":
                raise ValueError("non-final approve must keep HUMAN_REVIEWING")
            if record["next_review_level"] is None:
                raise ValueError("non-final approve must set next_review_level")
        if record["action"] == "APPROVE" and record["is_final_decision"] == 1:
            if record["to_status"] != "APPROVED":
                raise ValueError("final approve must transition to APPROVED")
            expected_final = final_review_level_for_task(record["task_id"])
            if record["review_level"] != expected_final:
                raise ValueError(
                    f"final approve must occur at final workflow level ({expected_final}), "
                    f"got {record['review_level']} on task {record['task_id']}"
                )

    demo_task_id = task_row["id"]
    approved_final = [
        record
        for record in tables["review_records"]
        if record["task_id"] == demo_task_id
        and record["action"] == "APPROVE"
        and record["is_final_decision"] == 1
    ]
    if len(approved_final) != len(demo_approved):
        raise ValueError("each demo APPROVED submission needs one final workflow-level approve record")

    health_tasks = {row["task_code"]: row for row in tables["tasks"] if row["task_code"].startswith("TASK_HEALTH_")}
    for required_code in ("TASK_HEALTH_SPARSE", "TASK_HEALTH_READY", "TASK_HEALTH_OPTIMIZE"):
        if required_code not in health_tasks:
            raise ValueError(f"missing health demo task {required_code}")

    sparse_template = next(
        row for row in tables["templates"] if row["template_code"] == "TPL_HEALTH_SPARSE"
    )
    ready_template = next(
        row for row in tables["templates"] if row["template_code"] == "TPL_HEALTH_READY"
    )
    sparse_metrics = [
        row
        for row in tables.get("ai_review_prompt_health_metrics", [])
        if row["template_version_id"] == sparse_template["current_template_version_id"]
    ]
    ready_metrics = [
        row
        for row in tables.get("ai_review_prompt_health_metrics", [])
        if row["template_version_id"] == ready_template["current_template_version_id"]
    ]
    if sparse_metrics or ready_metrics:
        raise ValueError("sparse/ready health templates must not have pre-aggregated metrics")

    main_metrics = [
        row
        for row in tables.get("ai_review_prompt_health_metrics", [])
        if row["template_version_id"] == demo_tasks[0]["current_template_version_id"]
    ]
    if len(main_metrics) < 7:
        raise ValueError("main template must have 7-day health metrics trend")
    health_status = {row["health_status"] for row in main_metrics}
    for required in ("HEALTHY", "WARNING", "NEEDS_OPTIMIZATION"):
        if required not in health_status:
            raise ValueError(f"main health metrics missing status {required}")

    suggestion_status = {row["status"] for row in tables.get("ai_review_prompt_suggestions", [])}
    for required in ("PENDING", "ACCEPTED", "DISMISSED", "EXPIRED"):
        if required not in suggestion_status:
            raise ValueError(f"prompt suggestions missing status {required}")

    misalignment_rows = tables.get("ai_review_misalignment_cases", [])
    misalignment_types = {row["misalignment_type"] for row in misalignment_rows}
    if not {"AI_STRICT", "AI_LENIENT", "APPEAL_OVERTURN"}.issubset(misalignment_types):
        raise ValueError("misalignment cases must include AI_STRICT, AI_LENIENT and APPEAL_OVERTURN")
    if len(misalignment_rows) < 20:
        raise ValueError("misalignment cases must be at least 20 for optimizer fuel")

    assist_rows = tables.get("llm_assist_records", [])
    chat_assist = [row for row in assist_rows if row.get("field_code") == "runtime.ai_reference"]
    agent_assist = [row for row in assist_rows if row.get("field_code") == "runtime.ai_structured"]
    if len(chat_assist) < 6 or len(agent_assist) < 6:
        raise ValueError("llm_assist_records must include >=6 chat and >=6 agent rows")

    if not tables.get("ai_review_llm_attempts"):
        raise ValueError("ai_review_llm_attempts must be seeded for observability demo")

    ready_ai_count = sum(
        1
        for row in tables["ai_review_records"]
        if row["task_id"] == health_tasks["TASK_HEALTH_READY"]["id"]
    )
    if ready_ai_count < 30:
        raise ValueError("TASK_HEALTH_READY must have at least 30 AI reviews for aggregation demo")

    sparse_ai_count = sum(
        1
        for row in tables["ai_review_records"]
        if row["task_id"] == health_tasks["TASK_HEALTH_SPARSE"]["id"]
    )
    if sparse_ai_count >= 30:
        raise ValueError("TASK_HEALTH_SPARSE must stay below aggregation threshold")


def render_sql(tables: dict[str, list[dict[str, Any]]], dataset_path: Path, requirements_path: Path) -> str:
    chunks = [
        "-- Generated by scripts/generate_preference_compare_seed.py",
        f"-- Source dataset: {dataset_path}",
        f"-- Requirements: {requirements_path}",
        "SET NAMES utf8mb4;",
        "",
    ]
    for table, columns, json_columns in TABLE_CONFIG:
        chunks.append(f"-- {table}")
        chunks.append(
            insert_sql(
                table,
                columns,
                tables.get(table, []),
                json_columns,
                insert_ignore=table in INSERT_IGNORE_TABLES,
            )
        )
    return "\n".join(chunks).rstrip() + "\n"


def ensure_preference_dataset(dataset_path: Path, requirements_path: Path) -> None:
    """Write bundled fixtures to testdata when JSON is missing."""
    dataset_path.parent.mkdir(parents=True, exist_ok=True)
    if not dataset_path.is_file():
        from preference_compare_fixtures import export_dataset_list

        dataset_path.write_text(
            json.dumps(export_dataset_list(), ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"Wrote dataset from fixtures: {dataset_path}")
    if not requirements_path.is_file():
        raise FileNotFoundError(
            f"preference_compare requirements not found: {requirements_path}. "
            "Add testdata/preference_compare/标注要求.md to the repository."
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--requirements", type=Path, default=DEFAULT_REQUIREMENTS)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    ensure_preference_dataset(args.dataset, args.requirements)
    dataset = json.loads(args.dataset.read_text(encoding="utf-8"))
    requirements_md = args.requirements.read_text(encoding="utf-8")
    tables = build_seed(dataset, requirements_md, args.dataset, args.requirements)
    validate_seed(tables, len(dataset))
    sql = render_sql(tables, args.dataset, args.requirements)
    args.output.write_text(sql, encoding="utf-8")
    print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()
