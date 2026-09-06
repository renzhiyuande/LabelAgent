# LabelHub AI Coding Evidence Pack

This directory contains the exported, cleaned, and structured Cursor session evidence used to reconstruct the LabelHub AI coding process.

## Navigation（封包入口）

| 文档 | 路径 |
| --- | --- |
| 封包索引 | [`submission/AI_CODING_RECORD.md`](../AI_CODING_RECORD.md) |
| IDE 交互页源码 | [`project-docs/docs/contest/ai-coding-record.mdx`](../../project-docs/docs/contest/ai-coding-record.mdx) |
| 维护指引 | [`project-docs/docs/development/ai-coding-record-guide.md`](../../project-docs/docs/development/ai-coding-record-guide.md) |
| 文档站静态数据 | `project-docs/static/ai-coding-record/` |

本地预览 IDE 页：`cd project-docs && pnpm start` → http://localhost:3000/contest/ai-coding-record

## Source Scope

- Projects:
  - `label-hub`
  - `labelhub-deepseek-review`
- Source type: Cursor `agent-transcripts/*.jsonl`
- Time span:
  - `label-hub`: `2026-05-21` to `2026-06-06`
  - `labelhub-deepseek-review`: `2026-06-07` to `2026-06-09`

## Processing Pipeline

1. Export all transcript sessions and preserve full turns, session id, tool calls, file references, and transcript path.
2. Clean prompts with a two-track policy:
   - keep full raw text in JSON
   - replace low-quality display text with `[摘要]`
3. Aggregate by `project -> date -> session -> time_bucket`.
4. Produce a paper-style process record from the cleaned evidence, not from memory-only summarization.

## Artifact Index

- `export_summary.json`
  - Final counts for sessions, curated sessions, narrative sessions, prompts, and low-quality evidence.
- `raw_session_index.json`
  - Full session-level structured export with all turns.
- `cleaned_session_records.json`
  - Same session corpus with cleaned display fields and low-quality summaries.
- `structured_sessions/`
  - Per-session JSON split by `project/date/session_id`.
- `grouped_timeline.json`
  - Aggregation by project and date.
- `session_timeline.md`
  - Human-readable timeline by project and day.
- `curated_session_prompts.json`
  - Sessions that contain medium/high-signal prompts.
- `high_quality_prompt_catalog.md`
  - Human-readable catalog of curated prompts.
- `narrative_session_digest.json`
  - High-quality directive-only narrative sessions for reporting.
- `narrative_session_digest.md`
  - Human-readable narrative digest.
- `low_quality_evidence.json`
  - Downgraded prompts, logs, request traces, DOM traces, and stacks.
- `low_quality_evidence.md`
  - Human-readable low-quality evidence catalog.
- `model_usage_summary.json`
  - Transcript-explicit model usage summary.
- `model_usage_summary.md`
  - Human-readable model usage summary.
- `stage_module_model_summary.json`
  - Aggregation by `stage -> module -> model` and reverse `model -> stage -> module`.
- `stage_module_model_summary.md`
  - Human-readable classification view such as `设计 / 开发 / 迭代 / 维护` and `系统管理-用户管理`, `标注工作台-我的任务`.
- `AI_CODING_PROCESS_RECORD.md`
  - Final paper-style AI coding process record.

## Cleaning Policy

Retained in the main narrative:

- prompts with explicit goals, constraints, acceptance criteria, or artifact references
- multi-turn sessions containing several meaningful engineering instructions
- design, development, iteration, and maintenance prompts that can support process reconstruction

Downgraded to `[摘要]` in cleaned displays:

- generic prompts such as `帮我改一个bug`, `继续`, `ok`, `可以`, `修复`
- console errors, HTTP/request traces, terminal logs, stack traces, DOM traces
- pure attachment/meta-context fragments such as image-only transcript blocks

Important: downgraded items are hidden in the cleaned display, but their full original text is still preserved in JSON for reproducibility.

## Classification Dimensions

The cleaned exports now include explicit classification for:

- stage: `design`, `development`, `iteration`, `maintenance`
- module: for example `系统管理-用户管理`, `标注工作台-我的任务`, `低代码-模板设计器`, `AI审核-预审质检`
- model bucket:
  - transcript-observed models such as `fast`, `composer-2.5-fast`
  - `unknown_transcript_not_recorded` when Cursor did not store a model field for that session

## DeepSeek Cleaning

The export script supports optional DeepSeek-assisted compression of low-quality logs:

```bash
python3 scripts/export_cursor_labelhub_sessions.py --deepseek-clean
```

In the current export, DeepSeek enhancement was not executed because no API key was present locally. The local heuristic fallback remained active, and long low-quality turns were still preserved in full raw form.

## Reproducibility

This evidence pack is sufficient to reconstruct the main design, implementation, debugging, and maintenance trajectory. It is not a perfect replay of every local runtime state, but it is strong enough to support a competition-style AI coding process submission with explicit evidence boundaries.
