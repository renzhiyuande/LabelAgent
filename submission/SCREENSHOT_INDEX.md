# LabelHub Screenshot Index

Last updated: 2026-06-10

## 截图来源说明

| 目录 | 生成方式 | 用途 |
| --- | --- | --- |
| `submission/media/screenshots/` | 演示视频录制工程 | 答辩 Demo 帧（32 张） |
| `project-docs/static/img/demo/screenshots/` | 同上（文档站镜像） | 嵌入三角色业务指南 |
| `project-docs/static/img/generated/` | `pnpm smoke:browser`（端口 `5176`/`8082`） | 页面可达性自动化证据 |

机器可读索引（smoke 刷新目标）：`project-work/contest-delivery-ops/SCREENSHOT_INDEX.md`

## Generated Screenshots（Playwright smoke）

- `project-docs/static/img/generated/dashboard-home-browser-smoke.png`
  - Browser smoke capture of the modular dashboard homepage on isolated runtime `5176`
- `project-docs/static/img/generated/dashboard-owner-detail-browser-smoke.png`
  - Browser smoke capture of the dedicated Owner analytics detail page
- `project-docs/static/img/generated/dashboard-labeler-detail-browser-smoke.png`
  - Browser smoke capture of the dedicated Labeler analytics detail page
- `project-docs/static/img/generated/dashboard-reviewer-detail-browser-smoke.png`
  - Browser smoke capture of the dedicated Reviewer analytics detail page
- `project-docs/static/img/generated/reviewer-ai-queue-browser-smoke.png`
  - Browser smoke capture of the reviewer AI queue workspace list route
- `project-docs/static/img/generated/owner-acceptances-browser-smoke.png`
  - Browser smoke capture of the Owner data acceptance page
- `project-docs/static/img/generated/owner-appeals-browser-smoke.png`
  - Browser smoke capture of the Owner appeals page after route completion
- `project-docs/static/img/generated/owner-exports-browser-smoke.png`
  - Browser smoke capture of the Owner export page
- `project-docs/static/img/generated/owner-settlements-browser-smoke.png`
  - Browser smoke capture of the Owner settlement page
- `project-docs/static/img/generated/dashboard-home-modular-runtime-5176.png`
  - Modular dashboard homepage on isolated runtime after authenticated Playwright verification
- `project-docs/static/img/generated/dashboard-labeler-detail-runtime-5176.png`
  - Dedicated Labeler statistics detail page with personal output and quality modules
- `project-docs/static/img/generated/dashboard-reviewer-detail-runtime-5176.png`
  - Dedicated Reviewer statistics detail page with review trend and personal/team comparison
- `project-docs/static/img/generated/dashboard-home-modular-runtime-8081.png`
  - Modular dashboard homepage after splitting overview cards from dedicated detail pages
- `project-docs/static/img/generated/dashboard-owner-detail-runtime-8081.png`
  - Dedicated Owner statistics detail page with standalone analytics modules
- `project-docs/static/img/generated/dashboard-home-verified.png`
  - Verified role workspace dashboard homepage
- `project-docs/static/img/generated/owner-ai-review-live.png`
  - Owner AI review page under live UI state
- `project-docs/static/img/generated/owner-ai-review-verified.png`
  - Owner AI review page for verified submission `2062558061695012865`
- `project-docs/static/img/generated/owner-dashboard-home.png`
  - Owner dashboard entry state
- `project-docs/static/img/generated/reviewer-ai-queue-verified.png`
  - Reviewer AI queue page for verified submission `2062558061695012865`
- `project-docs/static/img/generated/contest-delivery-board.png`
  - `localhost:3001` project progress board

## Demo Video Screenshots（2026-06-10）

录制工程截图已拷贝至：

- 封包：`submission/media/screenshots/`（32 张）
- 文档站：`project-docs/static/img/demo/screenshots/`

关键编号帧：

| 文件 | 说明 |
| --- | --- |
| `01-login-page.png` | 登录页 |
| `02-owner-tasks.png` | Owner 任务管理 |
| `03-template-designer.png` | 模板设计器 |
| `04-ai-review-health.png` | AI 质检大屏 |
| `05-labeler-workbench.png` | 标注员工作台 |
| `06-reviewer-ai-queue.png` | Reviewer AI 队列 |
| `07-reviewer-audit-pool.png` | 人工审核池 |

其余按角色命名（`Owner_*`、`Labeler_*`、`Reviewer_*`），见 `submission/media/screenshots/`。

章节过渡卡片：`submission/media/chapter-cards/`、`project-docs/static/img/demo/chapter-cards/`

## Source Of Truth

- 本页（封包评审索引）：`submission/SCREENSHOT_INDEX.md`
- Smoke 机器可读索引：`project-work/contest-delivery-ops/SCREENSHOT_INDEX.md`
- 看板截图索引生成器：`project-work/contest-delivery-ops/board/write-screenshot-index.js`
- 复跑教程：[BROWSER_AUTOMATION_TUTORIAL.md](./BROWSER_AUTOMATION_TUTORIAL.md)
