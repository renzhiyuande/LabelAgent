---
title: AI Coding 过程记录（索引）
---

# AI Coding 过程记录

> 封包正文：[`submission/AI_CODING_RECORD.md`](../../../../submission/AI_CODING_RECORD.md)

## IDE 式过程浏览器（推荐）

完整 **Cursor 编辑机样式** 的过程展陈页（Sessions 树 + 对话流 + 元数据面板）：

👉 **[AI Coding Record 交互页](/contest/ai-coding-record)** · [源码 `ai-coding-record.mdx`](../ai-coding-record.mdx)

该页读取 `project-docs/static/ai-coding-record/` 下的 narrative session 数据，适合答辩时按阶段 / 模块 / 时间线讲述。

## 封包摘要

| 内容 | 路径 |
| --- | --- |
| 过程索引（本页摘要） | [`submission/AI_CODING_RECORD.md`](../../../../submission/AI_CODING_RECORD.md) |
| 原始证据包 | [`submission/ai-coding-records/`](../../../../submission/ai-coding-records/README.md) |
| 维护指引 | [开发维护指引](/development/ai-coding-record-guide) · [仓库文件](../../development/ai-coding-record-guide.md) |

## 开发思路（摘要）

1. **契约先行**：数据库迁移、OpenAPI、Agent YAML、三角色权限码
2. **主链贯通**：Owner 任务/模板 → Labeler 领取提交 → Outbox → AI 预审 → Reviewer 人工池
3. **低代码 + Agent**：Schema 驱动 CRUD；LLM Chat / Agent 结构化参考
4. **交付可审**：`submission/` 封包、文档站、Playwright smoke、演示视频流水线

## 仓库内过程文件

| 路径 | 用途 |
| --- | --- |
| `project-work/contest-delivery-ops/WORKLOG.md` | 迭代工作日志 |
| `project-work/contest-delivery-ops/STATUS.md` | 交付总状态 |
| `project-work/contest-delivery-ops/REACT_LOOP.md` | ReAct 监督迭代说明 |
| `project-work/contest-delivery-ops/AI_PREREVIEW_RUNBOOK.md` | AI 预审 live / smoke 手册 |
| `project-work/contest-delivery-ops/playwright/` | 浏览器 smoke 脚本与报告 |
