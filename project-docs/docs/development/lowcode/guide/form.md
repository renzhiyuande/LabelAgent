# 表单

表单（`FormSchema`）是低代码引擎中**最核心也最复杂的部分**。它定义创建/编辑/分配的交互界面，支持远程选项加载、依赖联动、条件显隐、动态子表单、数组字段、LLM 辅助等丰富能力。

```
┌──────────────────────────────────────┐
│  查询栏（FilterSchema）               │  ← 筛选后进入列表
├──────────────────────────────────────┤
│  ┌──────┬──────┬──────┬───────┐     │
│  │ 编码  │ 名称  │ 状态  │ 操作  │     │
│  ├──────┼──────┼──────┼───────┤     │
│  │ T01  │ ...  │ 进行  │ 编辑 → │     │  ← 点击打开表单抽屉
│  └──────┴──────┴──────┴───────┘     │
├──────────────────────────────────────┤
│  ┌──────────────────────────────┐    │
│  │  表单抽屉                      │    │  ← FormSchema
│  │  ┌──────┬──────────────┐     │    │
│  │  │ 名称 │ [_________]  │     │    │
│  │  │ 状态 │ [____▼___]  │     │    │
│  │  │ 描述 │ [_________]  │     │    │
│  │  └──────┴──────────────┘     │    │
│  │       [取消]  [保存]          │    │
│  └──────────────────────────────┘    │
└──────────────────────────────────────┘
```

> **相关文档**：[远程数据加载](./remote) | [文件上传](./upload) | [权限控制](./permissions) | [动态表格](./table) | [API 端点](./api-definition) | [数据预处理](./data-transform) | [高级功能](./advanced)

### 学习路径

