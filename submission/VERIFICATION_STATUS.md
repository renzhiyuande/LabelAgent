# LabelHub Verification Status

本页按赛题第七章“验收标准”和第八章“提交物清单”组织状态，只记录当前可以被仓库证据支持的实现与验证结论，不把“存在代码”自动升级成“最终答辩材料已齐”。

## 当前验证基线（2026-06-10）

- 当前真实业务样本：
  - `submissionId=2062558061695012865`
  - `asyncTaskId=2063817979170803714`
  - `aiReviewId=2063818088977682433`
  - 最终 `status=AI_PASSED`
  - `provider/model=deepseek/deepseek-v4-flash`
- Python Agent live 已通过。
- Backend replay gate 已在本机通过：
  - `DeepseekAiReviewLiveIT` => `Tests run: 3, Failures: 0, Errors: 0, Skipped: 0`
  - 覆盖 `submit -> AsyncTaskWorker -> ai_review_records -> final submission status`
  - 回放样本 `submissionId=910238000011`
- 演示视频成片已纳入 `submission/media/labelhub-demo-final.mp4`（≈6min04s）。

## 对照验收标准

| 验收维度 | 赛题要求 | 当前状态 | 证据入口 | 仍待补证 |
| --- | --- | --- | --- | --- |
| 功能完备性 | Owner 可独立完成“建任务 -> 搭模板 -> 发布 -> 看结果 -> 导出” | 已具备主要页面、控制器、数据表和业务文档 | `submission/REQUIREMENT_MATRIX.md`、`project-docs/docs/business/owner/*` | 公网演示环境；fresh-flow 从任务配置开始的重新演示 |
| 功能完备性 | Labeler 可独立完成“领任务 -> 作答 -> 提交 -> 看打回 -> 修改” | 主链代码与文档已存在 | `project-docs/docs/business/labeler/*`、`SubmissionSubmitLifecycle` | 同上 |
| 功能完备性 | AI Agent 自动预审可正常运行，结果可见、可追溯 | 已有 Agent live、真实业务样本 smoke，且 replay gate 已在本机通过 | `submission/SMOKE_REPORT.md`、`DeepseekAiReviewLiveIT`、`test_ai_review_deepseek_live.py` | fresh-flow 重新演示 |
| 功能完备性 | 多格式导出结构正确，可被下游消费 | 已有导出控制器、导出任务表、业务文档和 submission API 静态件 | `OwnerExportController`、`export_jobs`、`project-docs/docs/business/owner/data-export.md`、`submission/api/*` | 导出示例附件 |
| 工程质量 | 模块边界、测试、README、部署文档 | 已具备模块化后端/前端/Agent、live 测试入口、README 与部署文档 | `RELATED_DOCS.md` | — |
| 产品体验 | 关键路径、视觉一致性、草稿/错误提示、常见分辨率可用 | 已有演示视频、演示截图与浏览器 smoke 截图 | `SCREENSHOT_INDEX.md`、`submission/media/` | 不应宣称已完成完整体验验收 |

## 按能力域的当前状态

| 能力域 | 当前状态 | 已确认事实 | 仍待补证 |
| --- | --- | --- | --- |
| 赛题提交结构 | 已重建 | 本目录已覆盖 README、映射、验证、演示环境、视频、API 文档、smoke、截图索引、相关导航，以及 `submission/api/` 静态件 | 公网演示 URL |
| Owner / Labeler / Reviewer 文档导航 | 已具备 | `project-docs/docs/business/*` 覆盖三角色关键说明页 | — |
| AI 预审代码主链 | 已实现且有业务级实跑证据 | `SubmissionSubmitLifecycle`、`AiReviewOrchestrator`、`PyAgentAiReviewEngine` 均在当前仓库存在；真实链路见 `submission/SMOKE_REPORT.md` | fresh-flow 重新演示 |
| DeepSeek live 连通性 | 已验证到 replay gate | `agent/tests/live/test_ai_review_deepseek_live.py` 已通过；`DeepseekAiReviewLiveIT` 已在当前机器 3/3 通过 | — |
| Reviewer / Owner 可用接口 | 已实现且已做页面级复核 | `ReviewerWorkbenchController`、`OwnerExportController`、`OwnerAppealController` 存在；Owner / Reviewer 页面均已围绕真实 `submissionId=2062558061695012865` 复核 | — |
| 关键数据库表 | 已存在 | `assignments`、`submission_versions`、`submission_status_histories`、`ai_review_records`、`review_records`、`export_jobs`、`task_acceptance_records`、`reward_settlement_*` 已在 `V1__labelhub_init_schema.sql` 中定义 | 仅凭表结构存在不能替代业务级 smoke |
| 项目文档站 | 已验证构建 | `cd project-docs && pnpm build` 于 2026-06-08 构建通过 | 现存 low-code broken anchors 仍是既有遗留 warning |

## 已验证入口

- Python Agent live：
  - `agent/.venv/bin/pytest tests/live/test_ai_review_deepseek_live.py -q`
  - 已记录为 `2 passed`
- Backend live IT：
  - `mvn -pl host-app -am test -Dtest=DeepseekAiReviewLiveIT -Dsurefire.failIfNoSpecifiedTests=false`
  - 当前 replay 版 live IT 已在本机 `3/3` 通过
- Docusaurus 文档站：
  - `cd project-docs && pnpm build`
  - 2026-06-08 本轮构建通过；仍存在 low-code 文档 broken anchor warning，但不阻塞 build

## 不能写成“已最终验收通过”的项

- 公网可访问演示环境（云平台 URL 尚未部署回填）
- 从任务配置开始的 fresh-flow 重新演示记录
- 导出示例附件

## 交付件就绪度

| 交付件类别 | 当前就绪度 | 可直接用于提交的内容 | 仍缺什么 |
| --- | --- | --- | --- |
| 文字说明类 | 高 | `submission/` 下的 README、矩阵、验证状态、演示环境、API 说明、smoke、截图索引、相关导航 | 公网 URL 回填 |
| 代码/迁移证据类 | 高 | 控制器、服务、迁移、live 测试入口均已在仓库存在 | — |
| live 连通性记录 | 高 | Agent live 已通过；Backend replay gate 已在本机通过 | — |
| 业务闭环 smoke 记录 | 高 | `SMOKE_REPORT.md` 已记录真实 `submission_id`、`async_task_id`、`ai_review_id`、状态迁移与 Labeler / Owner / Reviewer / Admin API 复核 | fresh-flow 重新演示 |
| 演示素材类 | 高 | 演示视频成片、`media/screenshots/` 演示帧、浏览器 smoke 截图与索引 | — |
| API 静态附件类 | 高 | `submission/api/` 已包含 `public/internal` OpenAPI、Agent 契约副本与 manifest | 接口如有变更需重新导出；在线 Swagger URL 待部署 |

## 口径说明

- 如果某项只在代码、迁移、控制器或测试入口层面确认存在，应写“已实现”或“已具备证据”，不要写“已完成最终演示验证”。
- **演示视频已完成**（`submission/media/`），与 **公网环境待部署**、**fresh-flow 待补证** 是三个独立维度，不要混写为“视频待补”。
- 如果某项依赖本地运行时数据、密钥或人工演示材料，应明确写成“待补运行时证据”或“待部署后回填”。
