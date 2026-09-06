# LabelHub AI Coding 过程记录

本页记录赛题要求的 **「AI Coding 过程记录（开发思路、过程文件）」**。

> 在 GitHub / IDE 中阅读时，请用下方 **仓库路径** 链接跳转；`/contest/...` 形式仅在文档站运行时有效（`cd project-docs && pnpm start`）。

## 文档导航

| 内容 | 仓库路径（封包 / 源码） | 文档站 URL（本地预览） |
| --- | --- | --- |
| **IDE 交互页（Cursor 三栏浏览器）** | [`project-docs/docs/contest/ai-coding-record.mdx`](../project-docs/docs/contest/ai-coding-record.mdx) | http://localhost:3000/contest/ai-coding-record |
| **维护指引** | [`project-docs/docs/development/ai-coding-record-guide.md`](../project-docs/docs/development/ai-coding-record-guide.md) | http://localhost:3000/development/ai-coding-record-guide |
| **文档站索引页** | [`project-docs/docs/contest/submission/ai-coding-record.md`](../project-docs/docs/contest/submission/ai-coding-record.md) | http://localhost:3000/contest/submission/ai-coding-record |
| **原始证据包** | [`submission/ai-coding-records/README.md`](./ai-coding-records/README.md) | — |
| **静态 narrative 数据** | `project-docs/static/ai-coding-record/` | 由 IDE 页加载 |
| **React 组件** | `project-docs/src/components/AiCodingRecordDashboard.tsx` | — |

### 本地打开 IDE 页

```bash
cd project-docs && pnpm start
# 浏览器访问：http://localhost:3000/contest/ai-coding-record
```

侧边栏：**🏁 赛题交付 → AI Coding Record**

## IDE 式过程浏览器（推荐）

文档站提供 **Cursor 编辑机样式** 的交互展陈页，含 Sessions 树、对话流与元数据面板。数据源为 `project-docs/static/ai-coding-record/`（由 `submission/ai-coding-records/` 导出）。

更新流程见维护指引 [`ai-coding-record-guide.md`](../project-docs/docs/development/ai-coding-record-guide.md)（核心脚本：`scripts/export_cursor_labelhub_sessions.py`）。

## 开发思路（摘要）

1. **契约先行**：数据库迁移、OpenAPI、`pyagent-ai-review` YAML、三角色权限码
2. **主链贯通**：Owner 任务/模板 → Labeler 领取提交 → Outbox 异步 → AI 预审 → Reviewer 人工池
3. **低代码 + Agent**：Schema 驱动 CRUD；标注侧 LLM Chat / Agent 结构化参考
4. **交付可审**：`submission/` 封包、`project-docs` 文档站、Playwright smoke、演示视频流水线

## 仓库内过程文件

| 路径 | 用途 |
| --- | --- |
| `project-work/contest-delivery-ops/WORKLOG.md` | 迭代工作日志 |
| `project-work/contest-delivery-ops/STATUS.md` | 交付总状态 |
| `project-work/contest-delivery-ops/REACT_LOOP.md` | ReAct 监督迭代说明 |
| `project-work/contest-delivery-ops/AI_PREREVIEW_RUNBOOK.md` | AI 预审 live / smoke 手册 |
| `project-work/contest-delivery-ops/playwright/` | 浏览器 smoke 脚本与报告 |
| `project-work/contest-delivery-ops/board/` | 本地交付看板（`:3001`） |
| `project-work/contest-delivery-ops/*_STATUS.md` | 各专题切片状态 |
| `project-work/*/orchestration/` | 专题编排与 assessment |
| `project-work/multi-agent-automation-testing/` | 自动化测试架构与用例 |

## 可复核证据入口

- [`SMOKE_REPORT.md`](./SMOKE_REPORT.md) — 真实 AI 预审业务样本
- [`VERIFICATION_STATUS.md`](./VERIFICATION_STATUS.md) — 实现 vs 验证边界
- `agent/tests/live/test_ai_review_deepseek_live.py`
- `backend/host-app/src/test/java/com/labelhub/app/review/DeepseekAiReviewLiveIT.java`
