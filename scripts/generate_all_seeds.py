#!/usr/bin/env python3
"""LabelHub 全量 Seed 编排脚本。

将各数据集 seed 生成器合并为一份或多份 SQL：
- 默认：全部模块 → 单个 labelhub_full_seed.sql
- --split：同时写出各模块独立 SQL + 合并 SQL
- --only：只生成指定模块（可逗号分隔）

模块：
- preference_compare：用户/角色、偏好对比主流程、辅任务、AI 预审质检
- qa_quality：问答质量多媒体标注（依赖 preference_compare 中的 seed 用户）
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

_REPO_ROOT = Path(__file__).resolve().parents[1]
_SCRIPTS_DIR = _REPO_ROOT / "scripts"
_DEFAULT_OUTPUT_DIR = _REPO_ROOT / "backend/host-app/src/test/resources"

if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from generate_preference_compare_seed import (  # noqa: E402
    DEFAULT_DATASET as PREF_DEFAULT_DATASET,
    DEFAULT_OUTPUT as PREF_DEFAULT_OUTPUT,
    DEFAULT_REQUIREMENTS as PREF_DEFAULT_REQUIREMENTS,
    INSERT_IGNORE_TABLES as PREF_INSERT_IGNORE_TABLES,
    TABLE_CONFIG as PREF_TABLE_CONFIG,
    build_seed as build_preference_compare_seed,
    ensure_preference_dataset,
    insert_sql,
    validate_seed as validate_preference_compare_seed,
)
from seed_permission_constants import (  # noqa: E402
    ALL_REVIEWER_LEVEL_PERM_CODES,
    ALL_REVIEWER_LEVEL_PERM_IDS,
    REVIEWER_LEVEL_CODE_BY_ID,
    SEED_ROLE_REVIEWER_L1,
    SEED_ROLE_REVIEWER_L2L3,
)
from generate_qa_quality_seed import (  # noqa: E402
    DEFAULT_DATASET as QA_DEFAULT_DATASET,
    DEFAULT_OUTPUT as QA_DEFAULT_OUTPUT,
    DEFAULT_REQUIREMENTS as QA_DEFAULT_REQUIREMENTS,
    _resolve_dataset as resolve_qa_dataset,
    _resolve_requirements as resolve_qa_requirements,
    build_seed as build_qa_quality_seed,
    validate_seed as validate_qa_quality_seed,
)

SeedTables = dict[str, list[dict[str, Any]]]
BuildResult = tuple[SeedTables, dict[str, Any]]


@dataclass(frozen=True)
class SeedModuleSpec:
    key: str
    label: str
    default_output: Path
    includes_users: bool
    build: Callable[[], BuildResult]


def _load_preference_compare() -> BuildResult:
    dataset_path = PREF_DEFAULT_DATASET if PREF_DEFAULT_DATASET.is_file() else PREF_DEFAULT_DATASET
    requirements_path = (
        PREF_DEFAULT_REQUIREMENTS if PREF_DEFAULT_REQUIREMENTS.is_file() else PREF_DEFAULT_REQUIREMENTS
    )
    ensure_preference_dataset(dataset_path, requirements_path)

    dataset = json.loads(dataset_path.read_text(encoding="utf-8"))
    requirements_md = requirements_path.read_text(encoding="utf-8")
    tables = build_preference_compare_seed(dataset, requirements_md, dataset_path, requirements_path)
    validate_preference_compare_seed(tables, len(dataset))
    meta = {
        "dataset_path": dataset_path,
        "requirements_path": requirements_path,
        "sample_count": len(dataset),
        "task_codes": sorted({row["task_code"] for row in tables.get("tasks", [])}),
    }
    return tables, meta


def _load_qa_quality() -> BuildResult:
    dataset_path = resolve_qa_dataset(QA_DEFAULT_DATASET)
    requirements_path = resolve_qa_requirements(QA_DEFAULT_REQUIREMENTS)
    if not dataset_path.is_file():
        raise FileNotFoundError(f"qa_quality dataset not found: {dataset_path}")
    if not requirements_path.is_file():
        raise FileNotFoundError(f"qa_quality requirements not found: {requirements_path}")

    dataset = json.loads(dataset_path.read_text(encoding="utf-8"))
    requirements_md = requirements_path.read_text(encoding="utf-8")
    tables = build_qa_quality_seed(dataset, requirements_md, dataset_path, requirements_path)
    validate_qa_quality_seed(tables, dataset)
    meta = {
        "dataset_path": dataset_path,
        "requirements_path": requirements_path,
        "sample_count": len(dataset),
        "task_codes": sorted({row["task_code"] for row in tables.get("tasks", [])}),
        "media_types": sorted({sample["media_type"] for sample in dataset}),
    }
    return tables, meta


SEED_MODULES: dict[str, SeedModuleSpec] = {
    "preference_compare": SeedModuleSpec(
        key="preference_compare",
        label="偏好对比全链路 + AI 预审质检",
        default_output=PREF_DEFAULT_OUTPUT,
        includes_users=True,
        build=_load_preference_compare,
    ),
    "qa_quality": SeedModuleSpec(
        key="qa_quality",
        label="问答质量多媒体标注",
        default_output=QA_DEFAULT_OUTPUT,
        includes_users=False,
        build=_load_qa_quality,
    ),
}

ALL_MODULE_KEYS = tuple(SEED_MODULES.keys())


def merge_seed_tables(module_tables: list[tuple[str, SeedTables]]) -> SeedTables:
    merged: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for _, tables in module_tables:
        for table, rows in tables.items():
            merged[table].extend(rows)
    return dict(merged)


def validate_scanned_reviewer_level_codes() -> None:
    """Ensure exported permission manifest includes Flyway-aligned reviewer level codes."""
    manifest_path = _REPO_ROOT / "backend/target/permission-codes/permission-codes.json"
    if not manifest_path.is_file():
        raise ValueError(
            f"missing {manifest_path}; run `mvn -pl host-core process-classes` in backend first"
        )
    payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    scanned = {item["code"] for item in payload.get("permissions", [])}
    missing = sorted(set(ALL_REVIEWER_LEVEL_PERM_CODES) - scanned)
    if missing:
        raise ValueError(f"permission export missing reviewer level codes: {missing}")


def validate_seed_role_permissions(merged: SeedTables) -> None:
    """Ensure seed reviewer roles bind Flyway-aligned reviewer level permission ids."""
    allowed_level_ids = set(ALL_REVIEWER_LEVEL_PERM_IDS)
    for row in merged.get("role_permissions", []):
        perm_id = row.get("permission_id")
        role_id = row.get("role_id")
        if role_id in (SEED_ROLE_REVIEWER_L1, SEED_ROLE_REVIEWER_L2L3) and perm_id in {10010, 10011, 10012}:
            raise ValueError(
                f"seed role {role_id} still references stale assignment permission id {perm_id}; "
                f"use scripts/seed_permission_constants.py (reviewer level ids {sorted(allowed_level_ids)})"
            )
        if role_id in (SEED_ROLE_REVIEWER_L1, SEED_ROLE_REVIEWER_L2L3) and perm_id in allowed_level_ids:
            expected_code = REVIEWER_LEVEL_CODE_BY_ID[perm_id]
            if expected_code not in ALL_REVIEWER_LEVEL_PERM_CODES:
                raise ValueError(f"unknown reviewer level permission id {perm_id} for role {role_id}")


def validate_merged_tables(merged: SeedTables, selected_keys: tuple[str, ...]) -> None:
    for table, rows in merged.items():
        ids = [row["id"] for row in rows if "id" in row]
        if len(ids) != len(set(ids)):
            duplicates = {value for value in ids if ids.count(value) > 1}
            raise ValueError(f"merged {table} contains duplicate ids, e.g. {sorted(duplicates)[:5]}")

    if "preference_compare" in selected_keys:
        validate_scanned_reviewer_level_codes()
        validate_seed_role_permissions(merged)

    if "preference_compare" in selected_keys:
        users = merged.get("users", [])
        if not users:
            raise ValueError("preference_compare module must provide users")

    if "qa_quality" in selected_keys and "preference_compare" not in selected_keys:
        if not merged.get("users"):
            print(
                "WARN: qa_quality seed has no users; import preference_compare seed first "
                "or use --only all / preference_compare,qa_quality"
            )


def render_sql(
    tables: SeedTables,
    *,
    header_lines: list[str],
    table_config: list[tuple[str, list[str], set[str]]] = PREF_TABLE_CONFIG,
    insert_ignore_tables: frozenset[str] = PREF_INSERT_IGNORE_TABLES,
) -> str:
    chunks = header_lines + ["SET NAMES utf8mb4;", ""]
    for table, columns, json_columns in table_config:
        chunks.append(f"-- {table}")
        chunks.append(
            insert_sql(
                table,
                columns,
                tables.get(table, []),
                json_columns,
                insert_ignore=table in insert_ignore_tables,
            )
        )
    return "\n".join(chunks).rstrip() + "\n"


def render_module_sql(module_key: str, tables: SeedTables, meta: dict[str, Any]) -> str:
    spec = SEED_MODULES[module_key]
    header = [
        f"-- Generated by scripts/generate_all_seeds.py (module: {module_key})",
        f"-- Module label: {spec.label}",
        f"-- Dataset: {meta.get('dataset_path')}",
        f"-- Requirements: {meta.get('requirements_path')}",
        f"-- Tasks: {', '.join(meta.get('task_codes', []))}",
    ]
    if meta.get("media_types"):
        header.append(f"-- Media types: {', '.join(meta['media_types'])}")
    return render_sql(tables, header_lines=header)


def render_combined_sql(
    module_results: list[tuple[str, SeedTables, dict[str, Any]]],
    merged: SeedTables,
) -> str:
    header = [
        "-- Generated by scripts/generate_all_seeds.py (combined)",
        "-- Modules:",
    ]
    for module_key, _, meta in module_results:
        spec = SEED_MODULES[module_key]
        header.append(
            f"--   - {module_key}: {spec.label} "
            f"({meta.get('sample_count', '?')} samples, tasks={', '.join(meta.get('task_codes', []))})"
        )
    return render_sql(merged, header_lines=header)


def parse_module_keys(raw: str | None) -> tuple[str, ...]:
    if not raw or raw.strip().lower() in {"all", "*"}:
        return ALL_MODULE_KEYS
    keys = tuple(part.strip() for part in raw.split(",") if part.strip())
    unknown = [key for key in keys if key not in SEED_MODULES]
    if unknown:
        valid = ", ".join(ALL_MODULE_KEYS)
        raise SystemExit(f"unknown module(s): {', '.join(unknown)}; valid: {valid}")
    return keys


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--only",
        default="all",
        help="要生成的模块：all | preference_compare | qa_quality | preference_compare,qa_quality",
    )
    parser.add_argument(
        "--split",
        action="store_true",
        help="除合并 SQL 外，同时写出各模块独立 SQL 文件",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=_DEFAULT_OUTPUT_DIR,
        help="默认输出目录（合并文件与各模块默认文件名）",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="合并 SQL 输出路径（默认 <output-dir>/labelhub_full_seed.sql）",
    )
    return parser.parse_args()


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"Wrote {path}")


def main() -> None:
    args = parse_args()
    selected = parse_module_keys(args.only)
    output_dir = args.output_dir
    combined_output = args.output or (output_dir / "labelhub_full_seed.sql")

    module_results: list[tuple[str, SeedTables, dict[str, Any]]] = []
    for module_key in selected:
        spec = SEED_MODULES[module_key]
        print(f"Building seed module: {module_key} ({spec.label})")
        tables, meta = spec.build()
        module_results.append((module_key, tables, meta))

    merged = merge_seed_tables([(key, tables) for key, tables, _ in module_results])
    validate_merged_tables(merged, selected)

    if len(selected) == 1 and not args.split:
        module_key, tables, meta = module_results[0]
        sql = render_module_sql(module_key, tables, meta)
        out = args.output or SEED_MODULES[module_key].default_output
        write_text(out, sql)
        return

    combined_sql = render_combined_sql(module_results, merged)
    write_text(combined_output, combined_sql)

    if args.split:
        for module_key, tables, meta in module_results:
            module_sql = render_module_sql(module_key, tables, meta)
            write_text(SEED_MODULES[module_key].default_output, module_sql)

    print("Modules included:", ", ".join(selected))
    for module_key, _, meta in module_results:
        print(f"  - {module_key}: tasks={meta.get('task_codes')}, samples={meta.get('sample_count')}")


if __name__ == "__main__":
    main()
