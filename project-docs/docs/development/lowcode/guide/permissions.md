# 权限体系

低代码引擎在多个层级提供了权限控制能力：页面级、操作级、字段/列级、条件级。

> **相关文档**：[操作按钮](./actions) | [表单字段控制](./form#条件控制) | [查询栏权限](./filters#筛选字段-filterfieldschema) | [列级权限](./table#列定义-tablecolumnschema)

## 权限声明 `ResourcePermissionMeta`

```typescript
interface ResourcePermissionMeta {
  page?: string | string[];    // 页面访问权限
  list?: string | string[];    // 列表查询权限
  show?: string | string[];    // 详情查看权限
  create?: string | string[];  // 新建权限
  edit?: string | string[];    // 编辑权限
  delete?: string | string[];  // 删除权限
}
```

```typescript
permissions: {
  page: ["system:admin", "business:task:read"],    // 页面入口
  create: ["system:admin", "business:task:create"],
  edit: ["system:admin", "business:task:update"],
  delete: ["system:admin", "business:task:update"],
},
```

## 操作级权限

在 [`ActionSchema`](./actions) 中指定：

```typescript
actions: [
  {
    key: "create",
    label: "新建",
    kind: "drawer",
    permission: ["system:admin", "business:task:create"],
  },
  {
    key: "delete",
    label: "删除",
    kind: "danger",
    permission: ["system:admin", "business:task:update"],
  },
]
```

## 字段级权限

控制表单中某个字段对特定角色是否可见：

```typescript
{
  key: "password",
  label: "密码",
  component: "text",
  permission: "system:admin",     // 非管理员不可见此字段
}
```

## 列级权限

控制表格列对特定角色是否可见：

```typescript
columns: [
  { key: "username", title: "用户名", type: "text" },
  { key: "secretKey", title: "密钥", type: "text",
    permission: ["system:admin"] },  // 只有管理员能看到密钥列
]
```

## 筛选字段权限

控制查询栏中某个筛选条件对特定角色是否可见：

```typescript
filters: {
  fields: [
    {
      key: "internalStatus",
      label: "内部状态",
      component: "select",
      permission: ["system:admin"],
    },
  ],
}
```

## 条件组合

- **字符串**：单个权限码，如 `"system:admin"`
- **数组**：任一满足即可（OR 关系），如 `["system:admin", "business:task:read"]`

## 运行时行为

引擎通过 `hasPermission(currentUser, field.permission)` 判断：

```typescript
// 没有 page 权限 → 整个页面 404
// 没有操作权限 → 按钮隐藏
// 没有字段权限 → 表单中不渲染该字段
// 没有列权限 → 表格不渲染该列
```

当前用户信息来自 `useAuthStore` 的 `pageUser`。前端在 `/api/v1/auth/login` 获取 access token，并在后续请求中以 `Authorization: Bearer ...` 方式发送。
