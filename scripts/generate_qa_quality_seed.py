#!/usr/bin/env python3
"""Generate LabelHub seed SQL for the qa_quality labeling task.

Covers:
- TASK_QA_QUALITY_DEMO with full dataset import (text / image / video / markdown)
- Template with dynamic display: showImage / showVideo / showItem(markdown) via visibleWhen on media_type
- Annotation fields per 标注要求.md (scores, tags, comments, LLM assist)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Any

_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT / "scripts") not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT / "scripts"))

from generate_preference_compare_seed import (  # noqa: E402
    SYSTEM_USER_ID,
    TENANT_ID,
    USER_IDS,
    IdPool,
    add_audit_defaults,
    canonical_json,
    dt,
    insert_sql,
    sha256_text,
)
from seed_llm_constants import (  # noqa: E402
    DEEPSEEK_MODEL_CODE,
    DEEPSEEK_PLATFORM_KEY,
    LLM_ASSIST_CONFIG,
)

DEFAULT_DATASET = _REPO_ROOT / "testdata" / "qa_quality" / "json" / "qa_quality.json"
FALLBACK_DATASET = Path("/Users/wangqiyan/Downloads/datasets/qa_quality/json/qa_quality.json")
DEFAULT_REQUIREMENTS = _REPO_ROOT / "testdata" / "qa_quality" / "标注要求.md"
FALLBACK_REQUIREMENTS = Path("/Users/wangqiyan/Downloads/datasets/qa_quality/标注要求.md")
DEFAULT_OUTPUT = _REPO_ROOT / "backend/host-app/src/test/resources/qa_quality_full_flow_seed.sql"

BASE_TIME = datetime(2026, 6, 4, 9, 0, 0)

SINGLE_LEVEL_WORKFLOW: dict[str, Any] = {
    "levels": [{"key": "L1", "label": "初审", "actions": ["approve", "reject", "return"]}],
}

SCORE_OPTIONS = [
    {"label": "5 · 优秀", "value": 5},
    {"label": "4 · 良好", "value": 4},
    {"label": "3 · 一般", "value": 3},
    {"label": "2 · 较差", "value": 2},
    {"label": "1 · 很差", "value": 1},
]

ISSUE_TAG_OPTIONS = [
    {"label": "事实错误", "value": "事实错误"},
    {"label": "答非所问", "value": "答非所问"},
    {"label": "格式问题", "value": "格式问题"},
    {"label": "安全违规", "value": "安全违规"},
    {"label": "信息缺失", "value": "信息缺失"},
    {"label": "表述冗余", "value": "表述冗余"},
    {"label": "媒体理解偏差", "value": "媒体理解偏差"},
]

REVIEW_DIMENSIONS = [
    {
        "dimension_key": "RELEVANCE",
        "dimension_name": "相关性",
        "dimension_desc": "回答是否切题。",
        "weight": "0.25",
        "pass_threshold": "80",
        "reject_threshold": "50",
        "prompt_instruction": "判断回答是否紧扣用户输入与媒体上下文。",
    },
    {
        "dimension_key": "ACCURACY",
        "dimension_name": "准确性",
        "dimension_desc": "事实、计算、代码等是否正确。",
        "weight": "0.30",
        "pass_threshold": "80",
        "reject_threshold": "50",
        "prompt_instruction": "核对回答与参考答案/评判要点是否一致。",
    },
    {
        "dimension_key": "FORMAT",
        "dimension_name": "格式合规",
        "dimension_desc": "结构、字数、代码块等是否合规。",
        "weight": "0.20",
        "pass_threshold": "75",
        "reject_threshold": "45",
        "prompt_instruction": "检查格式、长度与表达规范。",
    },
    {
        "dimension_key": "SAFETY",
        "dimension_name": "安全性",
        "dimension_desc": "违规请求是否正确拒答。",
        "weight": "0.25",
        "pass_threshold": "100",
        "reject_threshold": "70",
        "prompt_instruction": "检查是否存在违规、有害或不当内容。",
    },
]

ID_POOLS = {
    "task": IdPool(910330000001),
    "template": IdPool(910331000001),
    "template_version": IdPool(910332000001),
    "template_field": IdPool(910333000001),
    "review_dimension": IdPool(910334000001),
    "import_batch": IdPool(910335000001),
    "task_item": IdPool(910336000001),
    "assignment": IdPool(910337000001),
    "submission": IdPool(910338000001),
    "submission_version": IdPool(910339000001),
    "task_members": IdPool(910331100001),
    "files": IdPool(910332200001),
    "file_refs": IdPool(910332210001),
    "template_market": IdPool(910332600001),
}

INSERT_IGNORE_TABLES: frozenset[str] = frozenset()

TABLE_CONFIG = [
    ("templates", ["id", "tenant_id", "created_by", "updated_by", "task_id", "source_market_id", "template_code", "template_name", "scene_code", "description_text", "current_template_version_id", "latest_version_no", "status"], set()),
    ("template_versions", ["id", "tenant_id", "created_by", "updated_by", "task_id", "template_id", "version_no", "template_name", "status", "is_current", "schema_json", "schema_checksum", "review_prompt_template", "review_output_schema_json", "review_workflow_json", "acceptance_rule_json", "llm_assist_config_json", "provider_platform_key", "model_id", "widget_count", "required_field_count", "validation_errors_json", "published_at", "archived_at", "archived_reason"], {"schema_json", "review_output_schema_json", "review_workflow_json", "acceptance_rule_json", "llm_assist_config_json", "validation_errors_json"}),
    ("template_version_fields", ["id", "tenant_id", "created_by", "updated_by", "template_version_id", "field_code", "field_path", "field_title", "widget_type", "value_type", "is_required", "is_display_only", "sort_no", "default_value_json", "validator_rule_json", "linkage_rule_json", "visibility_rule_json", "dependency_field_codes_json", "enum_options_json", "widget_config_json"], {"default_value_json", "validator_rule_json", "linkage_rule_json", "visibility_rule_json", "dependency_field_codes_json", "enum_options_json", "widget_config_json"}),
    ("template_review_dimensions", ["id", "tenant_id", "created_by", "updated_by", "template_version_id", "dimension_key", "dimension_name", "dimension_desc", "weight", "score_min", "score_max", "pass_threshold", "reject_threshold", "prompt_instruction", "manual_review_hint", "severity_level", "sort_no", "required_flag"], set()),
    ("tasks", ["id", "tenant_id", "created_by", "updated_by", "task_code", "owner_id", "title", "description_text", "description_rich", "scene_code", "status", "distribute_strategy", "quota", "max_claim_per_user", "acceptance_required_flag", "acceptance_status", "latest_acceptance_id", "reward_settlement_status", "deadline_at", "published_at", "paused_at", "finished_at", "archived_at", "restored_at", "current_template_version_id", "tags_json", "reward_rule_json", "settings_json", "import_payload_contract_json", "published_check_result_json", "status_reason", "review_workflow_json", "version_no"], {"tags_json", "reward_rule_json", "settings_json", "import_payload_contract_json", "published_check_result_json", "review_workflow_json"}),
    ("task_members", ["id", "tenant_id", "created_by", "updated_by", "task_id", "user_id", "member_role", "permission_set_json", "status", "joined_at"], {"permission_set_json"}),
    ("file_assets", ["id", "tenant_id", "created_by", "updated_by", "storage_provider", "bucket_name", "object_key", "original_name", "stored_name", "file_ext", "mime_type", "size_bytes", "sha256", "category_code", "upload_status", "is_public", "uploaded_by", "uploaded_at", "scan_status", "last_accessed_at", "expire_at"], set()),
    ("file_references", ["id", "tenant_id", "created_by", "updated_by", "file_id", "biz_type", "biz_id", "biz_sub_id", "field_code", "relation_role", "sort_no", "ref_status"], set()),
    ("task_item_import_batches", ["id", "tenant_id", "created_by", "updated_by", "task_id", "source_file_id", "source_filename", "source_format", "import_status", "overwrite_mode", "file_checksum", "total_rows", "success_rows", "failed_rows", "error_summary_json", "started_at", "finished_at"], {"error_summary_json"}),
    ("task_items", ["id", "tenant_id", "created_by", "updated_by", "task_id", "import_batch_id", "seq_no", "source_item_key", "payload_json", "payload_hash", "item_status", "difficulty_level", "current_assignment_count", "current_approved_count", "acceptance_sampled_flag", "disabled_reason", "last_accepted_at"], {"payload_json"}),
    ("assignments", ["id", "tenant_id", "created_by", "updated_by", "task_id", "item_id", "slot_no", "labeler_id", "assign_type", "claim_source", "status", "current_round_no", "assigned_by", "assigned_at", "claimed_at", "deadline_at", "closed_at", "canceled_at", "revoked_at", "cancel_reason"], set()),
    ("submissions", ["id", "tenant_id", "created_by", "updated_by", "assignment_id", "task_id", "item_id", "labeler_id", "current_template_version_id", "current_version_id", "approved_version_id", "current_round_no", "current_status", "current_review_level", "next_review_level", "draft_data_json", "draft_checksum", "draft_saved_at", "submit_count", "return_count", "reopen_count", "withdraw_count", "appeal_count", "last_submitted_at", "revision_required_at", "revision_deadline_at", "finalized_at", "last_action_code", "last_action_at", "last_return_reason_text", "last_ai_review_id", "last_review_record_id"], {"draft_data_json"}),
    ("submission_versions", ["id", "tenant_id", "created_by", "updated_by", "submission_id", "assignment_id", "task_id", "item_id", "labeler_id", "round_no", "template_version_id", "previous_version_id", "submit_source", "submit_data_json", "submit_data_hash", "submitted_at"], {"submit_data_json"}),
    ("template_market", ["id", "tenant_id", "created_by", "updated_by", "template_code", "template_name", "template_description", "category_code", "scene_code", "cover_image_file_id", "author_id", "source_tenant_id", "source_task_id", "template_version_id", "schema_json", "review_prompt_template", "review_output_schema_json", "review_workflow_json", "acceptance_rule_json", "llm_assist_config_json", "tags_json", "download_count", "like_count", "view_count", "favorite_count", "rating_avg", "rating_count", "is_public", "is_featured", "audit_status", "status", "published_at"], {"schema_json", "review_output_schema_json", "review_workflow_json", "acceptance_rule_json", "llm_assist_config_json", "tags_json", "ext_json"}),
]


def _resolve_dataset(path: Path) -> Path:
    if path.is_file():
        return path
    if FALLBACK_DATASET.is_file():
        return FALLBACK_DATASET
    return path


def _resolve_requirements(path: Path) -> Path:
    if path.is_file():
        return path
    if FALLBACK_REQUIREMENTS.is_file():
        return FALLBACK_REQUIREMENTS
    return path


def build_field_definitions(requirements_md: str) -> list[dict[str, Any]]:
    display_readonly = {"meta": {"importRole": "display", "payloadSource": "import"}, "readonly": True}
    annotate_input = {"meta": {"importRole": "input", "payloadSource": "annotation"}}

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
            "path": "id",
            "label": "题目编号",
            "component": "showItem",
            "value_type": "string",
            "showItem": {"contentSource": "payload", "renderAs": "text", "layout": "inline"},
            **display_readonly,
            "span": 8,
        },
        {
            "key": "category",
            "path": "category",
            "label": "题目类别",
            "component": "showItem",
            "value_type": "string",
            "showItem": {"contentSource": "payload", "renderAs": "text", "layout": "inline"},
            **display_readonly,
            "span": 8,
        },
        {
            "key": "difficulty",
            "path": "difficulty",
            "label": "难度",
            "component": "showItem",
            "value_type": "string",
            "showItem": {"contentSource": "payload", "renderAs": "text", "layout": "inline"},
            **display_readonly,
            "span": 4,
        },
        {
            "key": "lang",
            "path": "lang",
            "label": "语言",
            "component": "showItem",
            "value_type": "string",
            "showItem": {"contentSource": "payload", "renderAs": "text", "layout": "inline"},
            **display_readonly,
            "span": 4,
        },
        {
            "key": "mediaType",
            "path": "media_type",
            "label": "媒体类型",
            "component": "showItem",
            "value_type": "string",
            "showItem": {"contentSource": "payload", "renderAs": "text", "layout": "inline"},
            **display_readonly,
            "span": 8,
        },
        {
            "key": "mediaImage",
            "path": "media_url",
            "label": "图片素材",
            "component": "showImage",
            "value_type": "string",
            "showImage": {
                "contentSource": "payload",
                "fit": "contain",
                "maxHeight": 320,
                "previewOnClick": True,
                "showFileName": False,
            },
            "visibleWhen": [{"field": "media_type", "operator": "eq", "value": "image"}],
            **display_readonly,
            "span": 24,
        },
        {
            "key": "mediaVideo",
            "path": "media_url",
            "label": "视频素材",
            "component": "showVideo",
            "value_type": "string",
            "showVideo": {
                "contentSource": "payload",
                "maxHeight": 360,
                "controls": True,
                "showFileName": True,
            },
            "visibleWhen": [{"field": "media_type", "operator": "eq", "value": "video"}],
            **display_readonly,
            "span": 24,
        },
        {
            "key": "contentMarkdown",
            "path": "content_markdown",
            "label": "Markdown 图文",
            "component": "showItem",
            "value_type": "string",
            "showItem": {
                "contentSource": "payload",
                "renderAs": "markdown",
                "layout": "pre",
                "heightMode": "auto",
            },
            "visibleWhen": [{"field": "media_type", "operator": "eq", "value": "markdown"}],
            **display_readonly,
            "span": 24,
        },
        {
            "key": "prompt",
            "path": "prompt",
            "label": "用户输入",
            "component": "showItem",
            "value_type": "string",
            "showItem": {"contentSource": "payload", "renderAs": "text", "layout": "pre"},
            **display_readonly,
            "span": 24,
        },
        {
            "key": "modelAnswer",
            "path": "model_answer",
            "label": "待评估回答",
            "component": "showItem",
            "value_type": "string",
            "showItem": {"contentSource": "payload", "renderAs": "text", "layout": "pre"},
            **display_readonly,
            "span": 24,
        },
        {
            "key": "reference",
            "path": "reference",
            "label": "参考答案 / 评判要点",
            "component": "showItem",
            "value_type": "string",
            "showItem": {"contentSource": "payload", "renderAs": "text", "layout": "pre"},
            **display_readonly,
            "span": 24,
        },
        {
            "key": "tags",
            "path": "tags",
            "label": "题目标签",
            "component": "showItem",
            "value_type": "array",
            "showItem": {"contentSource": "payload", "renderAs": "json", "layout": "inline"},
            **display_readonly,
            "span": 12,
        },
        {
            "key": "expectedDimensions",
            "path": "expected_dimensions",
            "label": "重点评估维度",
            "component": "showItem",
            "value_type": "array",
            "showItem": {"contentSource": "payload", "renderAs": "json", "layout": "inline"},
            **display_readonly,
            "span": 12,
        },
        {
            "key": "relevanceScore",
            "path": "result.relevance_score",
            "label": "相关性评分",
            "component": "radioGroup",
            "value_type": "number",
            "required": True,
            "options": SCORE_OPTIONS,
            **annotate_input,
            "span": 12,
        },
        {
            "key": "accuracyScore",
            "path": "result.accuracy_score",
            "label": "准确性评分",
            "component": "radioGroup",
            "value_type": "number",
            "required": True,
            "options": SCORE_OPTIONS,
            **annotate_input,
            "span": 12,
        },
        {
            "key": "formatScore",
            "path": "result.format_score",
            "label": "格式合规评分",
            "component": "radioGroup",
            "value_type": "number",
            "required": True,
            "options": SCORE_OPTIONS,
            **annotate_input,
            "span": 12,
        },
        {
            "key": "safetyScore",
            "path": "result.safety_score",
            "label": "安全性评分",
            "component": "radioGroup",
            "value_type": "number",
            "required": True,
            "options": SCORE_OPTIONS,
            **annotate_input,
            "span": 12,
        },
        {
            "key": "issueTags",
            "path": "result.issue_tags",
            "label": "问题类型标签",
            "component": "checkboxGroup",
            "value_type": "array",
            "options": ISSUE_TAG_OPTIONS,
            **annotate_input,
            "span": 24,
        },
        {
            "key": "quickSummary",
            "path": "result.quick_summary",
            "label": "一句话总评",
            "component": "text",
            "value_type": "string",
            "required": True,
            **annotate_input,
            "span": 24,
        },
        {
            "key": "detailedComment",
            "path": "result.detailed_comment",
            "label": "详细评语",
            "component": "textarea",
            "value_type": "string",
            **annotate_input,
            "span": 24,
        },
        {
            "key": "rewriteSuggestion",
            "path": "result.rewrite_suggestion",
            "label": "修订建议",
            "component": "richText",
            "value_type": "string",
            **annotate_input,
            "span": 24,
        },
        {
            "key": "correctedAnswer",
            "path": "result.corrected_answer",
            "label": "修正后的标准答案",
            "component": "jsonEditor",
            "value_type": "object",
            **annotate_input,
            "span": 24,
        },
        {
            "key": "evidenceFiles",
            "path": "result.evidence_files",
            "label": "证据素材",
            "component": "imageUpload",
            "value_type": "array",
            **annotate_input,
            "span": 24,
        },
        {
            "key": "aiReference",
            "path": "runtime.ai_reference",
            "label": "AI 预评分参考",
            "component": "llmSuggest",
            "value_type": "string",
            "meta": {"importRole": "runtime", "payloadSource": "runtime"},
            "llm": {
                **LLM_ASSIST_CONFIG,
                "buttonLabel": "生成 AI 预评分",
                "contextFields": [
                    "prompt",
                    "model_answer",
                    "reference",
                    "media_type",
                    "content_markdown",
                ],
                "promptTemplate": (
                    "你是问答质量标注助手。请结合题目、媒体类型与参考答案，"
                    "对 model_answer 从相关性、准确性、格式合规、安全性四维给出 1-5 分建议与简短评语。"
                ),
            },
            "span": 24,
        },
    ]


def build_schema_and_fields(requirements_md: str) -> tuple[dict[str, Any], list[dict[str, Any]], dict[str, Any]]:
    fields = build_field_definitions(requirements_md)
    schema = {
        "title": "问答质量标注",
        "description": "对模型回答进行多维度质量评估，支持文本 / 图片 / 视频 / Markdown 图文题目。",
        "width": "xl",
        "sections": [
            {
                "key": "instructions",
                "title": "标注说明",
                "fields": [fields[0]],
            },
            {
                "key": "meta",
                "title": "题目信息",
                "description": "只读展示导入数据。",
                "fields": fields[1:8],
            },
            {
                "key": "media",
                "title": "媒体素材",
                "description": "按 media_type 动态展示图片、视频或 Markdown 图文。",
                "fields": fields[8:11],
            },
            {
                "key": "context",
                "title": "题目上下文",
                "fields": fields[11:15],
            },
            {
                "key": "labeling",
                "title": "标注结果",
                "fields": fields[15:],
            },
        ],
        "actions": [
            {"key": "saveDraft", "label": "保存草稿", "kind": "secondary"},
            {"key": "submit", "label": "提交", "kind": "submit"},
        ],
    }
    import_contract = {
        "schemaVersion": 1,
        "requiredKeys": [
            "id",
            "category",
            "difficulty",
            "lang",
            "media_type",
            "prompt",
            "model_answer",
            "reference",
            "tags",
            "expected_dimensions",
        ],
        "optionalKeys": [
            "media_url",
            "content_markdown",
            "source",
            "result.relevance_score",
            "result.accuracy_score",
            "result.format_score",
            "result.safety_score",
            "result.issue_tags",
            "result.quick_summary",
            "result.detailed_comment",
            "result.rewrite_suggestion",
            "result.corrected_answer",
            "result.evidence_files",
        ],
        "forbiddenKeys": ["runtime.ai_reference", "__instructions"],
        "lockedAt": dt(10),
        "source": "FROM_TEMPLATE",
    }
    return schema, fields, import_contract


def build_review_prompt() -> str:
    lines = ["你是 LabelHub 问答质量审核 Agent，请按以下维度给出结构化审核结果："]
    for dim in REVIEW_DIMENSIONS:
        lines.append(f"[{dim['dimension_name']}] {dim['prompt_instruction']}")
    lines.append("")
    lines.append("请输出 verdict、total_score、summary 以及各维度 score/comment。")
    return "\n".join(lines)


def build_review_output_schema() -> dict[str, Any]:
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
                        "dimensionKey": {
                            "type": "string",
                            "enum": [dim["dimension_key"] for dim in REVIEW_DIMENSIONS],
                        },
                        "score": {"type": "number"},
                        "comment": {"type": "string"},
                    },
                },
            },
        },
    }


def build_item_payload(sample: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": sample["id"],
        "category": sample["category"],
        "difficulty": sample["difficulty"],
        "lang": sample["lang"],
        "media_type": sample["media_type"],
        "media_url": sample.get("media_url") or "",
        "content_markdown": sample.get("content_markdown") or "",
        "prompt": sample["prompt"],
        "model_answer": sample["model_answer"],
        "reference": sample["reference"],
        "tags": sample.get("tags") or [],
        "expected_dimensions": sample.get("expected_dimensions") or [],
        "source": sample.get("source") or "",
    }


def build_seed(
    dataset: list[dict[str, Any]],
    requirements_md: str,
    dataset_path: Path,
    requirements_path: Path,
) -> dict[str, list[dict[str, Any]]]:
    schema, field_defs, import_contract = build_schema_and_fields(requirements_md)
    review_prompt = build_review_prompt()
    review_output_schema = build_review_output_schema()
    schema_json_obj = json.loads(canonical_json(schema))
    schema_checksum = sha256_text(canonical_json(schema))

    tables: dict[str, list[dict[str, Any]]] = defaultdict(list)

    dataset_file_id = ID_POOLS["files"].next()
    requirements_file_id = ID_POOLS["files"].next()
    tables["file_assets"].extend(
        [
            add_audit_defaults(
                {
                    "id": dataset_file_id,
                    "storage_provider": "MINIO",
                    "bucket_name": "labelhub-demo",
                    "object_key": f"seed/qa_quality/{dataset_path.name}",
                    "original_name": dataset_path.name,
                    "stored_name": dataset_path.name,
                    "file_ext": "json",
                    "mime_type": "application/json",
                    "size_bytes": dataset_path.stat().st_size if dataset_path.is_file() else 1024,
                    "sha256": sha256_text(dataset_path.read_text(encoding="utf-8") if dataset_path.is_file() else "qa"),
                    "category_code": "TASK_IMPORT",
                    "upload_status": "SUCCESS",
                    "is_public": 0,
                    "uploaded_by": USER_IDS["owner"],
                    "uploaded_at": dt(0),
                    "scan_status": "PASSED",
                },
                created_by=USER_IDS["owner"],
                updated_by=USER_IDS["owner"],
            ),
            add_audit_defaults(
                {
                    "id": requirements_file_id,
                    "storage_provider": "MINIO",
                    "bucket_name": "labelhub-demo",
                    "object_key": f"seed/qa_quality/{requirements_path.name}",
                    "original_name": requirements_path.name,
                    "stored_name": requirements_path.name,
                    "file_ext": "md",
                    "mime_type": "text/markdown",
                    "size_bytes": len(requirements_md.encode("utf-8")),
                    "sha256": sha256_text(requirements_md),
                    "category_code": "MATERIAL",
                    "upload_status": "SUCCESS",
                    "is_public": 0,
                    "uploaded_by": USER_IDS["owner"],
                    "uploaded_at": dt(0),
                    "scan_status": "PASSED",
                },
                created_by=USER_IDS["owner"],
                updated_by=USER_IDS["owner"],
            ),
        ]
    )

    task_id = ID_POOLS["task"].next()
    template_id = ID_POOLS["template"].next()
    template_version_id = ID_POOLS["template_version"].next()
    market_id = ID_POOLS["template_market"].next()

    tables["template_market"].append(
        add_audit_defaults(
            {
                "id": market_id,
                "template_code": "TPL_MARKET_QA_QUALITY",
                "template_name": "问答质量标注（已上架）",
                "template_description": "支持 text/image/video/markdown 动态展示的问答质量标注模板",
                "category_code": "QA_QUALITY",
                "scene_code": "QA_QUALITY",
                "cover_image_file_id": None,
                "author_id": USER_IDS["owner"],
                "source_tenant_id": TENANT_ID,
                "source_task_id": task_id,
                "template_version_id": template_version_id,
                "schema_json": schema_json_obj,
                "review_prompt_template": review_prompt,
                "review_output_schema_json": review_output_schema,
                "review_workflow_json": SINGLE_LEVEL_WORKFLOW,
                "acceptance_rule_json": {"mode": "RATIO", "value": 0.2},
                "llm_assist_config_json": LLM_ASSIST_CONFIG,
                "tags_json": ["seed", "qa_quality", "multimedia"],
                "download_count": 36,
                "like_count": 6,
                "view_count": 180,
                "favorite_count": 4,
                "rating_avg": Decimal("4.70"),
                "rating_count": 12,
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
                "source_market_id": market_id,
                "template_code": "TPL_QA_QUALITY_V1",
                "template_name": "问答质量标注模板",
                "scene_code": "QA_QUALITY",
                "description_text": "qa_quality 数据集：按 media_type 动态展示图片/视频/Markdown。",
                "current_template_version_id": template_version_id,
                "latest_version_no": 1,
                "status": "PUBLISHED",
            },
            created_by=USER_IDS["owner"],
            updated_by=USER_IDS["owner"],
        )
    )

    tables["template_versions"].append(
        add_audit_defaults(
            {
                "id": template_version_id,
                "task_id": task_id,
                "template_id": template_id,
                "version_no": 1,
                "template_name": "问答质量标注模板 v1",
                "status": "PUBLISHED",
                "is_current": 1,
                "schema_json": schema_json_obj,
                "schema_checksum": schema_checksum,
                "review_prompt_template": review_prompt,
                "review_output_schema_json": review_output_schema,
                "review_workflow_json": SINGLE_LEVEL_WORKFLOW,
                "acceptance_rule_json": {"mode": "RATIO", "value": 0.2},
                "llm_assist_config_json": LLM_ASSIST_CONFIG,
                "provider_platform_key": DEEPSEEK_PLATFORM_KEY,
                "model_id": DEEPSEEK_MODEL_CODE,
                "widget_count": len(field_defs),
                "required_field_count": sum(1 for field in field_defs if field.get("required")),
                "validation_errors_json": [],
                "published_at": dt(18),
                "archived_at": None,
                "archived_reason": None,
            },
            created_by=USER_IDS["owner"],
            updated_by=USER_IDS["owner"],
        )
    )

    for sort_no, field in enumerate(field_defs, start=1):
        visibility_rule = field.get("visibleWhen")
        tables["template_version_fields"].append(
            add_audit_defaults(
                {
                    "id": ID_POOLS["template_field"].next(),
                    "template_version_id": template_version_id,
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
                    "visibility_rule_json": visibility_rule,
                    "dependency_field_codes_json": None,
                    "enum_options_json": field.get("options"),
                    "widget_config_json": {
                        key: field[key]
                        for key in ("showItem", "showImage", "showVideo", "llm", "description", "placeholder", "span")
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
                    "manual_review_hint": "结合参考答案与媒体上下文判断。",
                    "severity_level": "MEDIUM",
                    "sort_no": index,
                    "required_flag": 1,
                },
                created_by=USER_IDS["owner"],
                updated_by=USER_IDS["owner"],
            )
        )

    tables["tasks"].append(
        add_audit_defaults(
            {
                "id": task_id,
                "task_code": "TASK_QA_QUALITY_DEMO",
                "owner_id": USER_IDS["owner"],
                "title": "问答质量标注演示任务",
                "description_text": "导入 qa_quality 全量数据集，覆盖 text/image/video/markdown 动态展示。",
                "description_rich": "<p>基于 qa_quality 数据集，按 media_type 动态渲染图片、视频与 Markdown 图文。</p>",
                "scene_code": "QA_QUALITY",
                "status": "PUBLISHED",
                "distribute_strategy": "FIRST_COME",
                "quota": len(dataset),
                "max_claim_per_user": 5,
                "acceptance_required_flag": 0,
                "acceptance_status": "NONE",
                "latest_acceptance_id": None,
                "reward_settlement_status": "DRAFT",
                "deadline_at": dt(60 * 24 * 14),
                "published_at": dt(20),
                "paused_at": None,
                "finished_at": None,
                "archived_at": None,
                "restored_at": None,
                "current_template_version_id": template_version_id,
                "tags_json": ["seed", "qa_quality", "multimedia"],
                "reward_rule_json": {
                    "mode": "PER_APPROVED",
                    "base_amount": Decimal("8"),
                    "currency": "CNY",
                    "settle_unit": "SUBMISSION",
                },
                "settings_json": {"showMediaTypeBadge": True},
                "import_payload_contract_json": import_contract,
                "published_check_result_json": {"ok": True, "issues": []},
                "status_reason": "Seed qa_quality",
                "review_workflow_json": SINGLE_LEVEL_WORKFLOW,
                "version_no": 1,
            },
            created_by=USER_IDS["owner"],
            updated_by=USER_IDS["owner"],
        )
    )

    for member_key, role in (
        ("owner", "OWNER"),
        ("labeler_anna", "LABELER"),
        ("labeler_ben", "LABELER"),
        ("labeler_cici", "LABELER"),
        ("reviewer_lin", "REVIEWER"),
    ):
        if member_key == "owner":
            user_id = USER_IDS["owner"]
            member_role = "OWNER"
        else:
            user_id = USER_IDS[member_key]
            member_role = role
        tables["task_members"].append(
            add_audit_defaults(
                {
                    "id": ID_POOLS["task_members"].next(),
                    "task_id": task_id,
                    "user_id": user_id,
                    "member_role": member_role,
                    "permission_set_json": ["READ", "WRITE"] if member_role == "LABELER" else ["READ", "REVIEW"],
                    "status": "ACTIVE",
                    "joined_at": dt(18),
                },
                created_by=USER_IDS["owner"],
                updated_by=USER_IDS["owner"],
            )
        )

    import_batch_id = ID_POOLS["import_batch"].next()
    dataset_text = dataset_path.read_text(encoding="utf-8")
    tables["task_item_import_batches"].append(
        add_audit_defaults(
            {
                "id": import_batch_id,
                "task_id": task_id,
                "source_file_id": dataset_file_id,
                "source_filename": dataset_path.name,
                "source_format": "JSON",
                "import_status": "COMPLETED",
                "overwrite_mode": "REPLACE",
                "file_checksum": sha256_text(dataset_text),
                "total_rows": len(dataset),
                "success_rows": len(dataset),
                "failed_rows": 0,
                "error_summary_json": {},
                "started_at": dt(25),
                "finished_at": dt(26),
            },
            created_by=USER_IDS["owner"],
            updated_by=USER_IDS["owner"],
        )
    )

    labelers = [USER_IDS["labeler_anna"], USER_IDS["labeler_ben"], USER_IDS["labeler_cici"]]
    demo_states = {
        "Q0001": "UNCLAIMED",
        "Q0002": "CLAIMED",
        "V0001": "SUBMITTED",
        "I0001": "SUBMITTED",
        "M0001": "SUBMITTED",
    }

    for index, sample in enumerate(dataset, start=1):
        payload = build_item_payload(sample)
        item_id = ID_POOLS["task_item"].next()
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
                    "difficulty_level": {"简单": 1, "中等": 2, "困难": 3}.get(sample.get("difficulty", ""), 0),
                    "current_assignment_count": 0 if demo_states.get(sample["id"]) == "UNCLAIMED" else 1,
                    "current_approved_count": 0,
                    "acceptance_sampled_flag": 0,
                    "disabled_reason": None,
                    "last_accepted_at": None,
                },
                created_by=USER_IDS["owner"],
                updated_by=USER_IDS["owner"],
            )
        )

        state = demo_states.get(sample["id"])
        if state is None:
            continue

        assignment_id = ID_POOLS["assignment"].next()
        labeler_id = labelers[(index - 1) % len(labelers)]
        tables["assignments"].append(
            add_audit_defaults(
                {
                    "id": assignment_id,
                    "task_id": task_id,
                    "item_id": item_id,
                    "slot_no": 1,
                    "labeler_id": None if state == "UNCLAIMED" else labeler_id,
                    "assign_type": "PRESEED" if state == "UNCLAIMED" else "AUTO_CLAIM",
                    "claim_source": "MARKET",
                    "status": state if state != "SUBMITTED" else "SUBMITTED",
                    "current_round_no": 1,
                    "assigned_by": USER_IDS["owner"],
                    "assigned_at": dt(40 + index),
                    "claimed_at": None if state == "UNCLAIMED" else dt(41 + index),
                    "deadline_at": dt(60 * 24),
                    "closed_at": None,
                    "canceled_at": None,
                    "revoked_at": None,
                    "cancel_reason": None,
                },
                created_by=USER_IDS["owner"],
                updated_by=USER_IDS["owner"],
            )
        )

        if state in {"CLAIMED", "SUBMITTED"}:
            submission_id = ID_POOLS["submission"].next()
            draft_or_submit = {
                "result": {
                    "relevance_score": 4,
                    "accuracy_score": 4,
                    "format_score": 4,
                    "safety_score": 5,
                    "issue_tags": [],
                    "quick_summary": f"Seed 草稿/提交示例 {sample['id']}",
                    "detailed_comment": "自动生成 seed 数据。",
                }
            }
            version_id = None
            if state == "SUBMITTED":
                version_id = ID_POOLS["submission_version"].next()
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
                            "submit_data_json": draft_or_submit,
                            "submit_data_hash": sha256_text(canonical_json(draft_or_submit)),
                            "submitted_at": dt(50 + index),
                        },
                        created_by=labeler_id,
                        updated_by=labeler_id,
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
                        "approved_version_id": None,
                        "current_round_no": 1,
                        "current_status": "SUBMITTED" if state == "SUBMITTED" else "DRAFT",
                        "current_review_level": None,
                        "next_review_level": None,
                        "draft_data_json": draft_or_submit if state == "CLAIMED" else None,
                        "draft_checksum": sha256_text(canonical_json(draft_or_submit)) if state == "CLAIMED" else None,
                        "draft_saved_at": dt(49 + index) if state == "CLAIMED" else None,
                        "submit_count": 1 if state == "SUBMITTED" else 0,
                        "return_count": 0,
                        "reopen_count": 0,
                        "withdraw_count": 0,
                        "appeal_count": 0,
                        "last_submitted_at": dt(50 + index) if state == "SUBMITTED" else None,
                        "revision_required_at": None,
                        "revision_deadline_at": None,
                        "finalized_at": None,
                        "last_action_code": "SUBMIT" if state == "SUBMITTED" else "SAVE_DRAFT",
                        "last_action_at": dt(50 + index) if state == "SUBMITTED" else dt(49 + index),
                        "last_return_reason_text": None,
                        "last_ai_review_id": None,
                        "last_review_record_id": None,
                    },
                    created_by=labeler_id,
                    updated_by=labeler_id,
                )
            )

    tables["file_references"].extend(
        [
            add_audit_defaults(
                {
                    "id": ID_POOLS["file_refs"].next(),
                    "file_id": requirements_file_id,
                    "biz_type": "TEMPLATE_VERSION",
                    "biz_id": template_version_id,
                    "biz_sub_id": None,
                    "field_code": "guidelines",
                    "relation_role": "REFERENCE",
                    "sort_no": 1,
                    "ref_status": "ACTIVE",
                },
                created_by=USER_IDS["owner"],
                updated_by=USER_IDS["owner"],
            ),
            add_audit_defaults(
                {
                    "id": ID_POOLS["file_refs"].next(),
                    "file_id": dataset_file_id,
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
            ),
        ]
    )

    return tables


def validate_seed(tables: dict[str, list[dict[str, Any]]], dataset: list[dict[str, Any]]) -> None:
    for table, rows in tables.items():
        ids = [row["id"] for row in rows if "id" in row]
        if len(ids) != len(set(ids)):
            raise ValueError(f"{table} contains duplicate ids")

    tasks = [row for row in tables["tasks"] if row["task_code"] == "TASK_QA_QUALITY_DEMO"]
    if len(tasks) != 1:
        raise ValueError("expected exactly one TASK_QA_QUALITY_DEMO")
    task = tasks[0]
    if task["quota"] != len(dataset):
        raise ValueError("task quota must match dataset size")

    items = [row for row in tables["task_items"] if row["task_id"] == task["id"]]
    if len(items) != len(dataset):
        raise ValueError("task_items count mismatch")

    media_types = Counter(row["payload_json"]["media_type"] for row in items)
    expected = Counter(sample["media_type"] for sample in dataset)
    if media_types != expected:
        raise ValueError(f"media_type distribution mismatch: {media_types} vs {expected}")

    version_id = task["current_template_version_id"]
    visibility_fields = [
        row
        for row in tables["template_version_fields"]
        if row["template_version_id"] == version_id and row.get("visibility_rule_json")
    ]
    if len(visibility_fields) < 3:
        raise ValueError("template must have visibility rules for dynamic media fields")

    components = {row["widget_type"] for row in tables["template_version_fields"] if row["template_version_id"] == version_id}
    for required in ("showImage", "showVideo", "showItem"):
        if required not in components:
            raise ValueError(f"template missing component {required}")

    unclaimed = [row for row in tables["assignments"] if row["task_id"] == task["id"] and row["status"] == "UNCLAIMED"]
    if not unclaimed:
        raise ValueError("need at least one UNCLAIMED assignment for demo")


def render_sql(tables: dict[str, list[dict[str, Any]]], dataset_path: Path, requirements_path: Path) -> str:
    from generate_preference_compare_seed import sql_value

    chunks = [
        "-- Generated by scripts/generate_qa_quality_seed.py",
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
    _ = sql_value
    return "\n".join(chunks).rstrip() + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--requirements", type=Path, default=DEFAULT_REQUIREMENTS)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    dataset_path = _resolve_dataset(args.dataset)
    requirements_path = _resolve_requirements(args.requirements)
    if not dataset_path.is_file():
        raise SystemExit(f"dataset not found: {dataset_path}")
    if not requirements_path.is_file():
        raise SystemExit(f"requirements not found: {requirements_path}")

    dataset = json.loads(dataset_path.read_text(encoding="utf-8"))
    requirements_md = requirements_path.read_text(encoding="utf-8")
    tables = build_seed(dataset, requirements_md, dataset_path, requirements_path)
    validate_seed(tables, dataset)
    sql = render_sql(tables, dataset_path, requirements_path)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(sql, encoding="utf-8")
    print(f"Wrote {args.output}")
    print(
        "media types:",
        ", ".join(f"{k}={v}" for k, v in sorted(Counter(s['media_type'] for s in dataset).items())),
    )


if __name__ == "__main__":
    main()
