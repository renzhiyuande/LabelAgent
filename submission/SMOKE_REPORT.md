# LabelHub Smoke Report

Last updated: 2026-06-10

## Real AI Prereview Smoke

- Runtime date: 2026-06-08
- Backend: `http://127.0.0.1:8080`（交付栈）
- Agent: `http://127.0.0.1:8000`
- Frontend: `http://127.0.0.1:5174` during the verified browser run on 2026-06-08
- Role used for submit: `admin` runtime account with Labeler / Owner / Reviewer / Admin capabilities

> **账号说明**：本 smoke 使用 `admin` 多角色账号提交样本。答辩演示与视频录制推荐使用 seed 账号（`seed_owner` / `seed_labeler_ben` / `seed_reviewer_lin`，密码 `admin123`），见 [DEMO_ENVIRONMENT.md](./DEMO_ENVIRONMENT.md)。

## Evidence Chain

- Assignment: `910237000012`
- Submission: `2062558061695012865`
- Async task: `2063817979170803714`
- AI review record: `2063818088977682433`
- Final submission status: `AI_PASSED`
- Provider / model: `deepseek` / `deepseek-v4-flash`
- AI analyzed at: `2026-06-08T02:59:10.955Z`

## Verified Views

- Labeler API:
  - `GET /api/v1/labeler/submissions/history/2062558061695012865`
  - `GET /api/v1/labeler/submissions/2062558061695012865/ai-review`
- Owner API:
  - `GET /api/v1/owner/submissions/2062558061695012865/ai-review`
- Reviewer API:
  - `GET /api/v1/reviewer/ai-queue/2062558061695012865`
- Admin ops API:
  - `GET /api/v1/admin/async-tasks?page=1&pageSize=10`
- Owner page:
  - `/owner/ai-review/2062558061695012865`
- Reviewer page:
  - `/reviewer/ai-queue/2062558061695012865?status=passed`
  - Screenshot: `project-docs/static/img/generated/reviewer-ai-queue-verified.png`

## Result Summary

- State transition observed:
  - `DRAFT -> SUBMITTED -> AI_REVIEWING -> AI_PASSED`
- AI verdict:
  - `PASS`
- Total score:
  - `100`
- Dimension records returned:
  - `准确性`
  - `完整性`
  - `相关性`
  - `可读性`
  - `安全性`

## 与封包其他材料的关系

| 材料 | 状态 | 入口 |
| --- | --- | --- |
| 演示视频 | ✅ 已纳入 `submission/media/` | [DEMO_VIDEO.md](./DEMO_VIDEO.md) |
| 浏览器 smoke 教程 | ✅ 已文档化 | [BROWSER_AUTOMATION_TUTORIAL.md](./BROWSER_AUTOMATION_TUTORIAL.md) |
| 公网演示环境 | ⏳ 待部署回填 | [DEMO_ENVIRONMENT.md](./DEMO_ENVIRONMENT.md) |
| fresh-flow 重新演示 | ⏳ 运行时补强项 | [VERIFICATION_STATUS.md](./VERIFICATION_STATUS.md) |

## Historical Defect Note

- During the original smoke run, the backend submit validator exposed a checkbox-group array validation defect.
- That defect has since been fixed on the main integration branch by commit `78ef99be fix: accept checkbox-group arrays in form schema validation`.
- Therefore the defect is retained here only as historical trace, not as a current release blocker.
