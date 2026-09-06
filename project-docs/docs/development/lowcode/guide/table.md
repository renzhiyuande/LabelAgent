# 数据表格

> **相关文档**：[操作按钮](./actions) | [权限控制](./permissions) | [查询栏](./filters) | [详情抽屉](./detail) | [ResourceMeta 总览](./resource-meta)

`TableSchema` 描述页面的数据表格，是低代码引擎中**最核心的展示组件**。它位于查询栏（[`FilterSchema`](./filters)）下方，与表单（[`FormSchema`](./form)）和详情抽屉（[`DetailSchema`](./detail)）协同构成完整的 CRUD 交互链路。

```
┌──────────────────────────────────────┐
│  查询栏（FilterSchema）               │  ← filters.md
├──────────────────────────────────────┤
│  数据表格（TableSchema）              │  ← 本文档
│  ┌──────┬──────┬──────┬───────┐     │
│  │ 编码  │ 名称  │ 状态  │ 操作  │     │
│  ├──────┼──────┼──────┼───────┤     │
│  │ T01  │ ...  │ 进行  │ 编辑  │     │
│  └──────┴──────┴──────┴───────┘     │
├──────────────────────────────────────┤
│  详情抽屉 / 表单（DetailSchema / Form）│  ← detail.md / form.md
└──────────────────────────────────────┘
```

### 学习路径

