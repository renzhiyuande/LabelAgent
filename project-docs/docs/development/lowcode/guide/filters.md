# 查询栏

> **相关文档**：[远程数据加载](./remote) | [权限控制](./permissions) | [数据表格](./table) | [ResourceMeta 总览](./resource-meta)

查询栏（`FilterSchema`）位于页面顶部，提供多字段筛选能力。引擎自动处理状态同步、URL 参数同步和筛选条件提交。

## 完整结构

```typescript
interface FilterSchema {
  fields: FilterFieldSchema[];
  primary?: string[];         // 主筛选字段 key（默认展示），多余字段自动折叠
  collapsible?: {
    mode?: "auto" | "always";
    defaultExpanded?: boolean;
    collapsedRows?: number;       // 折叠行数，默认 1
    collapsedFields?: string[];   // 参与折叠的字段 key
  };
}
```

## 筛选字段 `FilterFieldSchema`

| 属性 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `key` | `string` | ✅ | 字段唯一标识 |
| `label` | `string` | ✅ | 显示名称 |
| `component` | [`FilterFieldComponent`](#filterfieldcomponent-控件类型速查) | ✅ | 控件类型 |
| `field` | `string` | — | 提交到后端的参数名，默认同 `key` |
| `operator` | [`FilterOperator`](#filteroperator-操作符速查) | — | 查询操作符 |
| `placeholder` | `string` | — | 占位提示 |
| `defaultValue` | `unknown` | — | 默认值 |
| `options` | `OptionItem[]` | — | 静态选项列表 |
| `dict` | `string` | — | 数据字典编码，运行时从 `/api/v1/system/dicts/{dictCode}` 加载 |
| `remote` | [`RemoteOptionMeta`](./remote) | — | 远程选项配置（详见[远程选项](./remote)） |
| `permission` | `string[]` | — | 权限过滤 |

### `FilterFieldComponent` 控件类型速查

| `component` | 控件 | 说明 |
|---|---|---|
| `text` | 文本输入 | 支持回车触发搜索 |
| `select` | 下拉选择 | 配合 `options` / `dict` |
| `remoteSelect` | 远程下拉 | 配合 `remote` |
| `multiSelect` | 多选 | 数组值 |
| `tags` | 标签选择 | 数组值 |
| `dateRange` | 日期范围 | `operator` 建议 `between` |
| `dateTimeRange` | 日期时间范围 | `operator` 建议 `between` |
| `numberRange` | 数字范围 | `operator` 建议 `between` |
| `statusSelect` | 状态筛选 | 映射为 `select`，`placeholder` 固定为"全部" |
| `number` | 数字输入 | 精确匹配数值 |

### `FilterOperator` 操作符速查

筛选字段的 `operator` 指定查询操作符，使用 `FilterOperator` 类型：

| 操作符 | 说明 | 适用控件 |
|--------|------|---------|
| `eq` | 等于（精确匹配） | `text` / `select` / `remoteSelect` / `number` |
| `ne` | 不等于 | `select` / `remoteSelect` |
| `in` | 包含（数组值） | `multiSelect` / `tags` |
| `notIn` | 不包含 | `multiSelect` / `tags` |
| `like` | 模糊匹配 | `text` |
| `contains` | 包含 | `text` / `tags` |
| `notEmpty` | 非空 | `text` |
| `between` | 范围查询 | `dateRange` / `dateTimeRange` / `numberRange` |

## 基础示例

```typescript
filters: {
  primary: ["keyword", "status"],     // 默认展开的筛选字段
  fields: [
    {
      key: "keyword",
      label: "关键词",
      component: "text",
      field: "keyword",
      operator: "like",
      placeholder: "搜索任务名称 / 描述",
    },
    {
      key: "status",
      label: "状态",
      component: "select",
      field: "status",
      operator: "eq",
      dict: "task_status",           // 数据字典
    },
    {
      key: "createdAt",
      label: "创建时间",
      component: "dateRange",
      field: "createdAt",
      operator: "between",
    },
  ],
}
```

## `primary` 折叠机制

- 出现在 `primary` 数组中的字段默认在首屏展示
- 未出现在 `primary` 中的字段自动折叠到"展开更多"区域
- 建议 `primary` 中放 3~4 个高频筛选字段

```typescript
primary: ["keyword", "status"],   // keyword 和 status 默认可见
// sceneCode, createdAt 等字段自动折叠
```

## 静态选项 vs 数据字典 vs 远程选项

### 静态选项（`options`）

```typescript
{
  key: "type",
  label: "类型",
  component: "select",
  options: [
    { label: "文本", value: "TEXT" },
    { label: "图片", value: "IMAGE" },
    { label: "视频", value: "VIDEO" },
  ],
}
```

### 数据字典（`dict`）

从后端数据字典服务自动加载：

```typescript
{
  key: "status",
  label: "状态",
  component: "select",
  dict: "common_status",     // 后台字典编码
}
```

### 远程选项（`remote`）

从自定义 API 加载：

```typescript
{
  key: "assignee",
  label: "负责人",
  component: "remoteSelect",
  remote: {
    source: "users",           // 对应 api.options.users
    searchParam: "keyword",    // 搜索参数名
  },
}
```

## 折叠控制

```typescript
collapsible: {
  mode: "auto",               // auto=自动折叠 | always=始终折叠
  defaultExpanded: false,     // 默认收起
  collapsedRows: 2,           // 展开时最多显示 2 行
  collapsedFields: ["status"],// 指定折叠哪些字段
}
```

:::tip
查询栏支持**响应式**布局——窄屏时自动变横向滚动或竖向排列。如有特殊布局需求可通过 `width` 控制输入框宽度。
:::
