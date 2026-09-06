# 标注工作台

> **操作指南**：如需面向标注员的使用说明与分步操作指引，请参见[标注员操作指南](../../business/labeler/overview)。

## 概述

标注工作台（Labeler Workbench）是标注员执行标注任务的核心界面，基于 **Workbench v2** 构建。

**位置**：`frontend/src/features/labeler/`

---

## 页面结构

| 页面 | 文件 | 路由 | 说明 |
|------|------|------|------|
| `LabelerWorkPage` | `pages/LabelerWorkPage.tsx` | `/labeler/work/:assignmentId` | 主标注工作台 |
| `LabelerResourcePage` | `pages/LabelerResourcePage.tsx` | `/labeler/*` | 低代码资源页（市场、我的奖励等） |

`LabelerWorkPage` 是入口编排器，负责：
- 启动工作会话（`bootstrapWorkSession` / `ensureWork`）
- 自动保存草稿（2s 定时器）
- 提交、撤回、申诉
- 队列切换和键盘快捷键

---

## 工作台布局

```
┌──────────────────────────────────────────────────────────┐
│ top (104px)      ← 工具栏、进度                           │
├─────────────┬────────────────────────┬───────────────────┤
│ left (296px) │  center (fill)        │ right (420px)     │
│ 队列         │  题面                  │ 作答 + AI 审核     │
│ 可折叠       │  不可折叠              │ 可折叠            │
└─────────────┴────────────────────────┴───────────────────┘
```

### Slot Provider 注册

**位置**：`workbench/layout/slot-providers.tsx`

| Slot ID | Tab | 区域 | 内容 |
|---------|-----|------|------|
| `toolbar` | 工具 | Top | 设置弹窗、编辑模式切换、重置布局 |
| `summary` | 进度 | Top | 队列位置徽章（如 `3/20`） |
| `queue` | 队列 | Left | 可筛选的任务列表 + 作用域切换 |
| `payload` | 题面 | Center | 标注任务题面数据展示 |
| `annotate` | 作答 | Right | 标注表单 + 提交操作 |
| `ai` | AI 审核 | Right | AI 审核状态和时间线 |

### 视图模式

每个 Slot 支持三种视图模式（通过 `LabelerSlotFrame` 切换）：

| 模式 | 显示方式 |
|------|----------|
| `inline` | 表格行 |
| `cards` | 卡片网格 |
| `json` | 原始 JSON |

---

## 队列导航

**位置**：`work/`

| 模块 | 文件 | 说明 |
|------|------|------|
| 会话存储 | `stores/labeler-work-session.ts` | 队列行、分页、草稿缓存 |
| 队列状态 | `utils/work-queue-status.ts` | 队列完成判断、下一打开项、保存/提交流程 |
| 队列导航 | `utils/work-queue-navigation.ts` | 上/下一篇、索引位置 |
| 队列筛选 | `utils/queue-filter.ts` | 作用域式过滤（`LabelerQueueScopeItem`） |
| 快捷键 | `hooks/use-labeler-work-hotkeys.ts` | 上/下/保存/提交键盘快捷键 |
| 完成页 | `components/LabelerTaskCompletePage.tsx` | 队列全部完成后的展示页 |

### 工作流程

```
Claim → 查看题面 → 标注作答 → 保存草稿(自动2s)
                                    ↓
                              提交标注 → 进入审核
                                    ↓
                    (撤回) ← 审核打回 → 修改后重新提交
                                    ↓
                              申诉（可选）
```

---

## 后端 API

**位置**：`LabelerWorkbenchController.java`

| 端点 | 用途 |
|------|------|
| `GET /api/v1/labeler/market` | 标注市场浏览 |
| `GET /api/v1/labeler/market/{id}` | 市场任务详情 |
| `POST /api/v1/labeler/tasks/{taskId}/claim` | 领取单个任务 |
| `POST /api/v1/labeler/tasks/{taskId}/claim-batch` | 批量领取 |
| `GET /api/v1/labeler/my-tasks` | 我领取的任务 |
| `GET /api/v1/labeler/my-works` | 我的作业 |
| `GET /api/v1/labeler/assignments/{assignmentId}/work` | 加载作业详情 |
| `GET /api/v1/labeler/assignments/{assignmentId}/work-session` | 加载作业 + 队列会话 |
| `PUT /api/v1/labeler/submissions/{submissionId}/draft` | 保存草稿 |
| `POST /api/v1/labeler/submissions/{submissionId}/submit` | 提交标注 |
| `POST /api/v1/labeler/submissions/{submissionId}/withdraw` | 撤回提交 |
| `POST /api/v1/labeler/submissions/{submissionId}/appeal` | 申诉 |
