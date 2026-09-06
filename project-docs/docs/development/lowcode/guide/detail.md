# 详情抽屉

详情抽屉（`DetailSchema`）定义从数据表格点击查看详情时的弹出内容与布局。它位于表格行操作链路的末端，与表单（`FormSchema`）共用底层字段渲染器。

```
┌──────────────────────────────────────┐
│  查询栏（FilterSchema）               │
├──────────────────────────────────────┤
│  ┌──────┬──────┬──────┬───────┐     │
│  │ 编码  │ 名称  │ 状态  │ 操作  │     │
│  ├──────┼──────┼──────┼───────┤     │
│  │ T01  │ ...  │ 进行  │ 详情 →│     │  ← 点击打开详情抽屉
│  └──────┴──────┴──────┴───────┘     │
├──────────────────────────────────────┤
│  ┌──────────────────────────────┐    │
│  │  详情抽屉                      │    │  ← DetailSchema
│  │  ┌──────────────────────┐    │    │
│  │  │ 任务名称: T01        │    │    │
│  │  │ 状态: [进行]          │    │    │
│  │  │ 描述: 这是一个任务...  │    │    │
│  │  └──────────────────────┘    │    │
│  └──────────────────────────────┘    │
└──────────────────────────────────────┘
```

> **相关文档**：[表单](./form) | [数据表格](./table) | [远程数据加载](./remote) | [ResourceMeta 总览](./resource-meta)

### 学习路径 {#detail-learning-path}

