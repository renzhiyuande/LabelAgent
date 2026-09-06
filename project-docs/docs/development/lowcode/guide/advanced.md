# 高级功能

> **相关文档**：[远程数据加载](./remote) | [表单配置](./form) | [数据表格](./table) | [操作按钮](./actions)

## LLM 辅助标注 `llmSuggest`

用于在标注表单中集成 AI 辅助能力，支持 Chat 与 Agent 两种模式。

```typescript
interface LlmFieldMeta {
  mode?: "chat" | "agent";            // chat=对话建议, agent=结构化填充
  configMode?: "standard" | "pro";    // 标准 / 专业模式
  applyTargets?: string[];            // agent 模式自动填充的字段 path
  systemPrompt?: string;              // 系统提示词
  promptTemplate?: string;            // 用户模板，支持 {{path}} 引用
  contextFields?: string[];           // 注入上下文的字段
  buttonLabel?: string;               // 生成按钮文案
  allowRegenerate?: boolean;          // 允许重新生成
  providerCode?: string;              // 模型提供商
  modelKey?: string;                  // 模型 key
}
```

### Chat 模式

AI 以对话方式给标注员提供建议：

```typescript
{
  key: "llmSuggestion",
  label: "AI 建议",
  component: "llmSuggest",
  llm: {
    mode: "chat",
    promptTemplate: "请分析以下文本：{{payload.text}}",
    contextFields: ["payload.text"],
    buttonLabel: "获取建议",
    allowRegenerate: true,
  },
}
```

### Agent 模式

AI 自动解析结构化 JSON 并写入到指定标注字段：

```typescript
{
  key: "llmAgent",
  label: "AI 标注",
  component: "llmSuggest",
  llm: {
    mode: "agent",
    applyTargets: ["category", "sentiment", "tags"],
    systemPrompt: "你是文本分类专家，请输出 category、sentiment 和 tags",
    promptTemplate: "{{payload.text}}",
  },
}
```

Agent 模式下，点击"获取建议"后引擎自动将 LLM 输出映射到 `applyTargets` 指定的字段中。

## 数组字段 `array`

用于列表形式的子数据录入。支持卡片布局和表格布局两种子项展示方式。

```typescript
{
  key: "items",
  label: "明细项",
  component: "array",
  itemLayout: "card",          // card（默认） | table
  fields: [
    { key: "name", label: "名称", component: "text", required: true },
    { key: "quantity", label: "数量", component: "text", inputType: "number", defaultValue: 1 },
    { key: "price", label: "单价", component: "text", inputType: "number" },
    {
      key: "category",
      label: "分类",
      component: "remoteSelect",
      remote: { source: "categories" },
    },
  ],
}
```

### 卡片布局（`itemLayout: "card"`）

每个数组项渲染为一个独立的卡片：

```
┌─────────────────────────┐
│ 名称: [___________]     │
│ 数量: [__2__] 单价: [__]│
│ 分类: [___________▼]    │
│            [删除]       │
├─────────────────────────┤
│ 名称: [___________]     │     ← 第二项
│ ...                     │
└─────────────────────────┘
                  [+ 添加一项]
```

### 表格布局（`itemLayout: "table"`）

数组项渲染为可编辑表格行：

```
┌──────┬──────┬──────┬──────┐
│ 名称  │ 数量  │ 单价  │ 操作 │
├──────┼──────┼──────┼──────┤
│ xxx  │  2   │ 10.0 │ [删除]│
│ yyy  │  1   │ 20.0 │ [删除]│
└──────┴──────┴──────┴──────┘
                    [+ 添加一行]
```

数组字段也支持 `dependsOn` 和级联联动：

```typescript
{
  key: "items",
  component: "array",
  fields: [
    { key: "provinceId", label: "省份", component: "remoteSelect", remote: { source: "provinces" } },
    {
      key: "cityId",
      label: "城市",
      component: "remoteSelect",
      dependsOn: "provinceId",
      remote: {
        source: "cities",
        params: { provinceId: { from: "provinceId" } },
      },
    },
  ],
}
```

## 内嵌动态表格 `dynamicTable`

在表单中嵌入一个完整的 `LHDataTable`，用于查看和选择关联数据。

```typescript
interface FormDynamicTableMeta {
  columns?: TableColumnSchema[];      // 列定义，默认使用资源配置
  rowKey?: string;
  dataSource?: "resource" | "static"; // resource=API, static=表单内数据
  resourceKey?: string;               // 数据源资源 key
  dataPath?: string;                  // static 时数据在 values 中的路径
  scope?: { field: string; from?: string };
  selectable?: boolean;               // 可选行
  selectionPath?: string;             // 选中值存储路径
  pagination?: boolean;
  pageSize?: number;
  listFilters?: FormDynamicTableListFilter[];
  height?: number;                    // 表格固定高度
  maxHeight?: number;
  rowSelectableWhen?: ConditionMeta[];
  empty?: { title?: string; description?: string };
}
```

### 示例：关联选择

```typescript
{
  key: "selectedItems",
  label: "选择题目",
  component: "dynamicTable",
  dynamicTable: {
    resourceKey: "taskItems",        // 使用 taskItems 资源的数据
    scope: {
      field: "taskId",
      from: "taskId",                // 从表单当前值取
    },
    selectable: true,
    selectionPath: "selectedItemIds",// 选中 ID 存到此字段
    pagination: true,
    pageSize: 10,
    rowSelectableWhen: [
      { field: "status", operator: "eq", value: "UNASSIGNED" },
    ],
    empty: {
      title: "暂无可选题目",
      description: "该任务暂无可用数据",
    },
  },
}
```

## 字段依赖联动 `dependsOn`

当表单某个字段值变化时，自动刷新关联字段的数据：

```typescript
{
  key: "provinceId",
  label: "省份",
  component: "remoteSelect",
  remote: { source: "provinces" },
},
{
  key: "cityId",
  label: "城市",
  component: "remoteSelect",
  dependsOn: "provinceId",          // province 变化时自动刷新 city 选项
  remote: {
    source: "cities",
    params: { provinceId: { from: "provinceId" } },
  },
},
```

支持链式联动：C 依赖 B，B 依赖 A，A 变化时 B 和 C 都重新加载。

## 条件显隐 `visibleWhen` / `disabledWhen`

基于字段值的条件控制：

```typescript
{
  key: "agreeTerms",
  label: "同意条款",
  component: "switch",
},
{
  key: "termsDetail",
  label: "条款详情",
  component: "textarea",
  visibleWhen: [                    // 仅在开关打开时可见
    { field: "agreeTerms", operator: "eq", value: true },
  ],
  disabledWhen: [                   // 在某些条件下禁用
    { field: "status", operator: "in", value: ["SUBMITTED", "APPROVED"] },
  ],
}
```

支持操作符：`eq` / `ne` / `in` / `notIn` / `contains` / `notEmpty`，多个条件为 AND。
