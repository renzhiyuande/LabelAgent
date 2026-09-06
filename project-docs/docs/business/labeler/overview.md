# 标注员（Labeler）操作指南

> **适用角色**：标注员（Labeler）  
> **工作流程**：[01 — 标注市场](./market) → [02 — 我的任务与认领](./claim) → [03 — 标注工作台](./annotation)  
> **关联文档**：[Owner 操作指南](../owner/overview)、[Reviewer 操作指南](../reviewer/overview)

---

## 1. 角色概览

标注员（Labeler）是 LabelHub 的核心执行角色，负责在 Owner 发布的任务上逐题作答。标注结果经 Reviewer 审核后进入验收与结算流程。

### 1.1 核心流程

```
标注市场浏览 ──→ 认领任务 ──→ 我的任务 ──→ 进入工作台
                                                 │
                                            ┌────┴────┐
                                            │         │
                                         逐题作答   查看题面
                                            │         │
                                          提交审核 ←── 填写表单
                                            │
                                        审核流程
                                            │
                                      ┌─────┴─────┐
                                      │           │
                                   审核通过     被打回
                                      │           │
                                   结算酬劳   修改后重新提交
```

### 1.2 工作台首页

![Labeler 工作台首页](/img/demo/screenshots/Labeler_工作台首页.png)

### 1.3 页面索引

| # | 页面 | 路由 | 文档 | 演示截图 |
|---|------|------|------|----------|
| 01 | 标注市场 | `/labeler/market` | [标注市场](./market) | `Labeler_任务广场.png` |
| 02 | 我的任务 | `/labeler/tasks` | [我的任务与认领](./claim) | `Labeler_我的任务.png` |
| 03 | 标注工作台 | `/labeler/work/:id` | [标注工作台](./annotation) | `05-labeler-workbench.png` |
| — | 我的草稿 | `/labeler/drafts` | 见下文 | `Labeler_我的草稿.png` |
| — | 已提交 | `/labeler/submitted` | 见下文 | `Labeler_已提交.png` |
| — | 我的奖励 | `/labeler/rewards` | 见下文 | `Labeler_我的奖励.png` |

### 1.4 辅助页面截图

| 页面 | 说明 | 截图 |
|------|------|------|
| 首页概览 | 角色工作台入口 | ![Labeler 首页](/img/demo/screenshots/Labeler_首页.png) |
| 统计详情 | 个人产出与质量统计 | ![Labeler 统计详情](/img/demo/screenshots/Labeler_统计详情.png) |
| 我的草稿 | 未正式提交的作答 | ![Labeler 我的草稿](/img/demo/screenshots/Labeler_我的草稿.png) |
| 已提交 | 已提交待审核/已通过列表 | ![Labeler 已提交](/img/demo/screenshots/Labeler_已提交.png) |
| 我的奖励 | 酬劳与结算记录 | ![Labeler 我的奖励](/img/demo/screenshots/Labeler_我的奖励.png) |

---

## 2. 子文档导航

| # | 文档 | 说明 |
|---|------|------|
| 01 | [标注市场](./market) | 浏览可用任务、筛选、查看详情 |
| 02 | [我的任务与认领](./claim) | 认领流程、我的任务列表 |
| 03 | [标注工作台](./annotation) | 题面、表单填写、保存与提交 |

---

## 3. 键盘快捷键

| 快捷键 | 功能 | 适用页面 |
|--------|------|----------|
| `Ctrl + S` | 保存草稿 | 标注工作台 |
| `Ctrl + Enter` | 正式提交 | 标注工作台 |
| `←` / `→` | 上一题 / 下一题 | 标注工作台 |

---

## 4. 常见问题

### Q1: 如何查看已完成任务的审核结果？

在「我的任务」或「已提交」页面查看状态：审核通过标记为「已通过」，被打回标记为「需修改」。

### Q2: 酬劳如何结算？

酬劳由 Owner 在创建任务时设定。标注提交且审核通过后计入结算，具体周期见 Owner 结算规则。

### Q3: 可以同时做多个任务吗？

可以。在「我的任务」页面切换查看各任务进度。

### Q4: 标注结果被驳回怎么办？

查看打回意见，在「需修改」题目中重新作答后再次提交。
