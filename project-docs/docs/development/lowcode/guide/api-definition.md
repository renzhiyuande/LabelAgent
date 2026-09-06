# API 端点定义

> **相关文档**：[远程数据加载](./remote) | [操作按钮](./actions) | [ResourceMeta 总览](./resource-meta)

`ResourceApiMeta` 描述资源的所有后端 REST API 端点。

```typescript
interface ResourceApiMeta {
  query?: string;                      // POST 列表查询（override 引擎默认 /api/v1/engine/resources/{resource}/query）
  detail?: string;                     // GET 详情
  create?: string;                     // POST 创建
  createViaQuery?: boolean;            // POST 创建时以 query 传参（无 JSON body）
  update?: string;                     // PUT/PATCH 更新
  delete?: string;                     // DELETE 删除
  actions?: Record<string, string>;    // 自定义操作 API
  options?: Record<string, string>;    // 远程选项 API
}
```

> **关于 `query`**：低代码引擎默认使用 `POST /api/v1/engine/resources/{resource}/query` 作为列表查询接口。当资源需要对接传统 REST 端点（如 `/api/v1/admin/users`）时，通过 `api.query` 覆盖。走引擎协议时无需配置此字段。
>
> 完整签名见 `packages/low-code-engine/src/schema/types.ts:148`。

## 路径占位符

`{id}` 自动替换为当前记录的 `idKey` 字段值（通常为 `"id"`）：

```typescript
api: {
  detail: "/api/v1/owner/tasks/{id}",        // → /api/v1/owner/tasks/42
  update: "/api/v1/owner/tasks/{id}",        // → /api/v1/owner/tasks/42
  delete: "/api/v1/owner/tasks/{id}",        // → /api/v1/owner/tasks/42
}
```

## 自定义操作 `actions`

声明动作对应的后端 API：

```typescript
api: {
  actions: {
    publish: "/api/v1/owner/tasks/{id}/publish",
    rollback: "/api/v1/owner/tasks/{id}/activate",
  },
}
```

此后在 `ActionSchema` 的 `key` 对应到 `actions` key 即可自动获取 API 路径。也可在 `ActionSchema.api` 中覆盖。

## 远程选项 `options`

定义远程下拉框的数据源端点：

```typescript
api: {
  options: {
    roles: "/api/v1/engine/options/roles",
    users: "/api/v1/engine/options/users",
  },
}
```

表单字段通过 `remote.source: "roles"` 引用：

```typescript
{
  key: "roleIds",
  label: "角色",
  component: "remoteSelect",
  remote: { source: "roles" },
}
```

## 完整示例

```typescript
api: {
  // 列表查询（覆盖引擎默认，走传统 REST）
  query: "/api/v1/admin/users",
  // 标准 CRUD
  detail: "/api/v1/admin/users/{id}",
  create: "/api/v1/admin/users",
  update: "/api/v1/admin/users/{id}",
  delete: "/api/v1/admin/users/{id}",

  // 自定义动作
  actions: {
    enable: "/api/v1/admin/users/{id}/enable",
    disable: "/api/v1/admin/users/{id}/disable",
  },

  // 远程选项数据源
  options: {
    roles: "/api/v1/engine/options/roles",
    departments: "/api/v1/engine/options/departments",
  },
}
```

> 若使用引擎统一列表协议，仅需配置 CRUD 端点，无需 `query`：引擎自动走 `POST /api/v1/engine/resources/{resource}/query`。