| 步骤 | 内容 | 参考 |
|------|------|------|
| ① | 理解列定义 `TableColumnSchema` 和渲染类型 | 下方 [列定义](#table-column-schema) |
| ② | 掌握用户列、链接列、开关插槽等高级列配置 | [`UserFieldMeta`](#user-field-meta) / [`TableColumnLinkMeta`](#table-column-link-meta) / [插槽配置](#table-column-slot) |
| ③ | 配置行操作和批量操作 | [行操作](#行操作) / [批量操作](#批量操作) |
| ④ | 了解更多 | 查询栏 [filters.md](./filters) · 表单 [form.md](./form) · 详情 [detail.md](./detail) · 操作 [actions.md](./actions) |

## 完整结构

```typescript
interface TableSchema {
  columns: TableColumnSchema[];         // 列定义
  rowKey?: string;                     // 行 key，默认 "id"
  selectable?: boolean;                // 是否显示多选框
  pagination?: boolean;                // 是否分页
  defaultSort?: { field: string; order: "asc" | "desc" };
  rowActions?: ActionSchema[];         // 行级操作按钮
  rowActionKeys?: string[];            // 从 resource.actions 提升为行内按钮的 key
  bulkActions?: ActionSchema[];        // 批量操作
  picker?: TablePickerMeta;            // 选择器模式
}
```

## 列定义 `TableColumnSchema` {#table-column-schema}

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `key` | `string` | ✅ | 字段名 |
| `title` | `string` | ✅ | 列标题 |
| `type` | `TableColumnType` | — | 渲染类型，默认 `"text"` |
| `width` | `number \| string` | — | 列宽（px 或预设值 `xs/sm/md/lg/xl`） |
| `minWidth` / `maxWidth` | `number \| string` | — | 最小/最大列宽 |
| `ellipsis` | `boolean \| 1 \| 2` | — | 超出截断行数 |
| `align` | `"left" \| "center" \| "right"` | — | 对齐方式 |
| `sortable` | `boolean` | — | 是否可排序 |
| `fixed` | `"left" \| "right"` | — | 固定列 |
| `visible` | `boolean` | — | 默认是否可见 |
| `visibleWhen` | [`ConditionMeta[]`](#table-column-visible-when) | — | 按行条件显隐（条件不满足时单元格显示占位） |
| `permission` | `string \| string[]` | — | 权限过滤 |
| `dict` | `string` | — | 数据字典编码 |
| `enum` | `OptionItem[]` | — | 静态枚举映射 |
| `formatter` | `string` | — | 格式化器，详见 [格式化器](#table-column-formatter) |
| `slot` | `"switch" \| "image"` | — | 渲染插槽，详见 [插槽配置](#插槽-slot-配置) |
| `slotMeta` | `TableColumnSlotSwitchMeta \| TableColumnSlotImageMeta` | — | 插槽元数据，配合 `slot` 使用 |
| `user` | [`UserFieldMeta`](#user-field-meta) | — | 用户引用展示，配合 `type: "user"` 使用 |
| `link` | [`TableColumnLinkMeta`](#table-column-link-meta) | — | 链接列配置，配合 `type: "link"` 使用 |

## 列类型速查

| `type` | 渲染效果 | 数据格式 | 说明 |
|--------|---------|---------|------|
| `text` | 纯文本 | `string` | 默认类型，支持 `formatter` |
| `number` | 右对齐数字 | `number` | — |
| `datetime` | 日期时间格式化 | ISO 字符串 | 带日历 icon |
| `date` | 日期格式化 | ISO 字符串 | 仅日期部分 |
| `status` | 彩色标签 | `string` | 配合 `dict` / `enum` 使用色调（`tone`） |
| `switch` | 开关（即时切换） | `boolean` | 需配合 `slot: "switch"` + `slotMeta` |
| `tags` | 多标签展示 | `string[]` | — |
| `richText` | HTML 富文本渲染 | `string` | — |
| `link` | 超链接（跳转关联资源） | 见 [`link` 配置](#table-column-link-meta) | 可打开关联资源详情/编辑/工作流 |
| `user` | 用户名+头像卡片 | 见 [`user` 配置](#user-field-meta) | 点击弹出协作用户卡片 |
| `json` | 格式化 JSON | `object` | 支持 `formatter` |
| `image` | 缩略图 | URL | — |
| `imageUpload` | 图片上传展示 | `FileAssetRef` | 展示已上传的图片资源 |
| `file` | 文件链接 | URL | — |
| `fileUpload` | 文件上传展示 | `FileAssetRef` | 展示已上传的文件资源 |

## 列配置示例

```typescript
columns: [
  // 文本列 — sortable 支持排序
  { key: "taskCode", title: "编码", type: "text", sortable: true },

  // 状态列 — 使用数据字典管理枚举值
  { key: "status", title: "状态", type: "status", dict: "task_status" },

  // 日期时间列
  { key: "deadlineAt", title: "截止时间", type: "datetime", sortable: true },

  // 数字列 + bytes 格式化器
  { key: "fileSize", title: "文件大小", type: "number", formatter: "bytes" },

  // 链接列 — 点击打开关联资源详情
  { key: "taskTitle", title: "所属任务", type: "link",
    link: { labelField: "taskTitle", action: "openRelated",
            resourceKey: "tasks", idField: "taskId" } },

  // 用户列 — 点击弹出协作者卡片
  { key: "labelerName", title: "标注员", type: "user",
    user: { idField: "labelerId", nameField: "labelerName", role: "LABELER" } },

  // 富文本列
  { key: "descriptionText", title: "描述", type: "richText" },

  // JSON 列 — payloadPreview 格式化只显示摘要
  { key: "payload", title: "数据预览", type: "json", formatter: "payloadPreview" },

  // 开关列 — 行内直接切换状态
  { key: "enabled", title: "启用", type: "switch",
    slot: "switch",
    slotMeta: { checkedValue: true, uncheckedValue: false,
                enableAction: "enable", disableAction: "disable" } },

  // 图片列
  { key: "coverImage", title: "封面", type: "image" },

  // 条件显隐 — 仅 isInternal=true 时展示
  { key: "internalNote", title: "内部备注", type: "text",
    visibleWhen: [{ field: "isInternal", operator: "eq", value: true }] },
]
```

### 插槽 `slot` 配置 {#table-column-slot}

`slot` 和 `slotMeta` 配合实现表格单元格内的交互渲染，目前支持 **switch** 和 **image** 两种插槽。

#### switch 插槽

行内开关，点击直接切换状态，无需打开详情：

```typescript
interface TableColumnSlotSwitchMeta {
  checkedValue?: unknown;       // 打开时的字段值（status 列默认 ACTIVE，其它 true）
  uncheckedValue?: unknown;     // 关闭时的字段值（status 列默认 DISABLED，其它 false）
  enableAction?: string;        // 打开时触发的 action key（默认 "enable"）
  disableAction?: string;       // 关闭时触发的 action key（默认 "disable"）
  permission?: string | string[]; // 权限过滤
  disabledWhen?: ConditionMeta[]; // 条件禁用
}
```

```typescript
{
  key: "enabled", title: "启用", type: "switch",
  slot: "switch",
  slotMeta: {
    checkedValue: true,          // 打开时值
    uncheckedValue: false,       // 关闭时值
    enableAction: "enable",      // 触发 resource.actions 中的 enable
    disableAction: "disable",    // 触发 resource.actions 中的 disable
  },
}
```

#### image 插槽

在表格单元格中以缩略图展示图片：

```typescript
interface TableColumnSlotImageMeta {
  fileIdField?: string;          // 文件 ID 字段，默认当前列 key
  mimeTypeField?: string;        // MIME 类型字段
  altField?: string;             // 替代文本字段
}
```

```typescript
{
  key: "coverUrl", title: "封面", type: "text",
  slot: "image",
  slotMeta: {
    fileIdField: "coverFileId",
    altField: "coverAlt",
  },
}
```

### 条件显隐 `visibleWhen` {#table-column-visible-when}

`visibleWhen` 实现**按行**的条件显隐——某行不满足条件时该单元格显示占位，列头和表头仍保留。条件使用 `ConditionOperator` 操作符（`eq` / `ne` / `in` / `notIn` / `contains` / `notEmpty`）。

```typescript
columns: [
  {
    key: "internalNote",
    title: "内部备注",
    type: "text",
    visibleWhen: [{ field: "isInternal", operator: "eq", value: true }],
  },
]
```

### 格式化器 `formatter` {#table-column-formatter}

`formatter` 控制单元格数据的格式化方式：

| 值 | 效果 | 适用类型 |
|----|------|---------|
| `ellipsis` | 单行省略（等效 `ellipsis: 1`） | `text` |
| `payloadPreview` | 摘要预览（截取前 N 字符） | `text` / `json` |
| `json` | 格式化 JSON | `json` |
| `bytes` | 字节格式化（KB/MB/GB） | `number` |
| `boolean` | "是" / "否" | `boolean` |

```typescript
{ key: "description", title: "描述", type: "text", formatter: "ellipsis" }
{ key: "size", title: "文件大小", type: "number", formatter: "bytes" }
{ key: "payload", title: "数据预览", type: "json", formatter: "payloadPreview" }
```

```typescript
{ key: "status", title: "状态", type: "status", enum: [
  { value: "DRAFT",    label: "草稿",    tone: "default" },
  { value: "PUBLISHED",label: "已发布",  tone: "success" },
  { value: "PAUSED",   label: "已暂停",  tone: "warning" },
  { value: "CLOSED",   label: "已关闭",  tone: "destructive" },
]}
```

`tone` 可选值：`default`（蓝色）/ `success`（绿色）/ `warning`（橙色）/ `destructive`（红色）/ `muted`（灰色）。

## 用户列详解 `UserFieldMeta` {#user-field-meta}

用户列在表格中展示用户名，点击弹出协作用户卡片（包含头像、角色、联系方式等）。

```typescript
interface UserFieldMeta {
  idField?: string;                 // 用户 ID 字段，默认同列 key 去掉 Name 后缀 + Id
  nameField?: string;               // 展示名字段，默认取当前列 key
  role?: "LABELER" | "REVIEWER" | "OWNER";  // 协作者 role 筛选
  roleFrom?: string;                // 动态 role 来源字段
}
```

### 属性说明

| 属性 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `idField` | `string` | — | 列 key 去掉 `Name` 后缀 + `Id` | 用户 ID 字段名，用于点击卡片时加载用户信息 |
| `nameField` | `string` | — | 当前列 `key` | 展示的用户名对应的数据字段 |
| `role` | `"LABELER" \| "REVIEWER" \| "OWNER"` | — | — | 协作者角色筛选，影响用户卡片展示内容 |
| `roleFrom` | `string` | — | — | 从指定数据字段动态获取 role |

### 基础用法

```typescript
// 标注员列 — 固定 role = "LABELER"
{
  key: "labelerName",
  title: "标注员",
  type: "user",
  user: {
    idField: "labelerId",
    nameField: "labelerName",
    role: "LABELER",
  },
}

// 名称字段自动推导：列 key = "reviewerName"
// 则 nameField 默认取 "reviewerName"，idField 默认取 "reviewerId"
{
  key: "reviewerName",
  title: "审核员",
  type: "user",
  user: { role: "REVIEWER" },
}
```

### 与详情字段的 `user` 共用

`UserFieldMeta` 同样可用于详情抽屉的 `DetailFieldSchema.user`：

```typescript
detail: {
  sections: [{
    fields: [
      { key: "labelerName", label: "标注员", type: "user",
        user: { idField: "labelerId", role: "LABELER" } },
    ],
  }],
}
```

## 链接列详解 `TableColumnLinkMeta` {#table-column-link-meta}

链接列在表格中渲染为超链接，点击可跳转到关联资源详情、编辑页或自定义 URL。

```typescript
interface TableColumnLinkMeta {
  labelField?: string;              // 展示文本字段，默认取当前列 key
  formatter?: string;               // 文本格式化器
  action?: "detail" | "edit" | "workflow" | "openRelated";  // 点击行为
  resourceKey?: string;             // 目标资源 key（action 非 href 时必需）
  idField?: string;                 // 关联 ID 字段，默认取目标资源的 idKey
  workflowCode?: string;            // action=workflow 时的工作流编码
  href?: string;                    // 自定义 URL（优先级最高）
  openInNewTab?: boolean;           // 是否在新标签页打开
  pathParams?: Record<string, string>;  // 路径参数映射：占位符 → 数据字段
}
```

### 属性说明

| 属性 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `labelField` | `string` | — | 当前列 `key` | 链接展示文本对应的数据字段 |
| `formatter` | `string` | — | — | 文本格式化方式（目前仅 `"ellipsis"`） |
| `action` | `"detail" \| "edit" \| "workflow" \| "openRelated"` | — | — | 点击行为，详见 [`action` 行为说明](#link-action-behavior) |
| `resourceKey` | `string` | *见说明* | — | 目标资源在注册表中的 key，`action` 非 `href` 时必需 |
| `idField` | `string` | — | 目标资源的 `idKey` | 当前记录中用于定位目标记录的字段名 |
| `workflowCode` | `string` | — | — | `action: "workflow"` 时的工作流渲染器编码 |
| `href` | `string` | — | — | 自定义 URL，`{field}` 占位符自动替换；优先级高于 `action` |
| `openInNewTab` | `boolean` | — | `false` | 是否在新标签页打开 |
| `pathParams` | `Record<string, string>` | — | — | 路径参数映射：键为路径占位符，值为当前记录字段名 |

### `action` 行为说明 {#link-action-behavior}

`action` 控制点击链接时的跳转行为。未配置时若 `href` 也未设置，链接渲染为纯文本（不可点击）。

| `action` | 行为 | 交互效果 | 必需配置 |
|----------|------|---------|---------|
| `"detail"` | 打开目标资源的详情抽屉 | 在当前页面弹出目标资源的详情抽屉 | `resourceKey` |
| `"edit"` | 打开目标资源的编辑表单 | 在当前页面弹出目标资源的编辑抽屉，预填数据 | `resourceKey` |
| `"workflow"` | 打开工作流 UI | 调用目标资源注册的工作流渲染器 | `resourceKey` + `workflowCode` |
| `"openRelated"` | 在当前资源内打开关联详情 | 在同一页面 overlay 中渲染目标资源的详情视图（非抽屉），可返回 | `resourceKey` + `idField` |

**优先级说明**：

```
href  >  action  >  纯文本（不可点击）
```

- `href` 设置时，`action` 被忽略，直接跳转到自定义 URL
- `action` 设置时，根据行为类型调用引擎路由
- 两者都未设置时，列内容展示为纯文本，不作为链接

### 各 `action` 用法说明

四种 `action` 的复杂度和额外配置需求不同。`"detail"` 和 `"edit"` 只需 `resourceKey` 即可工作，而 `"openRelated"` 和 `"workflow"` 需要额外参数，下文分别详解。

#### `"detail"` 和 `"edit"` — 基础跳转

两者只需要 `resourceKey` 标识目标资源，引擎自动处理数据加载和渲染：

```typescript
// detail — 打开目标资源详情抽屉
{ key: "taskTitle", title: "所属任务", type: "link",
  link: { labelField: "taskTitle",
          action: "detail", resourceKey: "tasks", idField: "taskId" } }

// edit — 打开目标资源编辑表单（预填当前数据）
{ key: "taskTitle", title: "所属任务", type: "link",
  link: { labelField: "taskTitle",
          action: "edit", resourceKey: "tasks", idField: "taskId" } }
```

| action | 自动行为 |
|--------|---------|
| `"detail"` | 调用 `fetchDetail(resourceKey, id)` 加载数据，渲染目标资源的 `detail` 配置 |
| `"edit"` | 调用 `fetchDetail(resourceKey, id)` 加载数据，预填到目标资源的 `form.sections`，打开编辑抽屉 |

### `openRelated` 参数详解

`openRelated` 是最常用的关联跳转，支持在当前页面 overlay 中渲染目标资源的详情视图。

**参数说明**：

| 参数 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `resourceKey` | ✅ | — | 目标资源在注册表中的 key，通过 `getResourceMeta(key)` 查找详情配置 |
| `idField` | — | 目标资源的 `idKey` | 当前记录中目标记录的 ID 字段名，用于定位详情数据 |
| `labelField` | — | 当前列 `key` | 链接展示文本对应的数据字段，支持嵌套路径 |
| `pathParams` | — | — | 嵌套资源路径参数映射：`{ taskId: "taskId" }` → 从当前记录 `taskId` 字段取值填入 API 路径 |
| `formatter` | — | — | 链接文本格式化方式 |

**运行时流程**：

```
点击链接 → 读取 resourceKey → 获取目标资源配置
  → 取关联 ID → 提取路径参数
  → overlay 打开详情视图 → 可关闭返回
```

**典型配置（嵌套资源）**：

```typescript
{
  key: "sourceItemKey", title: "来源题目", type: "link",
  ellipsis: 1,
  link: {
    labelField: "sourceItemKey",       // 展示文本
    action: "openRelated",
    resourceKey: "taskItems",          // 目标资源
    idField: "itemId",                 // 关联 ID
    pathParams: { taskId: "taskId" },  // 嵌套路径参数
  },
}
```

### `workflow` 参数详解 {#link-action-workflow}

`workflow` 用于调用目标资源注册的工作流渲染器，适用于需要多步确认的复杂操作（如发布审批、批量审核）。

**参数说明**：

| 参数 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `resourceKey` | ✅ | — | 目标资源在注册表中的 key，用于获取资源配置 |
| `idField` | — | 目标资源的 `idKey` | 当前记录中目标记录的 ID 字段名 |
| `workflowCode` | ✅ | — | 工作流渲染器编码，需先在 `workflowRegistry` 中注册 |
| `labelField` | — | 当前列 `key` | 链接展示文本对应的数据字段 |

**工作流渲染器注册**：

工作流渲染器需要在 JS 代码中预先注册到 `workflowRegistry`：

```typescript
import { workflowRegistry } from "@/low-code/actions/workflow-registry";
import { MyPublishWorkflowComponent } from "./MyPublishWorkflowComponent";

workflowRegistry.set("task.publishPreparation", MyPublishWorkflowComponent);
```

渲染器组件接收 `resource` 和 `record` 作为 props，实现自定义 UI 交互。

**典型配置**：

```typescript
{
  key: "taskTitle", title: "所属任务", type: "link",
  link: {
    labelField: "taskTitle",
    action: "workflow",
    resourceKey: "tasks",
    idField: "taskId",
    workflowCode: "task.publishPreparation",  // 必须在 workflowRegistry 中注册
  },
}
```

**与 `actions.md` 的 `kind: "workflow"` 区别**：

表格 `link` 列的 `action: "workflow"` 与 [`ActionSchema`](./actions) 的 `kind: "workflow"` 共通同一渲染器注册表 `workflowRegistry`。区别在于触发方式：

| 触发方式 | 入口 | 适用场景 |
|----------|------|---------|
| 表格链接列 `action: "workflow"` | 点击表格中的超链接文字 | 从关联数据跳转到工作流 |
| 操作按钮 `kind: "workflow"` | 点击行操作或工具栏按钮 | 对当前记录执行工作流操作 |

### 自定义 URL（`href`）

`href` 的优先级高于 `action`，设置后点击链接直接跳转到自定义 URL。

```typescript
// 跳转到外部或自定义路径
{
  key: "taskCode",
  title: "任务编码",
  type: "link",
  link: {
    href: "/system/tasks/{taskId}/edit",
    openInNewTab: false,
    // {taskId} 自动从当前记录取 taskId 字段值
  },
}
```

URL 中的 `{field}` 占位符自动替换为当前记录的对应字段值。

### 与详情字段的 `link` 共用

`TableColumnLinkMeta` 同样可用于详情抽屉的 `DetailFieldSchema.link`：

```typescript
detail: {
  sections: [{
    fields: [
      { key: "taskTitle", label: "所属任务", type: "link",
        link: { action: "openRelated", resourceKey: "tasks", idField: "taskId" } },
    ],
  }],
}
```

## 行操作

行操作按钮可以定义在 `table.rowActions` 中，也可以通过 `rowActionKeys` 从 `resource.actions` 引用：

```typescript
// 方式一：直接在 table 中定义
rowActions: [
  { key: "edit", label: "编辑", kind: "drawer" },
  { key: "delete", label: "删除", kind: "danger" },
]

// 方式二：引用 resource.actions 中已有的 action
rowActionKeys: ["edit", "delete"],  // 这些在行内展示，其余进 ⋯ 菜单
```

## 批量操作

```typescript
bulkActions: [
  { key: "enable", label: "批量启用", kind: "request", permission: "system:admin" },
  { key: "disable", label: "批量禁用", kind: "danger", permission: "system:admin" },
  {
    key: "assignRoles",
    label: "批量分配角色",
    kind: "assignment",
    api: "/api/v1/admin/users/{id}/roles",
    bulkApi: "/api/v1/admin/users/roles/batch",
    assignment: { ... },
  },
],
```

## 选择器模式

用于在弹窗中选择关联数据的场景（如选择题目、选择模板等）：

```typescript
interface TablePickerMeta {
  enabled?: boolean;                 // 开启选择器模式
  selectionMode?: "single" | "multiple";  // 单选 / 多选
  rowClickSelect?: boolean;          // 点击行即选中，默认 true
  hideActionsColumn?: boolean;       // 隐藏操作列，默认 true
}
```

```typescript
picker: {
  enabled: true,
  selectionMode: "single",           // single | multiple
  rowClickSelect: true,              // 点击行即选中
  hideActionsColumn: true,           // 隐藏操作列
}
```

开启选择器后，表格每行左侧出现 Checkbox（多选）或 Radio（单选），选中行数据通过 `pickerHandlers.onRowSelect` 或 `pickerHandlers.onConfirm` 回调返回给父组件。

```typescript
// 在使用 LHResourcePage 时注册选择回调
<LHResourcePage
  resource={resource}
  pickerHandlers={{
    onRowSelect: (record) => console.log("选中", record),
    onConfirm: (records) => console.log("确认", records),
  }}
/>
```

:::tip
选择器模式常用于：
- 在表单中通过 `dynamicTable` 组件选择关联数据
- 在工作流中打开选择弹窗选择目标项
- 批量操作中选择目标对象
:::
