# 低代码引擎指南

本指南详细讲解低代码引擎的每个配置维度。建议按以下顺序阅读：

---

## 📐 核心配置

了解 `ResourceMeta` 的基础结构和 API 端点定义。

| 文档 | 内容 |
|------|------|
| [ResourceMeta 顶层配置](./resource-meta) | 引擎核心数据结构，所有配置的入口 |
| [API 端点定义](./api-definition) | REST API 端点声明与路径占位符 |
| [数据预处理](./data-transform) | `normalizeRecord` 和 `prepareValues` 生命周期钩子 |

## 🧩 页面组件

声明式配置每个 CRUD 交互组件。

| 文档 | 内容 |
|------|------|
| [查询栏](./filters) | 筛选字段、折叠机制、选项数据源 |
| [数据表格](./table) | 列定义、排序分页、行操作/批量操作、选择器模式 |
| [表单](./form) | 字段控件、校验、联动、模式区分、远程子表单 |
| [详情抽屉](./detail) | 详情布局、字段类型、特殊展示（remoteSchema/arrayTable/templateForm） |
| [操作按钮](./actions) | 7 种动作类别、确认弹窗、弹窗表单、侧面板、工作流 |

## ⚡ 进阶功能

处理复杂业务场景的能力。

| 文档 | 内容 |
|------|------|
| [远程数据 & 子表单](./remote) | 远程选项加载、级联联动、动态 Schema |
| [文件 & 图片上传](./upload) | 上传控件配置、展示模式、上传流程 |
| [权限体系](./permissions) | 页面/操作/字段/列级权限控制 |
| [页面布局模式](./page-layouts) | 标准列表、卡片网格、树形+表格布局 |
| [高级功能](./advanced) | LLM 辅助标注、数组字段、动态表格、条件显隐 |

## 🚀 接入指南

| 文档 | 内容 |
|------|------|
| [注册与接入](./registration) | Schema 编写 → 注册 → 菜单接入三步流程 |
| [后端数据契约](./backend-contracts) | Dict / Remote / RemoteSchema 后端 API 数据定义与接入 |
| [Mock 与离线预览](./mock-preview) | 无后端环境预览 Schema、调试联动、快速验证 |
| [最佳实践](./best-practices) | 13 条经验法则 |

## 📚 参考

| 文档 | 内容 |
|------|------|
| [组件类型速查](../references/component-list) | 所有组件类型、操作符、条件操作符完整列表 |
| [完整示例](../references/full-example) | `usersResource` 标准 CRUD + `tasksResource` 复杂业务 |

---

## 类型系统

低代码引擎使用 TypeScript 类型约束 Schema 定义，核心类型定义在 `packages/low-code-engine/src/schema/types.ts`（通过 `@labelhub/low-code-engine` 导出）：

```typescript
// 查询筛选操作符
type FilterOperator = "eq" | "ne" | "in" | "notIn" | "contains" | "notEmpty" | "like" | "between";

// 条件评估操作符（visibleWhen / disabledWhen）
type ConditionOperator = "eq" | "ne" | "in" | "notIn" | "contains" | "notEmpty";

// 筛选控件类型
type FilterFieldComponent = "text" | "select" | "multiSelect" | "tags" | "dateRange" | "dateTimeRange" | "numberRange" | "remoteSelect" | "statusSelect" | "number";

// 表单控件类型（42 种）
type FormFieldComponent = "text" | "textarea" | "select" | "remoteSelect" | "switch" | ...;

// 表格列渲染类型
type TableColumnType = "text" | "number" | "datetime" | "date" | "status" | "switch" | "tags" | "richText" | "file" | "fileUpload" | "image" | "imageUpload" | "json" | "link" | "user";

// 动作类别
type ActionKind = "button" | "drawer" | "request" | "danger" | "link" | "assignment" | "workflow";
```

所有类型均为**闭合联合**，TypeScript 编译期校验，IDE 自动补全。
