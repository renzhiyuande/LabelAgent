# LabelHub AI Coding Process Record

## 1. Objective

This record reconstructs the LabelHub AI coding process from exported Cursor session evidence, not from retrospective free-form narration. The goal is to provide a competition-ready process record that can answer four questions:

1. What was designed, developed, iterated, and maintained?
2. Which prompts are high quality enough to represent the engineering process?
3. Which low-quality traces were intentionally downgraded but still preserved?
4. Which transcript-explicit models can actually be observed from the raw session data?

## 2. Evidence Source

Included projects:

- `label-hub`
- `labelhub-deepseek-review`

Source type:

- Cursor `agent-transcripts/*.jsonl`

Time span:

- `label-hub`: `2026-05-21` to `2026-06-06`
- `labelhub-deepseek-review`: `2026-06-07` to `2026-06-09`

Primary evidence files:

- `raw_session_index.json`
- `cleaned_session_records.json`
- `curated_session_prompts.json`
- `narrative_session_digest.json`
- `low_quality_evidence.json`
- `model_usage_summary.json`
- `stage_module_model_summary.json`

## 3. Processing Method

The export pipeline followed a fixed sequence:

1. Export
   - Read all Cursor transcript sessions.
   - Preserve raw turns, transcript path, tool calls, file references, and timestamps.
2. Clean
   - Keep full raw text in structured JSON.
   - Replace low-quality display text with `[摘要]`.
   - Downgrade console errors, request traces, stack traces, DOM traces, attachment-only context, and vague prompts.
3. Classify
   - Mark engineering stage: `design`, `development`, `iteration`, `maintenance`.
   - Mark business module: for example `系统管理-用户管理`, `标注工作台-我的任务`, `低代码-模板设计器`, `AI审核-预审质检`.
   - Mark observable model bucket from transcript metadata.
4. Aggregate
   - Group by `project -> date -> session`.
   - Build `stage -> module -> model` and reverse `model -> stage -> module` views.
5. Document
   - Write the process record from the cleaned evidence pack, not from memory-only summarization.

## 4. Dataset Statistics

According to `export_summary.json`:

- total sessions: `226`
- curated sessions: `180`
- narrative sessions: `136`
- selected medium/high-signal prompts: `675`
- downgraded low-quality evidence items: `1180`
- sessions with transcript-explicit model metadata: `7`

By project:

- `label-hub`: `178` sessions
- `labelhub-deepseek-review`: `48` sessions

Observable models from transcripts:

- `fast`
- `composer-2.5-fast`

Important limitation:

- these are only the models explicitly recorded inside the transcript payload
- if Cursor did not store the main chat model for a session, that session is grouped as `unknown_transcript_not_recorded`
- the process record does not invent missing model labels

## 5. Stage Reconstruction

### 5.1 Design

The design stage is strongly preserved.

High-confidence design clusters include:

- `文档设计-架构规划`
- `插件架构-扩展点`
- `标注工作台-我的任务`
- `低代码-模板设计器`

Representative design intent visible in the transcripts:

- architecture review of the LabelHub plan
- database and functional document generation
- staged roadmap decomposition
- plugin extensibility discussion
- early workflow design for task claiming and workbench structure

This stage is highly reproducible because prompts frequently reference concrete artifacts such as plan files, design docs, and target output files.

### 5.2 Development

The development stage is the largest body of evidence.

Major module clusters include:

- `系统管理-用户管理`
- `系统管理-权限控制`
- `标注工作台-我的任务`
- `标注工作台-标注执行`
- `低代码-模板设计器`
- `任务管理`
- `数据管理-导入导出`
- `LLM-Agent-Prompt`

Representative development themes:

- system/business table boundary clarification
- user and permission subsystem changes
- task claiming, assignment, and workbench behavior
- low-code schema and template-designer rework
- task import/export and data rendering
- AI assist, provider, and prompt-chain requirements

This stage is reconstructable at subsystem granularity because the retained prompts often include file references, API paths, data constraints, and expected UI behavior.

### 5.3 Iteration

The iteration stage is especially strong in bug-fixing and behavior correction.

Main clusters include:

- `AI审核-预审质检`
- `标注工作台-我的任务`
- `标注工作台-标注执行`
- `系统管理-权限控制`
- `低代码-模板设计器`
- `数据管理-导入导出`

Representative iteration issues:

- request 403 / 404 diagnosis
- owner/admin/reviewer visibility mismatch
- AI review prompt-suggestion page behavior
- task claiming and my-task refresh defects
- workbench cache, draft, and submit-state bugs
- template version and low-code rendering issues

