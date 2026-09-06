# 最佳实践

> **相关文档**：[数据预处理](./data-transform) | [表单配置](./form) | [查询栏](./filters) | [数据表格](./table) | [页面布局](./page-layouts) | [注册接入](./registration)

## 1. 优先使用数据字典 `dict`

状态类字段应使用数据字典，而非硬编码枚举：

```typescript
// ✅ 推荐
{ key: "status", title: "状态", type: "status", dict: "task_status" }

// ❌ 避免 — 字典变化时前端代码需要同步修改
{ key: "status", title: "状态", type: "status", enum: [
  { value: "DRAFT", label: "草稿", tone: "default" },
]}
```

优势：状态值在字典中统一管理，新增/修改字典值不需要改前端代码。

## 2. 总是写 `prepareValues`

**重要**：不写 `prepareValues` 会导致表单所有字段（包括前端临时字段）都发送到后端，可能引发反序列化异常。

```typescript
prepareValues: (values) => ({
  username: values.username,
  displayName: values.displayName,
  email: values.email || null,
  // 只拿后端需要的字段
}),
```

## 3. 利用 `normalizeRecord` 做数据转换

派生字段、布尔标准化、ID 格式化都在此处理，组件里不要写行内计算：

```typescript
normalizeRecord: (record) => ({
  ...record,
  readiness: computeReadiness(record),
  roleNames: extractRoleNames(record.roles),
  isActive: record.status === "ACTIVE",
}),
```

## 4. `visibleWhen` 替代自定义显隐逻辑

在 schema 中用声明式条件，不要在页面组件中写 `if/else`：

```typescript
// ✅ Schema 声明式
visibleWhen: [{ field: "status", operator: "eq", value: "DRAFT" }],

// ❌ 避免在组件中手写条件判断
```

## 5. `remoteSchema` 处理动态表单

表单结构运行时才能确定时（如奖励规则配置、任务设置），使用 `remoteSchema`。

```typescript
{
  key: "config",
  component: "remoteSchema",
  remoteSchema: {
    api: "/api/v1/schemas/{type}/form",
    dependsOn: "type",
    binding: { payloadField: "configJson" },
  },
}
```

## 6. 侧面板优于自定义弹窗

关联子资源的管理优先使用 `sidePanel` 而非自定义弹窗：

```typescript
{
  key: "manageMembers",
  kind: "request",
  sidePanel: {
    resourceKey: "taskMembers",       // 复用已有资源配置
    scope: { field: "taskId", from: "id" },
    hideFilters: ["taskId"],
    title: "{title} · 成员管理",
  },
}
```

## 7. `rowActionKeys` 控制行内按钮密度

高频操作设为行内按钮，低频操作放 ⋯ 菜单：

```typescript
rowActionKeys: ["edit", "delete"],   // 高频，直接可见
// 其他操作自动进 ⋯ 下拉菜单
```

## 8. 卡片/树形页面切换只需改 `page.key`

```typescript
// 从卡片视图改为表格视图，仅需一行
page: { key: "default" }
// → page: { key: "card", card: { ... } }
```

## 9. `batchActions` 优先于循环单操作

需要批量处理时，使用 `bulkActions` + 后端 `bulkApi`：

```typescript
bulkActions: [
  {
    key: "batchAssign",
    label: "批量分配",
    kind: "assignment",
    bulkApi: "/api/v1/assignments/batch",
    // ...
  },
]
```

## 10. 善用 `defaultSort` 和 `primary` 字段

- `defaultSort` 提升列表页默认体验
- `primary` 控制查询栏默认展示字段，避免首屏过于拥挤

```typescript
defaultSort: { field: "updatedAt", order: "desc" },
filters: {
  primary: ["keyword", "status"],   // 高频筛选，低频的自动折叠
  // ...
},
```

## 11. 字段 `span` 控制布局

```typescript
// 两字段并排（12 + 12）
{ key: "name", label: "名称", component: "text", span: 12 }
{ key: "status", label: "状态", component: "select", span: 12 }

// 独占一行（24）
{ key: "description", label: "描述", component: "textarea", span: 24 }
```

## 12. 资源注册命名规范

- 文件命名：`resources/<resource-name>.ts`（snake_case）
- 变量命名：与该文件 export 的变量名一致
- registry key：**驼峰**，与菜单 `resourceKey` 一致

```typescript
// resources/template-versions.ts
export const templateVersionsResource: ResourceMeta = { ... };

// register.ts (ALL_RESOURCES 中)
templateVersions: templateVersionsResource,
```

## 13. 引用已有资源作为起点

- 标准 CRUD：参考 `usersResource`
- 复杂动作+侧面板：参考 `tasksResource`
- 远程子表单+级联：参考 `tasksResource` 中的 `rewardRuleConfig`
- 批量分配：参考 `usersResource` 中的 `assignRoles`
- 卡片页面：参考 `templateMarketResource`
- 树形页面：参考 `menusResource`
