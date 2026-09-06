# LabelHub Contest Requirement Matrix

本页把赛题原文第四章“核心功能需求”、第七章“验收标准”和第八章“提交物清单”与当前仓库中的实现证据、验证状态和提交边界对应起来，便于评审快速核对。

## 评审最短证据路径

1. 先看“当前实现状态”，确认该能力不是空白。
2. 再看“关键仓库证据”，直接跳到代码、迁移、测试或项目文档。
3. 最后看“验证边界”，避免把代码存在误写成真实业务闭环已跑通。

## 当前日期基线

- 本矩阵基于 **2026-06-10** 的仓库状态整理。
- 当前真实业务样本留档为 `submissionId=2062558061695012865`，最终状态 `AI_PASSED`。
- Backend replay gate 已入库到 `DeepseekAiReviewLiveIT`，并在本机复核中 `3/3` 通过，回放样本为 `submissionId=910238000011`。
- 演示视频成片已纳入 `submission/media/labelhub-demo-final.mp4`（≈6min04s）。

## 要求映射

| 赛题要求 | 当前实现状态 | 关键仓库证据 | 验证边界 |
| --- | --- | --- | --- |
| Owner 后台：任务管理、模板搭建、审核配置、导出 | 已具备主要功能入口与说明文档 | `project-docs/docs/business/owner/*`、`frontend/src/features/business`、`backend/host-app/src/main/java/com/labelhub/app/business/OwnerExportController.java` | 公网演示环境待部署 |
| Labeler 工作台：任务广场、领取、作答、草稿、提交 | 已具备主链代码与业务文档 | `project-docs/docs/business/labeler/*`、`backend/host-infra/src/main/java/com/labelhub/infra/business/task/workflow/LabelerClaimExecutor.java`、`backend/host-infra/src/main/java/com/labelhub/infra/business/submission/workflow/SubmissionSubmitLifecycle.java` | fresh-flow 从任务配置开始的重新演示记录仍待补证 |
| Reviewer 工作台：AI 队列、人工审核、多级流转 | 已具备接口、文档页与真实样本页面复核 | `project-docs/docs/business/reviewer/*`、`backend/host-app/src/main/java/com/labelhub/app/business/ReviewerWorkbenchController.java`、`backend/host-infra/src/main/java/com/labelhub/infra/business/review/service/DbReviewerWorkbenchService.java`、`project-docs/static/img/generated/reviewer-ai-queue-verified.png` | — |
| AI 自动预审 Agent：可配置规则、异步审核、结构化输出 | 主链已存在；Agent live、真实样本闭环与本机 replay gate 都已验证 | `backend/host-infra/src/main/java/com/labelhub/infra/business/review/orchestrator/AiReviewOrchestrator.java`、`backend/host-infra/src/main/java/com/labelhub/infra/business/review/engine/PyAgentAiReviewEngine.java`、`agent/tests/live/test_ai_review_deepseek_live.py`、`backend/host-app/src/test/java/com/labelhub/app/review/DeepseekAiReviewLiveIT.java`、`submission/SMOKE_REPORT.md` | fresh-flow 重新演示仍待补证 |
| 多角色人工审核流转与审计可追溯 | 已具备状态迁移与审核记录表结构 | `submission_status_histories`、`review_records`、`ai_review_records` 表位于 `V1__labelhub_init_schema.sql`；Reviewer 相关控制器/服务已存在 | 未替代最终业务走查 |
| 多格式导出：JSON / JSONL / CSV / Excel | 已有导出控制器、导出任务表、相关业务页和 submission API 静态件 | `backend/host-app/src/main/java/com/labelhub/app/business/OwnerExportController.java`、`export_jobs` 表、`project-docs/docs/business/owner/data-export.md`、`submission/api/labelhub-openapi-public.json` | 导出示例附件 |
| 数据验收、申诉、奖励结算 | 已有对应表、页面和控制器/执行器 | `project-docs/docs/business/owner/data-acceptance.md`、`submission-appeal.md`、`reward-settlement.md`、`backend/host-app/src/main/java/com/labelhub/app/business/OwnerAppealController.java` | 不应宣称所有页面都已完成端到端截图验收 |
| API 文档与 README、部署文档 | 已有 README、项目文档站、Knife4j/OpenAPI 入口和 submission 静态件 | `README.md`、`project-docs/docs/quick-start.md`、`project-docs/docs/deployment/overview.md`、`submission/api/*` | 在线 Swagger URL 待部署；若接口变更需重新导出静态件 |

## 第七章验收标准对应

| 验收项 | 当前可支持结论 | 建议评审入口 |
| --- | --- | --- |
| Owner 全流程 | 可证明功能入口、业务文档、控制器与数据结构已具备；演示视频已纳入 | `project-docs/docs/business/owner/*`、`submission/DEMO_VIDEO.md`、`submission/SCREENSHOT_INDEX.md` |
| Labeler 全流程 | 可证明任务广场、领取、作答、提交主链已具备；演示视频已纳入 | `project-docs/docs/business/labeler/*`、`SubmissionSubmitLifecycle`、`submission/DEMO_VIDEO.md` |
| AI Agent 自动预审 | 可证明 Agent live、真实样本链路和本机 replay gate 通过记录都已存在 | `submission/SMOKE_REPORT.md` |
| 多格式导出 | 可证明导出控制器、导出任务表、业务文档和 submission API 静态件已具备 | `project-docs/docs/business/owner/data-export.md`、`OwnerExportController`、`submission/api/*` |
| README / 部署文档 | 已具备 | `README.md`、`project-docs/docs/quick-start.md`、`project-docs/docs/deployment/overview.md` |
| 演示环境 / API 文档 | 本地栈说明与静态 API 附件已具备；公网 URL 待部署回填 | `submission/DEMO_ENVIRONMENT.md`、`submission/API_DOCS.md`、`submission/api/*` |

## 关键验证边界

- 早期阶段性盘点中对多个核心域“未实现/完成度极低”的结论，已不适合作为当前赛题交付口径。
- **演示视频已完成**（`submission/media/`），与 **公网环境待部署**、**fresh-flow 待补证** 是三个独立维度。
- 不要把“AI 预审闭环已跑通”写成“本轮 fresh-flow 也已从任务配置开始重新完整重演”。
- 本矩阵优先服务评审快速核对，不替代 `submission/` 封包正文与附件。