| 步骤 | 内容 | 参考 |
|------|------|------|
| ① | 理解表单结构 `FormSchema` → `FormSectionSchema` → `FormFieldSchema` | 下方 [完整结构](#form-schema) |
| ② | 掌握常用控件配置（文本、选择、开关、日期等） | [字段示例](#form-field-examples) |
| ③ | 学习高级能力：联动、校验、模式区分、显示控件 | [字段示例](#form-field-examples) / [校验规则](#form-validation-rules) |
| ④ | 探索远程子表单、数组字段、LLM 等 | [远程](./remote) / [高级功能](./advanced) |

## 完整结构 {#form-schema}

```typescript
interface FormSchema {
  title?: string;                     // 抽屉标题
  description?: string;               // 抽屉描述
  width?: "sm" | "md" | "lg" | number;  // 抽屉宽度
  sections: FormSectionSchema[];      // 表单分区
  actions: DrawerSubmitAction[];      // 底部按钮
}
```

## 表单分区 `FormSectionSchema` {#form-section-schema}

表单按 `sections` 分区展示，每个分区可以有独立的标题和字段：

```typescript
interface FormSectionSchema {
  key: string;
  title?: string;
  description?: string;
  visibleIn?: ("create" | "edit" | "assignment")[];  // 限定表单模式
  fields: FormFieldSchema[];
}
```

```typescript
sections: [
  {
    key: "basic",
    title: "基础信息",
    fields: [ /* ... */ ],
  },
  {
    key: "advanced",
    title: "高级设置",
    visibleIn: ["edit"],       // 仅在编辑时展示
    fields: [ /* ... */ ],
  },
],
```

## 表单字段 `FormFieldSchema` {#form-field-schema}

```typescript
interface FormFieldSchema {
  key: string;                          // 字段标识
  path?: string;                        // 提交路径，默认同 key
  label: string;                        // 标签
  component: FormFieldComponent;        // 控件类型
  inputType?: "text" | "number" | "password";  // 输入框类型
  required?: boolean;                   // 必填
  readonly?: boolean;                   // 只读
  hidden?: boolean;                     // 隐藏
  placeholder?: string;                 // 占位
  description?: string;                 // 字段描述
  span?: 12 | 24;                       // 栅格宽度
  defaultValue?: unknown;               // 默认值
  // --- 选项数据 ---
  options?: OptionItem[];               // 静态选项
  dict?: string;                        // 数据字典编码
  optionsFrom?: string;                 // 动态选项来源字段
  optionMap?: Record<string, OptionItem[]>; // 动态选项映射
  remote?: RemoteOptionMeta;            // 远程 API 加载
  // --- 条件控制 ---
  visibleIn?: FormMode[];               // 指定模式展示
  disabledIn?: FormMode[];              // 指定模式禁用
  visibleWhen?: ConditionMeta[];        // 条件显隐
  disabledWhen?: ConditionMeta[];       // 条件禁用
  permission?: string | string[];       // 权限
  // --- 高级功能 ---
  dependsOn?: string;                   // 依赖联动
  remoteSchema?: RemoteSchemaMeta;      // 远程子表单
  fields?: FormFieldSchema[];           // 子字段（array）
  itemLayout?: "card" | "table";        // array 子项布局
  rules?: ValidationRuleMeta[];         // 校验规则
  upload?: UploadFieldMeta;             // 上传配置
  dynamicTable?: FormDynamicTableMeta;  // 内嵌表格
  llm?: LlmFieldMeta;                   // LLM 辅助标注
  assignment?: AssignmentFieldMeta;     // 分配配置
  meta?: FormFieldImportMeta;           // 导入元数据
  user?: UserFieldMeta;                 // 用户选择
  // --- 展示控件配置 ---
  formatter?: string;                   // 格式化方式
  displayType?: DetailFieldType;        // 值类型提示
  showItem?: ShowItemFieldMeta;         // 展示项配置
  showImage?: ShowImageFieldMeta;       // 图片展示
  showFile?: ShowFileFieldMeta;         // 文件展示
  showVideo?: ShowVideoFieldMeta;       // 视频展示
  richText?: RichTextFieldMeta;         // 富文本配置
}
```

### 基础属性 {#form-field-basic}

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `key` | `string` | ✅ | 字段标识，表单内唯一 |
| `path` | `string` | — | 提交路径，默认同 `key`；嵌套对象用 `.` 分隔如 `address.city` |
| `label` | `string` | ✅ | 标签 |
| `component` | [`FormFieldComponent`](#form-field-component-types) | ✅ | 控件类型 |
| `required` | `boolean` | — | 必填（自动生成 required 校验规则） |
| `readonly` | `boolean` | — | 只读 |
| `hidden` | `boolean` | — | 隐藏（保留值但不渲染控件） |
| `placeholder` | `string` | — | 占位提示 |
| `description` | `string` | — | 字段描述（灰色小字） |
| `span` | `12 \| 24` | — | 栅格宽度，12 为半宽，24 为全宽 |
| `defaultValue` | `unknown` | — | 默认值 |
| `inputType` | `"text" \| "number" \| "password"` | — | 输入框类型（仅 `component: "text"` 生效） |

### 选项数据 {#form-field-options}

| 属性 | 类型 | 说明 |
|------|------|------|
| `options` | `OptionItem[]` | 静态选项列表 |
| `dict` | `string` | 数据字典编码，运行时从 `/api/v1/system/dicts/{dictCode}` 加载 |
| `optionsFrom` | `string` | 动态选项来源字段，从表单其他字段取值作为选项 |
| `optionMap` | `Record<string, OptionItem[]>` | 动态选项映射，key 为条件值，value 为对应选项 |
| `remote` | [`RemoteOptionMeta`](#remote-param-from) | 远程 API 加载选项，传参方式见 [`{ from }` 语法](#remote-param-from) |

### 条件控制 {#form-field-conditional}

| 属性 | 类型 | 说明 |
|------|------|------|
| `visibleIn` | `FormMode[]` | 仅指定模式展示（`create` / `edit` / `assignment`） |
| `disabledIn` | `FormMode[]` | 指定模式中禁用（仍展示但不可编辑） |
| `visibleWhen` | `ConditionMeta[]` | 条件显隐（详见[条件控制](#form-field-conditional-detail)） |
| `disabledWhen` | `ConditionMeta[]` | 条件禁用 |
| `permission` | `string \| string[]` | 权限过滤（详见[权限控制](./permissions)） |

### 高级功能 {#form-field-advanced}

| 属性 | 类型 | 说明 |
|------|------|------|
| `dependsOn` | `string` | 依赖字段 key，值变化时触发字段刷新（刷新远程选项、重算 `optionMap` 等）；远程传参方式见 [`{ from }` 语法](#remote-param-from) |
| `remoteSchema` | [`RemoteSchemaMeta`](#form-example-remote-schema) | 远程动态子表单，详见下方[字段示例](#form-example-remote-schema) |
| `fields` | [`FormFieldSchema[]`](#form-field-schema) | 子字段定义（array 类型控件的子项） |
| `itemLayout` | `"card" \| "table"` | array 子项布局：卡片（默认）或可编辑表格 |
| `rules` | [`ValidationRuleMeta[]`](#form-validation-rules) | 校验规则 |
| `upload` | [`UploadFieldMeta`](#form-example-upload) | 文件/图片上传配置，详见下方[字段示例](#form-example-upload) |
| `dynamicTable` | [`FormDynamicTableMeta`](#form-field-dynamic-table) | 内嵌数据表格，详见[动态表格](#form-field-dynamic-table) |
| `llm` | [`LlmFieldMeta`](#form-field-llm) | LLM 辅助标注配置（Chat/Agent 模式） |
| `assignment` | `AssignmentFieldMeta` | 分配操作配置（配合 `component: "user"` 或分配场景） |
| `meta` | `FormFieldImportMeta` | 导入数据契约相关元数据 |
| `user` | [`UserFieldMeta`](#form-example-user) | 用户选择配置，详见下方[字段示例](#form-example-user) |

### 展示控件配置 {#form-field-display}

| 属性 | 类型 | 说明 |
|------|------|------|
| `formatter` | `string` | 展示控件格式化方式，详见[格式化器](../guide/table#table-column-formatter) |
| `displayType` | `DetailFieldType` | 值类型提示，取值同[详情字段类型](../guide/detail#字段类型-detailfieldtype)：`text` / `number` / `datetime` / `date` / `status` / `tags` / `richText` / `json` / `link` / `file` / `image` / `enum` / `remoteSchema` / `arrayTable` / `user` / `timeline` 等 |
| `showItem` | [`ShowItemFieldMeta`](#showitemfieldmeta) | 展示项控件配置（支持模板插值、Markdown 渲染等） |
| `showImage` | [`ShowImageFieldMeta`](#showimagefieldmeta) | 图片展示控件配置 |
| `showFile` | [`ShowFileFieldMeta`](#showfilefieldmeta) | 文件展示控件配置 |
| `showVideo` | [`ShowVideoFieldMeta`](#showvideofieldmeta) | 视频展示控件配置 |
| `richText` | [`RichTextFieldMeta`](#richtextfieldmeta) | 富文本配置（关联素材库等） |

#### `ShowItemFieldMeta` {#showitemfieldmeta}

展示项控件配置，用于只读渲染文本、Markdown、JSON 或 HTML 内容。

```typescript
interface ShowItemFieldMeta {
  contentSource?: "payload" | "static" | "template";  // 数据来源
  staticContent?: string;              // contentSource=static 时的固定内容
  templateContent?: string;            // contentSource=template 时的模板，支持 {{path}}
  renderAs?: "text" | "markdown" | "json" | "html";   // 渲染方式
  layout?: "inline" | "card" | "pre" | "table";       // 布局
  heightMode?: "fixed" | "auto";       // 高度模式
  maxHeight?: number;                  // fixed 时的固定高度（px）
}
```

| 属性 | 类型 | 说明 |
|------|------|------|
| `contentSource` | `"payload"` / `"static"` / `"template"` | 数据来源：题目导入列 / 固定文案 / 模板插值 |
| `staticContent` | `string` | 固定展示内容 |
| `templateContent` | `string` | 模板内容，支持 `{{path}}` 引用表单值 |
| `renderAs` | `"text"` / `"markdown"` / `"json"` / `"html"` | 渲染方式 |
| `layout` | `"inline"` / `"card"` / `"pre"` / `"table"` | 布局样式 |
| `heightMode` | `"fixed"` / `"auto"` | 高度模式，默认 auto |
| `maxHeight` | `number` | `heightMode=fixed` 时的固定高度（px） |

#### `ShowImageFieldMeta` {#showimagefieldmeta}

图片展示控件配置，支持素材库引用、固定 URL 或 payload 数据源。

```typescript
interface ShowImageFieldMeta {
  contentSource?: "payload" | "asset" | "static";  // 数据来源
  asset?: FileAssetRef;              // 素材库单图
  assets?: FileAssetRef[];           // 素材库多图
  staticUrl?: string;                // 固定图片 URL（单图）
  staticUrls?: string[];             // 固定图片 URL 列表（多图）
  alt?: string;                      // 替代文本
  fit?: "contain" | "cover";         // 缩放方式
  maxHeight?: number;                // 最大高度
  multiple?: boolean;                // 多图模式
  maxCount?: number;                 // 最大数量
  displayMode?: "thumbnail" | "list" | "card";  // 展示方式
  previewOnClick?: boolean;          // 点击预览
  showFileName?: boolean;            // 显示文件名
}
```

#### `ShowFileFieldMeta` {#showfilefieldmeta}

文件展示控件配置，用于只读展示文件链接和下载。

```typescript
interface ShowFileFieldMeta {
  contentSource?: "payload" | "asset" | "static";
  asset?: FileAssetRef;
  staticUrl?: string;
  showSize?: boolean;                // 显示文件大小
  maxHeight?: number;                // 最大高度（px）
}
```

#### `ShowVideoFieldMeta` {#showvideofieldmeta}

视频展示控件配置，用于只读播放视频。

```typescript
interface ShowVideoFieldMeta {
  contentSource?: "payload" | "asset" | "static";
  asset?: FileAssetRef;
  staticUrl?: string;
  showFileName?: boolean;            // 显示文件名
  maxHeight?: number;                // 播放器最大高度（px），默认 360
  controls?: boolean;                // 显示播放控件
  autoPlay?: boolean;                // 自动播放
  muted?: boolean;                   // 静音
  loop?: boolean;                    // 循环播放
}
```

#### `RichTextFieldMeta` {#richtextfieldmeta}

富文本字段扩展配置，主要用于素材库集成。

```typescript
interface RichTextFieldMeta {
  enableAssetLibrary?: boolean;       // 允许从素材库插入图片
  assets?: FileAssetRef[];            // 设计器登记的素材引用
  imageMaxHeight?: number;            // 素材图片最大高度（px），默认 240
  imageFit?: "contain" | "cover";    // 素材图片缩放方式
  previewImageResize?: boolean;       // 预览态允许调整单张尺寸
}
```

## 校验规则 `ValidationRuleMeta` {#form-validation-rules}

| 类型 | 参数 | 说明 |
|------|------|------|
| `required` | — | 非空（用 `field.required: true` 即可，自动生成） |
| `minLength` | `value: number` | 最小字符数 |
| `maxLength` | `value: number` | 最大字符数 |
| `min` | `value: number` | 最小值 |
| `max` | `value: number` | 最大值 |
| `pattern` | `value: string` | 正则匹配 |
| `email` | — | 邮箱格式 |
| `phone` | — | 手机号格式（11 位） |

```typescript
rules: [
  { type: "required", message: "请填写名称" },
  { type: "minLength", value: 2, message: "至少 2 个字符" },
  { type: "maxLength", value: 128, message: "不能超过 128 字符" },
  { type: "pattern", value: "^[A-Z][a-z]+$", message: "首字母大写" },
]
```

:::tip
`required: true` 会自动生成 `{ type: "required" }` 规则，无需重复写。
:::

## 表单模式区分 {#form-mode}

同个资源配置可以用于 `create` / `edit` / `assignment` 三种模式：

```typescript
// 只在编辑时展示的字段
{ key: "versionNo", label: "版本号", component: "text",
  visibleIn: ["edit"], readonly: true }

// 只在创建时展示的字段
{ key: "password", label: "密码", component: "text", inputType: "password",
  visibleIn: ["create"] }

// 编辑时禁用（不可修改）
{ key: "taskCode", label: "任务编码", component: "text",
  disabledIn: ["edit"] }

// 整个分区只在编辑时展示
{ key: "advanced", title: "高级设置",
  visibleIn: ["edit"],
  fields: [ /* ... */ ] }
```

## 控件类型速查 {#form-field-component-types}

| `component` | 控件 | 说明 |
|---|---|---|
| `text` | 文本输入 | 支持 `inputType: "password"` |
| `number` | 数字输入 | 等效 `text` + `inputType: "number"` |
| `textarea` | 多行文本 | — |
| `userMentionTextarea` | @用户提及 | 配合 `options` |
| `select` | 下拉选择 | 配合 `options` / `dict` |
| `remoteSelect` | 远程下拉 | 配合 `remote` |
| `remoteTreeSelect` | 远程树形下拉 | `remote.variant: "tree"` |
| `treeMultiSelect` | 树形多选 | — |
| `multiSelect` | 多选 | — |
| `radioGroup` | 单选 | — |
| `checkboxGroup` | 多选组 | — |
| `switch` | 开关 | 布尔值 |
| `datetime` | 日期时间 | — |
| `dateRange` | 日期范围 | — |
| `dateTimeRange` | 日期时间范围 | — |
| `numberRange` | 数字范围 | — |
| `json` / `jsonEditor` | JSON 编辑器 | Monaco Editor |
| `codeEditor` | 代码编辑器 | — |
| `richText` | 富文本 | 支持素材库 |
| `fileUpload` | 文件上传 | 配合 `upload` |
| `imageUpload` | 图片上传 | 配合 `upload` |
| `remoteSchema` | 远程子表单 | 动态加载 |
| `array` | 数组字段 | 子项可 `card` / `table` 布局 |
| `dynamicTable` | 内嵌表格 | 嵌入 LHDataTable |
| `user` | 用户选择 | — |
| `assignmentPicker` | 分配选择器 | 配合 `assignment` |
| `showItem` / `showImage` / `showFile` / `showVideo` | 只读展示 | 详见[展示控件](#form-field-display) |
| `dictTagTone` / `dictTagClassName` / `dictTagPreview` | 字典标签 | 设计器/预览专用 |
| `llmSuggest` | LLM 建议 | AI 辅助 |
| `tags` | 标签 | — |

## 条件控制 `visibleWhen` / `disabledWhen` {#form-field-conditional-detail}

基于字段值的条件控制，支持以下操作符（`ConditionOperator`）：

| 操作符 | 含义 | 示例 |
|--------|------|------|
| `eq` | 等于 | `{ field: "status", operator: "eq", value: "DRAFT" }` |
| `ne` | 不等于 | `{ field: "status", operator: "ne", value: "ARCHIVED" }` |
| `in` | 在列表中 | `{ field: "status", operator: "in", value: ["DRAFT", "PAUSED"] }` |
| `notIn` | 不在列表中 | `{ field: "status", operator: "notIn", value: ["DELETED"] }` |
| `contains` | 包含 | `{ field: "tags", operator: "contains", value: "重要" }` |
| `notEmpty` | 非空 | `{ field: "remark", operator: "notEmpty" }` |

多个条件为 AND 关系：

```typescript
{
  key: "discountRate",
  label: "折扣率",
  component: "number",
  visibleWhen: [
    { field: "hasDiscount", operator: "eq", value: true },
    { field: "status", operator: "ne", value: "CLOSED" },
  ],
}
```

:::tip
`visibleWhen` 控制**显隐**（条件不满足时隐藏整个字段），`disabledWhen` 控制**禁用**（条件不满足时字段灰色不可编辑但可见）。两者可以叠加使用。
:::

## 动态表格 `dynamicTable` {#form-field-dynamic-table}

在表单中嵌入 `LHDataTable`，用于选择关联数据或展示子列表：

```typescript
interface FormDynamicTableMeta {
  columns?: TableColumnSchema[];       // 列定义，默认使用目标资源配置
  rowKey?: string;
  dataSource?: "resource" | "static"; // 数据来源
  resourceKey?: string;                // 数据源资源 key
  dataPath?: string;                   // static 模式数据路径
  scope?: { field: string; from?: string };
  selectable?: boolean;                // 可选行
  selectionPath?: string;              // 选中值存储路径
  pagination?: boolean;
  pageSize?: number;
  listFilters?: FormDynamicTableListFilter[];
  height?: number;                     // 固定高度
  maxHeight?: number;
  rowSelectableWhen?: ConditionMeta[];
  empty?: { title?: string; description?: string };
}
```

```typescript
{
  key: "selectedItems",
  label: "选择题目",
  component: "dynamicTable",
  dynamicTable: {
    resourceKey: "taskItems",
    scope: { field: "taskId", from: "taskId" },
    selectable: true,
    selectionPath: "selectedItemIds",
    rowSelectableWhen: [{ field: "status", operator: "eq", value: "UNASSIGNED" }],
    empty: { title: "暂无可选题目" },
  },
}
```

## 字段示例 {#form-field-examples}

### 基础控件

#### 文本输入 {#form-example-text}

```typescript
{ key: "username", label: "用户名", component: "text", required: true,
  rules: [{ type: "minLength", value: 3, message: "至少 3 个字符" }] }
// 密码
{ key: "password", label: "密码", component: "text", inputType: "password" }
```

#### 多行文本

```typescript
{ key: "descriptionText", label: "任务描述", component: "textarea",
  rules: [{ type: "maxLength", value: 2048, message: "不能超过 2048 字符" }] }
```

#### 下拉选择（数据字典） {#form-example-select}

```typescript
{ key: "status", label: "状态", component: "select", dict: "task_status" }
```

#### 开关

```typescript
{ key: "autoSave", label: "自动保存", component: "switch", defaultValue: false }
```

#### JSON 编辑器

```typescript
{ key: "draftData", label: "草稿数据", component: "json", defaultValue: {} }
```

### 远程数据加载

#### 远程下拉 {#form-example-remote}

```typescript
{
  key: "distributeStrategy",
  label: "分发策略",
  component: "remoteSelect",
  required: true,
  defaultValue: "FIRST_COME",
  remote: { source: "distributeStrategies" },
}
```

#### 远程参数绑定 `{ from }` 语法 {#remote-param-from}

远程下拉框的 `remote.params` 支持两种传参方式：

| 语法 | 说明 | 示例 |
|------|------|------|
| `key: "静态值"` | 固定参数值 | `role: "LABELER"` |
| `key: { from: "字段path" }` | 从表单字段动态取值 | `provinceId: { from: "provinceId" }` |

使用 `{ from }` 时，引擎会自动监听源字段的变化，值变化时重新请求远程选项。**`{ from }` 已取代旧的 `dependsOn` 模式**：

```typescript
// ✅ 现代写法 — params 中声明依赖关系
{
  key: "cityId", label: "城市", component: "remoteSelect",
  remote: {
    source: "cities",
    params: { provinceId: { from: "provinceId" } },  // 声明数据绑定
  },
  dependsOn: "provinceId",   // 声明生命周期依赖（触发刷新）
}

// 等效于旧版写法（已废弃）：
// remote: { source: "cities", dependsOn: "provinceId" }
```

`{ from }` 也支持可选标记：

```typescript
params: {
  optionalField: { from: "maybeMissingField", required: false },  // 字段不存在时不传参
  requiredField: { from: "mustExist", required: true },           // 字段不存在时跳过请求
}
```

#### 级联远程下拉

```typescript
{
  key: "cityId",
  label: "城市",
  component: "remoteSelect",
  remote: {
    source: "cities",
    params: {
      provinceId: { from: "provinceId" },
    },
  },
  dependsOn: "provinceId",
}
```

### 媒体与展示

#### 图片上传 {#form-example-upload}

```typescript
{
  key: "coverImage",
  label: "封面图",
  component: "imageUpload",
  upload: {
    multiple: false,
    maxSizeMb: 5,
    accept: "image/*",
    displayMode: "thumbnail",
  },
}
```

#### 用户选择 {#form-example-user}

```typescript
{
  key: "assigneeId",
  label: "负责人",
  component: "user",
  user: { role: "LABELER" },
}
```

#### 富文本（素材库） {#form-example-richtext}

```typescript
{
  key: "descriptionHtml",
  label: "详细描述",
  component: "richText",
  richText: {
    enableAssetLibrary: true,     // 允许从素材库插入图片
    imageMaxHeight: 240,
    imageFit: "contain",
  },
}
```

### 高级功能

#### 远程子表单 {#form-example-remote-schema}

动态加载子表单结构，详见 [远程子表单详解](./remote#远程子表单-remoteschemameta)：

```typescript
{
  key: "rewardRuleConfig",
  label: "规则配置",
  component: "remoteSchema",
  remoteSchema: {
    api: "/api/v1/owner/remote-schemas/rewardRules/{rewardRuleMode}/form-schema",
    dependsOn: "rewardRuleMode",
    binding: {
      payloadField: "rewardRuleJson",
      discriminatorKey: "mode",
    },
  },
}
```

#### LLM 建议 `llmSuggest` {#form-field-llm}

集成 AI 辅助能力，支持 Chat（对话建议）和 Agent（结构化填充）两种模式：

```typescript
{
  key: "llmSuggestion",
  label: "AI 建议",
  component: "llmSuggest",
  llm: {
    mode: "agent",                      // chat | agent
    applyTargets: ["category", "sentiment"],
    promptTemplate: "{{payload.text}}",
    buttonLabel: "获取建议",
    allowRegenerate: true,
  },
}
```

详见 [高级功能 - LLM 辅助标注](../guide/advanced#llm-辅助标注-llmsuggest)。

#### 分配选择器

```typescript
{
  key: "roleIds",
  label: "分配角色",
  component: "assignmentPicker",
  assignment: {
    payloadKey: "roleIds",
    candidatesSource: "roles",
    variant: "flat",
  },
}
```

## 底部按钮 {#form-actions}

```typescript
actions: [
  { key: "cancel", label: "取消" },
  { key: "submit", label: "保存", kind: "submit" },
]
```

- `kind: "submit"` 提交表单，触发引擎的提交流程
- 不带 `kind` 或 `kind: "secondary"` 为辅助按钮，调用 `action.key` 对应的回调
