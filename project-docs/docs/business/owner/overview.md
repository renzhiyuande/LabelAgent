# 任务负责人（Owner）操作指南

> **适用角色**：任务负责人（Owner）  
> **关联文档**：[模板设计](../../development/architecture-modules/template-designer)、[标注员指南](../labeler/overview)、[审核员指南](../reviewer/overview)

---

## 1. 角色概览

Owner 负责标注任务的**全生命周期管理**。功能入口位于侧边栏 **「数据生产中心」** 分组。

### 1.1 核心流程

```
模板搭建 ──→ 创建任务 ──→ 发布任务 ──→ 任务分配 ──→ 标注中 ──→ 数据验收 ──→ 数据导出
   │                         │            │            │          │
   ▼                         ▼            ▼            ▼          ▼
模板市场／模板搭建器      填写任务信息   状态管理    分配管理    验收管理
                         选择模板      发布/暂停   查看进度    导出数据
                         导入数据      归档任务   调整分配    奖励结算
```

### 1.2 工作台首页

![Owner 工作台首页](/img/demo/screenshots/Owner_工作台首页.png)

### 1.3 页面索引

| # | 页面 | 路由 | 文档 | 演示截图 |
|---|------|------|------|----------|
| 01 | 任务管理 | `/owner/tasks` | [任务管理](./task-management) | `Owner_任务管理.png` |
| 02 | 模板搭建 | `/system/template-designer` | [模板搭建](./template-design) | `03-template-designer.png` |
| 03 | 创建任务 | `/owner/tasks/create` | [创建任务](./task-create) | — |
| 04 | 任务分配 | `/owner/assignments` | [任务分配](./task-assignment) | — |
| 05 | 提交与申诉 | `/owner/submissions`、`/owner/appeals` | [提交与申诉](./submission-appeal) | `Owner_提交记录.png` |
| 06 | 数据验收 | `/owner/acceptances` | [数据验收](./data-acceptance) | `Owner_数据验收.png` |
| 07 | 数据导出 | `/owner/exports` | [数据导出](./data-export) | `Owner_数据导出.png` |
| 08 | 奖励结算 | `/owner/settlements` | [奖励结算](./reward-settlement) | `Owner_奖励结算.png` |

**AI 质检相关页面**（Owner 监控链路）：

| 页面 | 路由 | 演示截图 |
|------|------|----------|
| AI 审核台 | `/owner/ai-review` | `Owner_AI 审核台.png` |
| AI 审核大屏 | `/owner/ai-review/dashboard` | `Owner_AI 审核大屏.png` |
| AI 预审质检大屏 | `/owner/ai-review/health` | `Owner_AI 预审质检大屏.png` |

![Owner AI 预审质检大屏](/img/demo/screenshots/Owner_AI 预审质检大屏.png)

### 1.4 统计详情

![Owner 统计详情](/img/demo/screenshots/Owner_统计详情.png)

---

## 2. 子文档导航

按业务流程顺序阅读：

| 阶段 | 文档 | 说明 |
|------|------|------|
| 准备 | [01 — 任务管理](./task-management) | 任务列表与状态管理 |
| 准备 | [02 — 模板搭建](./template-design) | 可视化构建标注表单 |
| 准备 | [03 — 创建任务](./task-create) | 五步创建与发布 |
| 执行 | [04 — 任务分配](./task-assignment) | 市场认领 / 指定分配 |
| 监控 | [05 — 提交与申诉](./submission-appeal) | 提交记录与申诉处理 |
| 收尾 | [06 — 数据验收](./data-acceptance) | 验收已通过审核的数据 |
| 收尾 | [07 — 数据导出](./data-export) | 导出结构化标注结果 |
| 收尾 | [08 — 奖励结算](./reward-settlement) | 标注报酬结算 |

---

## 3. 常见问题

### Q1: 任务发布后如何修改？

已发布的任务可以编辑基本信息（名称、描述、截止时间），但**不可变更模板和数据**。如需变更，建议创建新任务。

### Q2: 如何撤回已分配的任务？

在「任务分配」页面对该标注员的操作菜单中选择「回收分配」，已提交的标注不受影响，未完成的题目重新进入分配池。

### Q3: 导出数据不完整怎么办？

检查导出范围设置：是否只选了「已验收」、是否在增量模式下遗漏早期数据、异步任务是否执行成功。

### Q4: 奖励结算的触发条件？

标注通过**数据验收**后即可发起结算。可在「奖励结算」页面手动发起，或配置自动结算规则。

### Q5: 模板发布后还能修改吗？

发布后的模板生成**不可修改的版本**。需在「版本历史」中创建新草稿快照，编辑后重新发布为新版本。

---

## 附录：关联文件索引

| 文件 | 说明 |
|------|------|
| `features/template-designer/` | 模板搭建器 |
| `features/owner/tasks/` | 任务管理页面 |
| `features/owner/assignments/` | 分配管理页面 |
| `features/owner/acceptances/` | 数据验收页面 |
| `features/owner/exports/` | 导出管理页面 |
| `features/owner/settlements/` | 奖励结算页面 |