| 步骤 | 内容 | 参考 |
|------|------|------|
| ① | 理解详情结构 `DetailSchema` → `DetailSectionSchema` → `DetailFieldSchema` | 下方 [完整结构](#detail-schema) |
| ② | 掌握字段类型和布局模式 | [字段类型](#detail-field-type) / [布局示例](#detail-layout-examples) |
| ③ | 学习特殊字段类型：远程子表单、数组表格、模板表单 | [特殊类型详解](#detail-special-types) |
| ④ | 了解更多 | 用户列 [`user`](./table#user-field-meta) · 链接列 [`link`](./table#table-column-link-meta) |

## 完整结构 {#detail-schema}

```typescript
interface DetailSchema {
  width?: "sm" | "md" | "lg" | number;     // 抽屉宽度
  layout?: "stack" | "tabs";               // 布局模式
  sections: DetailSectionSchema[];          // 详情分区
}
```

## 详情分区 `DetailSectionSchema` {#detail-section-schema}

```typescript
interface DetailSectionSchema {
  key: string;
  title?: string;
  fields: DetailFieldSchema[];
}
```

## 详情字段 `DetailFieldSchema` {#detail-field-schema}

```typescript
interface DetailFieldSchema {
  key: string;                              // 字段 key
  path?: string;                            // 数据路径，默认同 key
  label: string;                            // 标签
  type?: DetailFieldType;                   // 渲染类型，默认 "text"
  formatter?: DetailFieldFormatter;         // 格式化器
  enum?: OptionItem[];                      // 枚举映射
  /** @deprecated 请使用 enum */
  options?: OptionItem[];                   // 已废弃
  dict?: string;                            // 数据字典
  permission?: string | string[];           // 权限过滤
  // --- 特殊类型配置 ---
  columns?: DetailArrayColumnSchema[];      // type=arrayTable 时的列定义
  user?: UserFieldMeta;                     // 用户展示（同表格 user 列）
  link?: TableColumnLinkMeta;               // 链接（同表格 link 列）
  remoteSchema?: RemoteSchemaMeta;          // 远程动态详情
  templateForm?: DetailTemplateFormMeta;    // 模板表单只读渲染
}
```

### 基础属性 {#detail-field-basic}

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `key` | `string` | ✅ | 字段 key |
| `path` | `string` | — | 数据路径，默认同 `key`；嵌套对象用 `.` 分隔 |
| `label` | `string` | ✅ | 标签 |
| `type` | [`DetailFieldType`](#detail-field-type) | — | 渲染类型，默认 `"text"` |
| `formatter` | [`DetailFieldFormatter`](#detail-field-formatter) | — | 格式化器 |
| `enum` | `OptionItem[]` | — | 枚举映射 |
| `options` | `OptionItem[]` | — | **已废弃**，请使用 `enum` |
| `dict` | `string` | — | 数据字典编码 |
| `permission` | `string \| string[]` | — | 权限过滤 |

### 特殊字段配置 {#detail-field-special}

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `columns` | [`DetailArrayColumnSchema[]`](#detail-array-column-schema) | — | `type="arrayTable"` 时的列定义 |
| `user` | [`UserFieldMeta`](../guide/table#user-field-meta) | — | 用户展示，点击弹出协作用户卡片 |
| `link` | [`TableColumnLinkMeta`](../guide/table#table-column-link-meta) | — | 超链接，可打开关联资源详情 |
| `remoteSchema` | [`RemoteSchemaMeta`](./remote) | — | 远程动态详情 Schema |
| `templateForm` | [`DetailTemplateFormMeta`](#detail-template-form-meta) | — | 模板表单只读渲染 |

## 字段类型 `DetailFieldType` {#detail-field-type}

```typescript
type DetailFieldType =
  | "text" | "number" | "datetime" | "date"
  | "status" | "tags" | "richText" | "json"
  | "link" | "file" | "image" | "enum"
  | "remoteSchema" | "payloadMap" | "arrayTable"
  | "dictTagPreview" | "user"
  | "timeline" | "timelineGroup"
  | "templateForm";
```

| `type` | 说明 |
|--------|------|
| `text` | 文本 |
| `number` | 数字 |
| `datetime` | 日期时间带 icon |
| `date` | 仅日期 |
| `status` | 彩色状态标签（支持 `dict` / `enum` 色调） |
| `tags` | 多标签 |
| `richText` | HTML 富文本渲染 |
| `json` | 格式化 JSON 展示 |
| `link` | 超链接（跳转关联资源，配合 [`link` 属性](#detail-field-special)） |
| `file` | 文件下载 |
| `image` | 图片预览 |
| `enum` | 枚举映射 |
| `remoteSchema` | 远程动态详情（从 API 拉取子详情） |
| `payloadMap` | payload 字段映射展示 |
| `arrayTable` | 表格展示数组数据 |
| `dictTagPreview` | 字典标签预览 |
| `user` | 用户卡片（配合 [`user` 属性](#detail-field-special)） |
| `timeline` | 时间线 |
| `timelineGroup` | 分组时间线 |
| `templateForm` | 模板表单只读渲染 |

## 格式化器 `DetailFieldFormatter` {#detail-field-formatter}

```typescript
type DetailFieldFormatter = "json" | "payloadPreview" | "bytes" | "boolean";
```

| 值 | 效果 | 适用类型 |
|----|------|---------|
| `json` | 格式化 JSON | `json` |
| `payloadPreview` | 摘要预览（截取前 N 字符） | `text` / `json` |
| `bytes` | 字节数格式化（KB/MB/GB） | `number` |
| `boolean` | "是" / "否" | `boolean` |

```typescript
{ key: "payloadPreview", label: "题目摘要", type: "json", formatter: "payloadPreview" }
{ key: "fileSize", label: "文件大小", type: "number", formatter: "bytes" }
{ key: "isActive", label: "是否启用", type: "text", formatter: "boolean" }
```

## 布局示例 {#detail-layout-examples}

### 纵向分段（`stack`，默认）

```typescript
detail: {
  width: "lg",
  sections: [
    {
      key: "basic",
      title: "基础信息",
      fields: [
        { key: "title", label: "任务名称", type: "text" },
        { key: "status", label: "状态", type: "status", dict: "task_status" },
        { key: "deadlineAt", label: "截止时间", type: "datetime" },
        { key: "descriptionText", label: "描述", type: "text" },
      ],
    },
    {
      key: "config",
      title: "配置详情",
      fields: [
        { key: "settingsJson", label: "任务设置", type: "remoteSchema" },
        { key: "rewardRuleJson", label: "奖励规则", type: "remoteSchema" },
      ],
    },
  ],
}
```

### Tab 切换布局

```typescript
detail: {
  width: "lg",
  layout: "tabs",            // Tab 栏可左右滑动
  sections: [
    { key: "basic", title: "基础信息", fields: [ /* ... */ ] },
    { key: "config", title: "配置",     fields: [ /* ... */ ] },
    { key: "logs",   title: "操作日志", fields: [ /* ... */ ] },
  ],
}
```

## 特殊类型详解 {#detail-special-types}

### `remoteSchema` — 远程动态详情 {#detail-remote-schema}

当详情字段结构运行时才能确定时（如奖励规则配置、任务设置），使用 `remoteSchema` 类型：

```typescript
{ key: "rewardRuleJson", label: "奖励规则", type: "remoteSchema" }
```

详情模式下不需要配置 `remoteSchema.api`，引擎自动匹配到表单中同名 `remoteSchema` 的 `binding.payloadField`，使用相同 API 路径加载详情 Schema 并渲染。

### `arrayTable` — 数组表格展示 {#detail-array-table}

将数组数据渲染为表格：

```typescript
{
  key: "items",
  label: "明细项",
  type: "arrayTable",
  columns: [
    { key: "name", label: "名称", type: "text" },
    { key: "quantity", label: "数量", type: "number" },
    { key: "unitPrice", label: "单价", type: "number", formatter: "bytes" },
  ],
}
```

#### `DetailArrayColumnSchema` {#detail-array-column-schema}

```typescript
interface DetailArrayColumnSchema {
  key: string;
  label: string;
  type?: "text" | "number" | "datetime" | "date" | "enum" | "json" | "tags";
  formatter?: "json" | "payloadPreview" | "bytes" | "boolean";
  enum?: OptionItem[];          // type=enum 时的静态选项映射
}
```

| 属性 | 类型 | 说明 |
|------|------|------|
| `key` | `string` | 字段名 |
| `label` | `string` | 列标题 |
| `type` | `DetailArrayColumnType` | 列渲染类型（`text` / `number` / `datetime` / `date` / `enum` / `json` / `tags`） |
| `formatter` | `DetailFieldFormatter` | 格式化器 |
| `enum` | `OptionItem[]` | `type=enum` 时的选项映射 |

### `templateForm` — 模板表单只读渲染 {#detail-template-form}

渲染一个基于模板 Schema 的只读表单，用于展示标注结果、提交数据等：

```typescript
{
  key: "annotationResult",
  label: "标注结果",
  type: "templateForm",
  templateForm: {
    role: "display",                    // display | input
    schemaField: "templateSchemaJson",  // Schema 数据字段，默认 templateSchemaJson
    dataField: "submitData",            // 表单值字段，默认 submitData
  },
}
```

#### `DetailTemplateFormMeta` {#detail-template-form-meta}

```typescript
interface DetailTemplateFormMeta {
  schemaField?: string;         // 模板 Schema JSON 字段，默认 "templateSchemaJson"
  dataField?: string;           // 表单值字段，默认 "submitData"
  role?: "input" | "display";  // display=题目展示区；input=标注作答区
}
```

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `schemaField` | `string` | `"templateSchemaJson"` | 模板 Schema 所在字段 |
| `dataField` | `string` | `"submitData"` | 表单值所在字段 |
| `role` | `"display"` / `"input"` | — | `display` = 题目展示区，`input` = 标注作答区 |
