---
title: 验证状态
---

# 验证状态

本页只陈述当前能被仓库和已记录结果支持的状态，避免把“代码存在”误写成“最终业务验收完成”。

> 封包正文：[`submission/VERIFICATION_STATUS.md`](../../../submission/VERIFICATION_STATUS.md)

## 当前验证时间点

- 本页状态基线：**2026-06-10**
- 已留档真实业务样本：
  - `submissionId=2062558061695012865`
  - `asyncTaskId=2063817979170803714`
  - `aiReviewId=2063818088977682433`
  - 最终 `status=AI_PASSED`
- 本机 replay gate 已通过：
  - `DeepseekAiReviewLiveIT` => `Tests run: 3, Failures: 0, Errors: 0, Skipped: 0`
  - 回放样本 `submissionId=910238000011`
- 演示视频成片已纳入 `submission/media/labelhub-demo-final.mp4`（≈6min04s）

## 对照验收标准

| 验收维度 | 当前状态 | 当前可引用证据 | 仍待补 |
| --- | --- | --- | --- |
| Owner 全流程 | 已具备主要页面、控制器、数据表和业务文档；演示视频已纳入 | `submission/REQUIREMENT_MATRIX.md`、Owner 文档页、`submission/DEMO_VIDEO.md` | 公网演示环境；fresh-flow 重新演示 |
| Labeler 全流程 | 已具备任务广场、领取、作答、提交主链代码与文档 | Labeler 文档页、`SubmissionSubmitLifecycle` | 同上 |
| AI 自动预审 | 已有 Agent live、真实业务样本 smoke 和本机 replay gate 通过记录 | `submission/SMOKE_REPORT.md`、Surefire 报告 | fresh-flow 重新演示 |
| 多格式导出 | 已有导出控制器、表结构、文档页与 API 静态件 | `OwnerExportController`、`export_jobs`、Owner 导出文档、`submission/api/*` | 导出示例附件 |
| README / 部署文档 | 已具备 | 根目录 README、快速启动、部署说明 | 无 |
| 产品体验材料 | 已有演示视频、演示截图与浏览器 smoke 截图 | `submission/SCREENSHOT_INDEX.md`、`submission/media/` | 不应宣称已完成完整体验验收 |

## 已可确认

- DeepSeek Python Agent live 测试已通过。
- DeepSeek Backend replay gate 已在当前机器上通过，覆盖 `submit -> AsyncTaskWorker -> ai_review_records -> final submission status`。
- 真实业务样本 `submissionId=2062558061695012865` 已形成 `AI_REVIEWING -> AI_PASSED` 留档。
- Owner / Reviewer 页面已围绕该样本完成结果可见性复核。
- 演示视频成片已纳入封包 `submission/media/`。

## 仍待补

- 公网可访问演示环境（云平台 URL 待部署回填）
- 从任务配置开始的 fresh-flow 重新演示记录
- 导出示例附件

## 对外口径要求

- 代码级证据写“已实现”。
- live 测试通过写“已验证连通性”。
- **演示视频已完成** 与 **公网环境待部署**、**fresh-flow 待补证** 是三个独立维度，不要混写。

## 提交物成熟度

| 类别 | 当前成熟度 | 说明 |
| --- | --- | --- |
| 文字说明与矩阵 | 高 | 已可直接作为 submission 文字材料 |
| 代码/迁移证据 | 高 | 当前仓库已能定位主要控制器、服务、迁移和 live 测试入口 |
| live 连通性记录 | 高 | Agent live 已通过；Backend replay gate 已在本机 3/3 通过 |
| 业务 smoke | 高 | 已有真实 `submission_id`、`async_task_id`、`ai_review_id` 证据链 |
| 演示素材 | 高 | 视频成片 + 演示截图 + smoke 截图已齐 |
| API 静态件 | 高 | OpenAPI 已导出；在线 Swagger URL 待部署 |
