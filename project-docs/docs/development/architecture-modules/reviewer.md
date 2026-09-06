# 审核工作台

## 概述

审核工作台提供 **AI 预审队列** 和 **人工审核池** 两种审核模式，确保标注质量。

**位置**：`frontend/src/features/review/`

---

## 页面结构

| 页面 | 文件 | 路由 | 说明 |
|------|------|------|------|
| `ReviewAiQueuePage` | `ReviewAiQueuePage.tsx` | `/reviewer/ai-queue/:submissionId?` | AI 预审队列 |
| `ReviewAuditPoolPage` | `ReviewAuditPoolPage.tsx` | `/reviewer/audit-pool/:reviewId?` | 人工审核池 |
| `ReviewResultsPage` | `ReviewResultsPage.tsx` | `/reviewer/results` | 审核结果查询 |

---

## AI 预审队列

基于 Workbench v2 构建，用于 AI 预审结果的展示和快速处理。

### 布局

```
┌─────────────────────────────────────────┐
│ top (96px)   ← 导航面包屑 + Agent 版本   │
├────────────────┬────────────────────────┤
│ left (300px)   │ center (fill)          │
│ 队列列表        │ 内容（题面 + 标注快照）  │
│ 可折叠          │                       │
├────────────────┤                        │
│ right (360px)  │                        │
│ AI 分析         │                       │
│ 可折叠          │                       │
└────────────────┴────────────────────────┘
```

### Slot Provider

| Slot ID | 标签 | 区域 | 内容 |
|---------|------|------|------|
| `toolbar` | 导航 | Top | 面包屑 + Agent 版本徽章 |
| `queue` | 队列 | Left | 按状态分组的可筛选行列表 |
| `content` | 内容 | Center | 题面展示 + 标注快照 |
| `insight` | AI 分析 | Right | AI 维度评分、判定、Prompt、时间线 |

### Widget 组件

| Widget ID | 所在 Board | 标题 |
|-----------|-----------|------|
| `content-payload` | content | 题面 |
| `content-annotate` | content | 标注快照 |
| `insight-dimensions` | insight | AI 维度评分 |
| `insight-verdict` | insight | 判定结论 |
| `insight-prompt` | insight | 审核 Prompt |
| `insight-timeline` | insight | 时间线 |

### 交互操作

- **状态筛选**：待审核 / 已通过 / 已打回 / 需人工 / 失败
- **快捷键**：`A` 通过 / `R` 打回 / `S` 跳过
- **批量操作**：批量通过/打回

---

## 人工审核池

### 布局

```
┌─────────────────────────────────────────┐
│ top (96px)   ← 工具栏 + AI 头部信息      │
├───────────┬──────────────┬──────────────┤
│ left(280) │ center(fill) │ right(380)   │
│ 队列       │ 题面          │ 审核操作     │
│ 历史       │               │ AI 辅助分析  │
│ 可折叠     │               │ 可折叠       │
└───────────┴──────────────┴──────────────┘
```

### Slot Provider

| Slot ID | 标签 | 区域 | 内容 |
|---------|------|------|------|
| `toolbar` | 导航 | Top | 工具栏 + 面包屑 |
| `ai-header` | AI 分析 | Top | 审核配置描述 |
| `queue` | 队列 | Left | 任务列表 + 历史 |
| `content` | 内容 | Center | 题面 + 标注数据 |
| `review` | 审核 | Right | 审核操作（通过/打回/修改） |
| `ai` | AI 分析 | Right | AI 辅助建议 |

### 审核操作

- **通过**：标注通过审核，流转到下一级或完成
- **打回**：标注退回给标注员修改
- **修改**：直接修改标注内容后通过
- **多级审核**：支持配置审核等级，每级可独立设置审核人

---

## 后端 API

**位置**：`ReviewerWorkbenchController.java`

| 端点 | 用途 |
|------|------|
| `GET /api/v1/reviewer/ai-queue` | AI 预审队列列表 |
| `GET /api/v1/reviewer/ai-queue/{id}` | AI 预审详情 |
| `POST /api/v1/reviewer/ai-queue/{id}/approve` | AI 预审通过 |
| `POST /api/v1/reviewer/ai-queue/{id}/reject` | AI 预审打回 |
| `POST /api/v1/reviewer/ai-queue/batch-approve` | 批量通过 |
| `POST /api/v1/reviewer/ai-queue/batch-reject` | 批量打回 |
| `GET /api/v1/reviewer/audit-pool` | 人工审核池列表 |
| `GET /api/v1/reviewer/audit-pool/{id}` | 审核详情 |
| `POST /api/v1/reviewer/audit-pool/{id}/approve` | 审核通过 |
| `POST /api/v1/reviewer/audit-pool/{id}/reject` | 审核打回 |
| `POST /api/v1/reviewer/audit-pool/{id}/modify` | 修改后通过 |
| `GET /api/v1/reviewer/results` | 审核结果查询 |

---

## 审核配置

审核工作流配置在模板设计器中完成，位于 `template-designer` 的审核配置面板：

| 配置项 | 说明 |
|--------|------|
| 审核等级 | 一级 / 二级 / 三级审核 |
| 每级审核人 | 按角色或具体用户配置 |
| LLM 审核 Prompt | 自定义 AI 预审的 Prompt 模板 |
| 审核维度 | 配置 AI 预审的评估维度 |