This stage is well supported because low-quality runtime traces were preserved as evidence while the main narrative retained only the human directives that framed those traces as engineering tasks.

### 5.4 Maintenance

The maintenance stage is partially preserved but still usable.

Main clusters include:

- `测试验证-白盒回归`
- `AI审核-预审质检`
- `LLM-Agent-Prompt`
- `种子数据-观测性`
- `审核工作台-审核执行`

Representative maintenance themes:

- validation and testability
- AI scoring stability / explainability discussion
- prompt optimization and feedback loop design
- seed enhancement and observability improvement
- aggregate metric verification

This stage is reproducible at process level, though not every runtime environment detail is available.

## 6. Module-Level Aggregation

The new classification output answers questions such as:

- which `design` sessions relate to `标注工作台-我的任务`
- which `development` sessions relate to `系统管理-用户管理`
- which `iteration` sessions relate to `AI审核-预审质检`
- which transcript-observed model buckets appear in those module groups

The main aggregation files are:

- `stage_module_model_summary.json`
- `stage_module_model_summary.md`

These files provide two views:

1. `stage -> module -> model`
2. `model -> stage -> module`

This makes it possible to present the process in a paper-style structure while still preserving a machine-readable evidence map behind it.

## 7. Prompt Quality Policy

### 7.1 Retained as high-signal evidence

- prompts with explicit engineering objectives
- prompts that reference files, APIs, plans, schema, URLs, or terminal artifacts
- prompts with acceptance constraints or implementation boundaries
- prompts that clearly describe expected behavior or failure context

### 7.2 Downgraded to `[摘要]`

- generic prompts such as `帮我改一个bug`, `继续`, `ok`, `可以`, `修复`
- console errors, request dumps, stack traces, and DOM traces
- pure attachment/meta-context fragments such as image-only or uploaded-document-only transcript blocks

### 7.3 Important preservation rule

Downgraded does not mean deleted.

- cleaned display: `[摘要]`
- structured JSON: raw text preserved

Therefore the final evidence pack is both readable and auditable.

## 8. Model Export Policy

The model export is intentionally conservative.

What is exported:

- transcript-explicit `model` fields found in session payloads
- tool/subagent model invocations such as `Task -> model=fast`
- per-session `models_used`
- global `model_usage_summary.json`

What is not fabricated:

- a main assistant model name when the transcript never stored it

This is why the aggregation contains the bucket `unknown_transcript_not_recorded`. It is not a cleaning failure; it is an honesty constraint.

## 9. DeepSeek Cleaning Status

The script supports optional DeepSeek-assisted low-quality compression:

```bash
python3 scripts/export_cursor_labelhub_sessions.py --deepseek-clean
```

Current status of this export:

- DeepSeek cleaning enabled: `false`
- local DeepSeek API key present: `false`

Therefore the current evidence pack uses local heuristic summaries for low-quality traces while still preserving the complete raw text.

## 10. Reproducibility Assessment

### 10.1 High reproducibility

- architecture and design intent
- roadmap decomposition
- business-module evolution
- major development instructions
- bug-fix and behavior-correction trajectory

### 10.2 Partial reproducibility

- exact local runtime state
- some browser-only visual states
- missing assistant-side reasoning where transcript content is `[REDACTED]`
- sessions whose main chat model was not explicitly recorded by Cursor

### 10.3 Overall judgment

The process is substantially reproducible and suitable for competition submission, but it is not a byte-level replay of every environment state.

## 11. Recommended Submission Set

If a full evidence package can be submitted:

- `README.md`
- `export_summary.json`
- `session_timeline.md`
- `high_quality_prompt_catalog.md`
- `narrative_session_digest.md`
- `low_quality_evidence.md`
- `model_usage_summary.md`
- `stage_module_model_summary.md`
- `AI_CODING_PROCESS_RECORD.md`

If only a compact set is needed:

- `AI_CODING_PROCESS_RECORD.md`
- `stage_module_model_summary.md`
- `narrative_session_digest.md`
- `model_usage_summary.md`

## 12. Conclusion

The exported evidence shows a continuous AI coding process across two project phases:

- early design and architecture planning
- subsystem development and implementation
- iterative debugging and correction
- AI review, prompt, and observability hardening
- late-stage validation and maintenance

The strongest value of this evidence pack is not isolated code generation. It is the continuity of AI-assisted engineering across design, implementation, iteration, maintenance, and prompt/process refinement, with structured transcript evidence supporting each step.
