---
title: AI Coding Record Guide
description: 如何更新、复现和维护 LabelHub 的 AI Coding 过程记录网页与文档。
---

# AI Coding Record Guide

这份指引说明如何持续维护 `project-docs` 中的 AI Coding Record 页面与配套文档。

## 相关入口

| 文档 | 路径 |
| --- | --- |
| 封包索引 | [`submission/AI_CODING_RECORD.md`](../../../submission/AI_CODING_RECORD.md) |
| 证据包 | [`submission/ai-coding-records/README.md`](../../../submission/ai-coding-records/README.md) |
| IDE 交互页 | [`contest/ai-coding-record.mdx`](../contest/ai-coding-record.mdx)（本地：http://localhost:3000/contest/ai-coding-record） |

## 目标定义

当前目标不是单纯“整理聊天记录”，而是构建一个完整交付物：

- 清洗 Cursor session 中的低质量提示词与日志片段
- 保留指导 AI 开发、审查、纠偏的高质量 prompt
- 按 `时间 -> 系统基建 / 业务开发 -> stage[] -> module[] -> model` 聚合
- 生成网页展示与文档说明

## 生成入口

核心脚本：

- `/scripts/export_cursor_labelhub_sessions.py`

执行：

```bash
python3 scripts/export_cursor_labelhub_sessions.py
```

可选 DeepSeek 清洗：

```bash
python3 scripts/export_cursor_labelhub_sessions.py --deepseek-clean
```

## 输出位置

原始与清洗后的主输出：

- `submission/ai-coding-records/`

供文档站使用的静态数据：

- `project-docs/static/ai-coding-record/`

网页入口：

- 文档站：`/contest/ai-coding-record`（`cd project-docs && pnpm start`）
- 封包导航：[`submission/AI_CODING_RECORD.md`](../../../submission/AI_CODING_RECORD.md)

## 清洗策略

保留：

- 明确指导 AI 进行设计、实现、约束、优化、审查、最小化修复的提示词
- 带文件路径、接口、字段、数据结构、运行约束的工程型提示词
- AI 输出不对之后，人给出的纠偏型指导意见

降级：

- `这个不对`、`怎么会这样`、`继续`、`ok` 等低信号提示词
- 纯日志、纯堆栈、纯请求报错、纯 DOM 片段
- 只有附件/图片/上传文档的上下文注入内容

## 分类维度

每条保留 prompt 都应尽量具备：

- `stages[]`
  - `design`
  - `development`
  - `iteration`
  - `maintenance`
- `tracks[]`
  - `system_infrastructure`
  - `business_development`
- `modules[]`
  - 例如 `系统管理-用户管理`
  - `标注工作台-我的任务`
  - `低代码-模板设计器`
  - `AI审核-预审质检`

## 维护要求

新增规则时，优先遵循以下顺序：

1. 先判断是否应降级为低质量片段。
2. 若应保留，再补 `module` 规则。
3. 若是短 follow-up 指令但上下文明确，可使用 session 内的模块继承。
4. 不要伪造 transcript 中未记录的模型字段。

## 为什么采用这种设计

这样设计的价值在于：

1. 网页层干净。
   评委和读者看到的是结构化教程，不是杂乱日志。
2. 证据层完整。
   原始文本仍保存在 JSON 中，便于审计和追溯。
3. 讲述层清晰。
   可以直接按“时间线、系统基建、业务开发、关键提示词、模型可观测性”进行展示与答辩。

