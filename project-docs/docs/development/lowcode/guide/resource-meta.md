# ResourceMeta 顶层配置

> **相关文档**：[页面布局](./page-layouts) | [权限体系](./permissions) | [数据预处理](./data-transform) | [API 端点](./api-definition)

`ResourceMeta` 是低代码引擎的核心数据结构，描述一个完整的业务资源页面。所有页面级别配置都在这里定义。

## 完整结构

```typescript
interface ResourceMeta {
  resource: string;            // 资源唯一标识
  label?: string;              // 页面标题
  idKey: string;               // 主键字段名
  page?: { ... };              // 页面布局模式
  permissions?: { ... };       // 页面级权限
  capabilities?: { ... };      // CRUD 能力开关
  normalizeRecord?: Function;  // 列表/详情数据预处理
  prepareValues?: Function;    // 提交数据预处理
  api: { ... };                // REST API 端点
  metrics?: { ... };           // 顶部统计指标
  filters: { ... };            // 查询栏
  table?: { ... };             // 数据表格
  form: { ... };               // 表单
  detail?: { ... };            // 详情抽屉
  actions?: Array<{ ... }>;    // 行操作按钮
  headerActions?: Array<{ ... }>; // 页面级工具栏按钮
}
```

## 基础属性

| 属性 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `resource` | `string` | ✅ | — | 资源唯一标识，与菜单 `resourceKey` 一致 |
| `label` | `string` | — | — | 页面中文标题 |
| `idKey` | `string` | ✅ | — | 主键字段名，通常为 `"id"` |

```typescript
export const usersResource: ResourceMeta = {
  resource: "users",
  label: "用户管理",
  idKey: "id",
  // ...
};
```

## 能力开关 `capabilities`

控制哪些 CRUD 操作可用：

```typescript
capabilities: {
  query?: boolean;    // 列表查询，默认 true
  detail?: boolean;   // 查看详情
  create?: boolean;   // 新建
  edit?: boolean;     // 编辑
  delete?: boolean;   // 删除
}
```

```typescript
// 只读资源，不可新建/编辑/删除
capabilities: { query: true, detail: true }
```

## 页面布局 `page`

控制页面整体布局风格：

```typescript
page?: {
  key?: "default" | "tree" | "card";

  // tree 布局时
  tree?: { treeColumnKey: string; parentField: string; defaultExpanded?: boolean };

  // card 布局时
  card?: CardPageSchema;
}
```

- `"default"`（默认）：标准查询栏 + 表格
- `"card"`：卡片网格展示
- `"tree"`：左侧树形 + 右侧表格

## 完整类型参考

`ResourceMeta` 中使用的核心类型：

```typescript
// 筛选操作符 — 用于 FilterFieldSchema.operator 和查询 op 字段
type FilterOperator = "eq" | "ne" | "in" | "notIn" | "contains" | "notEmpty" | "like" | "between";

// 条件操作符 — 用于 visibleWhen / disabledWhen
type ConditionOperator = "eq" | "ne" | "in" | "notIn" | "contains" | "notEmpty";

// 动作类别
type ActionKind = "button" | "drawer" | "request" | "danger" | "link" | "assignment" | "workflow";

// 筛选控件
type FilterFieldComponent = "text" | "select" | "multiSelect" | "tags" | "dateRange" | "dateTimeRange" | "numberRange" | "remoteSelect" | "statusSelect" | "number";

// 表格列渲染类型
type TableColumnType = "text" | "number" | "datetime" | "date" | "status" | "switch" | "tags" | "richText" | "file" | "fileUpload" | "image" | "imageUpload" | "json" | "link" | "user";

// 详情字段渲染类型
type DetailFieldType = "text" | "number" | "datetime" | "date" | "status" | "tags" | "richText" | "json" | "link" | "file" | "image" | "enum" | "remoteSchema" | "payloadMap" | "arrayTable" | "dictTagPreview" | "user" | "timeline" | "timelineGroup" | "templateForm";
```

## 数据预处理

```typescript
// 列表/详情数据后处理 — 派生字段、类型转换
normalizeRecord?: (record: Record<string, unknown>) => Record<string, unknown>;

// 表单提交前处理 — 清洗字段、类型转换
prepareValues?: (values: Record<string, unknown>) => Record<string, unknown>;
```

详见 [数据预处理](/development/lowcode/guide/data-transform)。
