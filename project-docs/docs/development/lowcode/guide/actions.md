# 操作按钮

> **相关文档**：[权限控制](./permissions) | [API 端点定义](./api-definition) | [表单配置](./form) | [侧面板引用](./registration#三步接入)

操作按钮系统支持 7 种动作类别，覆盖从简单请求到复杂工作流的全场景。

## 动作类别

| `kind` | 行为 | 典型场景 |
|--------|------|---------|
| `"drawer"` | 弹出表单抽屉 | 新建、编辑 |
| `"request"` | 直接发 API 请求 | 启用/禁用、暂停/恢复 |
| `"danger"` | 确认后发 DELETE 请求 | 删除 |
| `"link"` | 页面跳转 | 打开设计器、跳转详情 |
| `"assignment"` | 分配操作抽屉 | 分配角色/用户 |
| `"workflow"` | 工作流 UI 渲染 | 发布审批流程 |
| `"button"` | 纯按钮，需 JS handler | 自定义逻辑 |

## 基础属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `key` | `string` | 操作唯一标识 |
| `label` | `string` | 按钮文案 |
| `kind` | `ActionKind` | 动作类别 |
| `actionCode` | `string` | 自定义动作代码 |
| `permission` | `string \| string[]` | 权限 |
| `visibleWhen` | `ConditionMeta[]` | 条件显隐 |
| `hiddenInList` | `boolean` | 在行列表中隐藏，仅详情页展示 |
| `confirm` | `ConfirmMeta` | 确认弹窗 |
| `prompt` | `PromptFormSchema` | 弹窗表单（最多 3 字段） |
| `api` | `string` | 提交 API |
| `requestBody` | `Record<string, unknown>` | 附加请求体 |

## `kind: "drawer"` — 表单抽屉

```typescript
{
  key: "create",
  label: "新建任务",
  kind: "drawer",
  permission: ["system:admin", "business:task:create"],
}
```

- 自动使用 `resource.form` 渲染创建表单
- `edit` 操作会自动在表单中填充当前记录数据

## `kind: "request"` — 直接请求

```typescript
{
  key: "pause",
  label: "暂停任务",
  kind: "request",
  permission: "system:admin",
  visibleWhen: [{ field: "status", operator: "eq", value: "PUBLISHED" }],
  api: "/api/v1/owner/tasks/{id}/pause",
}
```

- `api` 中 `{id}` 自动替换
- 如果 `api` 未定义，引擎使用 `resource.api.actions[key]`

### 请求体支持记录字段引用

```typescript
requestBody: {
  reason: "管理员操作",
  source: "$record.source",      // 从当前记录取值
}
```

### 成功后跳转

```typescript
navigateOnSuccess: {
  href: "/system/tasks/{id}",
  replace: false,
}

successMessage: "任务 {title} 已成功发布",
```

占位符 `{field}` 从当前记录和接口响应中取值。

## `kind: "danger"` — 删除

```typescript
{
  key: "delete",
  label: "删除",
  kind: "danger",
  permission: ["system:admin"],
  visibleWhen: [{ field: "status", operator: "in", value: ["DRAFT", "PAUSED"] }],
}
```

- 自动弹出确认弹窗："确定删除所选记录？"
- 自动发 DELETE 请求到 `resource.api.delete`

## `kind: "link"` — 页面跳转

```typescript
{
  key: "openDesigner",
  label: "查看版本",
  kind: "link",
  href: "/system/template-designer?templateId={templateId}&versionId={id}",
  openInNewTab: true,
}
```

`{field}` 占位符自动替换为当前记录的对应字段值。

## 确认弹窗 `confirm`

```typescript
{
  key: "pause",
  label: "暂停任务",
  kind: "request",
  confirm: {
    title: "确认暂停任务？",
    description: "暂停后任务将停止继续领取，后续可恢复发布。",
    confirmText: "确认暂停",
    cancelText: "再想想",
  },
}
```

## 弹窗表单 `prompt`

用于需要在操作前收集用户输入的场景（最多支持 3 个字段）：

```typescript
{
  key: "publishToMarket",
  label: "发布到模板市场",
  kind: "request",
  prompt: {
    title: "发布到模板市场",
    description: "填写模板市场展示描述。",
    confirmLabel: "提交发布",
    fields: [
      {
        key: "description",
        label: "发布描述",
        component: "text",
        required: true,
        placeholder: "请输入描述",
      },
    ],
    initialValues: { description: "" },
  },
}
```

## `kind: "assignment"` — 分配

```typescript
{
  key: "assignRoles",
  label: "分配角色",
  kind: "assignment",
  api: "/api/v1/admin/users/{id}/roles",
  bulkApi: "/api/v1/admin/users/roles/batch",
  assignment: {
    payloadKey: "roleIds",              // 提交到后端的字段名
    title: "分配角色",
    description: "更新用户角色。",
    // 候选列表
    candidatesSource: "roles",          // api.options 中定义
    // 或 candidatesApi: "/api/v1/custom/candidates"
    assignedApi: "/api/v1/admin/users/{id}",
    assignedPath: "roles",              // 已选数据在响应中的路径
    variant: "flat",                    // flat | tree
    fieldLabel: "角色",
    // 左侧目标信息卡片
    summary: [
      { label: "用户名", field: "username" },
      { label: "显示名", field: "displayName" },
      { label: "当前状态", field: "status" },
    ],
    targetTitle: "对象信息",
  },
}
```

### 批量分配

配合 `bulkActions` + `bulkApi` 使用，引擎自动处理选中多行时的批量提交。

## `kind: "workflow"` — 工作流渲染

```typescript
{
  key: "publish",
  label: "发布任务",
  kind: "workflow",
  workflow: {
    rendererCode: "task.publishPreparation",  // 由 JS 注册的渲染器
    title: "发布任务",
    width: "lg",
    placement: "right",                       // left | right
  },
}
```

需要先注册渲染器：

```typescript
import { workflowRegistry } from "@/low-code/actions/workflow-registry";

workflowRegistry.set("task.publishPreparation", MyPublishWorkflowComponent);
```

## 侧面板操作 `sidePanel`

用于在页面右侧弹出另一个资源页面的列表，自动带上当前记录的 scope 筛选：

```typescript
{
  key: "importItems",
  label: "导入标注数据",
  kind: "request",
  hiddenInList: true,           // 仅在详情页展示
  sidePanel: {
    resourceKey: "taskItems",   // 侧栏展示的资源 key
    scope: {                    // 自动添加过滤
      field: "taskId",
      from: "id",               // 取当前记录 id
    },
    hideFilters: ["taskId"],    // 隐藏的筛选字段
    listFilters: [              // 额外固定筛选
      { field: "memberRole", op: "eq", value: "REVIEWER" },
    ],
    createDefaults: { memberRole: "REVIEWER" },
    hideFormFields: ["taskId", "memberRole"],
    title: "{title} · 数据管理",
  },
}
```

## 条件显隐 `visibleWhen`

操作在满足条件时才可见：

```typescript
visibleWhen: [
  { field: "status", operator: "eq", value: "DRAFT" },
]
// 多个条件 AND 关系
visibleWhen: [
  { field: "status", operator: "eq", value: "PUBLISHED" },
  { field: "marketAuditStatus", operator: "ne", value: "APPROVED" },
]
```

`operator` 使用 `ConditionOperator` 类型：`eq` / `ne` / `in` / `notIn` / `contains` / `notEmpty`。
