---
title: 相关文档与截图
---

# 相关文档与截图

> 封包正文：[`submission/RELATED_DOCS.md`](../../../../submission/RELATED_DOCS.md)

## 架构与关键技术

| 文档 | 位置 | 内容 |
| --- | --- | --- |
| 整体架构 | [architecture](../../architecture.md) | 三层边界、前后端通信、关键设计决策 |
| 快速启动 | [quick-start](../../quick-start.md) | 本地最小启动 |
| 部署说明 | [deployment/overview](../../deployment/overview.md) | Docker / 一键交付栈 |
| Agent 服务 | [development/agent/overview](../../development/agent/overview.md) | Python Agent、AI 预审契约 |
| 低代码引擎 | [development/lowcode/intro](../../development/lowcode/intro.md) | Schema 驱动、LLM Agent 标注 |
| 后端架构 | [development/backend/architecture](../../development/backend/architecture.md) | Java 分层、状态机、异步任务 |

## 三角色业务文档

| 角色 | 入口 |
| --- | --- |
| Owner | [business/owner/overview](../../business/owner/overview.md) |
| Labeler | [business/labeler/overview](../../business/labeler/overview.md) |
| Reviewer | [business/reviewer/overview](../../business/reviewer/overview.md) |

## Demo 截图

- **封包索引**：[`submission/SCREENSHOT_INDEX.md`](../../../../submission/SCREENSHOT_INDEX.md)
- **演示录屏截图**：`project-docs/static/img/demo/screenshots/`（三角色业务场景，已嵌入 [业务指南](../../business/owner/overview.md)）
- **自动化冒烟截图**：`project-docs/static/img/generated/`
- **生成方式**：[browser-automation-tutorial](../browser-automation-tutorial.md)（`pnpm smoke:browser`）

已覆盖：Owner 任务/验收/导出/结算/AI 质检、Labeler 市场/任务/工作台、Reviewer 队列/审核池/结果，以及 Dashboard 三角色详情等。

## AI Coding 过程记录

- **IDE 式过程浏览器（Cursor 编辑机样式）**：[AI Coding Record](/contest/ai-coding-record)
- 封包索引：[AI Coding 过程记录](./ai-coding-record.md) · [`submission/AI_CODING_RECORD.md`](../../../../submission/AI_CODING_RECORD.md)
- 原始证据包：`submission/ai-coding-records/`
- 维护指引：[development/ai-coding-record-guide](/development/ai-coding-record-guide) · [仓库文件](../../development/ai-coding-record-guide.md)
