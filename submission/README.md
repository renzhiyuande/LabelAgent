# LabelHub Contest Submission

本目录是赛题 **第八章「提交物清单」** 的封包正文；文档站索引见 [`project-docs/docs/contest/submission/`](../project-docs/docs/contest/submission/index.md)。

**封包基线：2026-06-10** · 变更明细：[CHANGELOG.md](./CHANGELOG.md)

## 赛题提交物对照（3–6）

| # | 赛题要求 | 本目录入口 | 状态 |
| --- | --- | --- | --- |
| 3 | 演示视频（5–10 分钟，三角色链路） | [DEMO_VIDEO.md](./DEMO_VIDEO.md) · [`media/`](./media/README.md) | ✅ 成片已纳入（≈6min） |
| 4a | 架构图、关键技术、Demo 截图 | [RELATED_DOCS.md](./RELATED_DOCS.md) · [SCREENSHOT_INDEX.md](./SCREENSHOT_INDEX.md) | ✅ 文档站 + 演示/冒烟截图 |
| 4b | AI Coding 过程记录 | [AI_CODING_RECORD.md](./AI_CODING_RECORD.md) | ✅ IDE 浏览器 + 证据包 |
| 5 | 可访问演示环境（云平台） | [DEMO_ENVIRONMENT.md](./DEMO_ENVIRONMENT.md) | ⚠️ 本地栈可用；**公网 URL 待部署回填** |
| 6 | API 文档（Swagger 等） | [API_DOCS.md](./API_DOCS.md) · [api/](./api/README.md) | ⚠️ 静态 OpenAPI 已导出；**在线 URL 待部署回填** |

## 评审最短路径

1. [REQUIREMENT_MATRIX.md](./REQUIREMENT_MATRIX.md) — 功能域映射
2. [VERIFICATION_STATUS.md](./VERIFICATION_STATUS.md) — 实现 vs 验证边界
3. [SMOKE_REPORT.md](./SMOKE_REPORT.md) — 真实 AI 预审样本
4. 上表 3–6 逐项核对附件
5. [CHANGELOG.md](./CHANGELOG.md) — 贡献摘要与 Git 统计

## 截图来源（避免混淆）

| 目录 | 来源 | 用途 |
| --- | --- | --- |
| [`media/screenshots/`](./media/screenshots/) | 演示视频录制工程 | 答辩 Demo 帧、三角色业务场景 |
| [`project-docs/static/img/demo/`](../project-docs/static/img/demo/) | 同上（文档站镜像） | 嵌入业务指南 |
| [`project-docs/static/img/generated/`](../project-docs/static/img/generated/) | Playwright smoke（`pnpm smoke:browser`） | 页面可达性自动化证据 |

索引：[SCREENSHOT_INDEX.md](./SCREENSHOT_INDEX.md) · 复跑教程：[BROWSER_AUTOMATION_TUTORIAL.md](./BROWSER_AUTOMATION_TUTORIAL.md)

## 端口说明

| 场景 | 前端 | 后端 | 说明 |
| --- | --- | --- | --- |
| **交付栈**（视频录制、业务 smoke） | `5174` | `8080` | `pnpm delivery:stack:up` |
| **隔离 smoke / OpenAPI 导出** | `5176` | `8082` | `pnpm smoke:browser`、`pnpm delivery:openapi` |

详见 [DEMO_ENVIRONMENT.md](./DEMO_ENVIRONMENT.md)。

## 辅助材料

| 文件 | 用途 |
| --- | --- |
| [BROWSER_AUTOMATION_TUTORIAL.md](./BROWSER_AUTOMATION_TUTORIAL.md) | Playwright smoke 复跑 |
| [CHANGELOG.md](./CHANGELOG.md) | 封包变更记录 + Git 贡献统计 |
| [api/EXPORT_MANIFEST.md](./api/EXPORT_MANIFEST.md) | OpenAPI SHA256 校验 |

## 封包待办（部署后回填）

- [ ] 公网演示 URL → [DEMO_ENVIRONMENT.md](./DEMO_ENVIRONMENT.md)
- [ ] 在线 Swagger / Knife4j URL → [API_DOCS.md](./API_DOCS.md)
- [ ] 接口变更后 `pnpm delivery:openapi` 并更新 [api/EXPORT_MANIFEST.md](./api/EXPORT_MANIFEST.md)
