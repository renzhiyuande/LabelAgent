# 快速上手

三步新增一个业务资源页面。

## 第一步：编写 Schema

在 `frontend/src/low-code-resources/` 下新建文件，导出 `ResourceMeta`：

```typescript title="frontend/src/low-code-resources/my-resource.ts"
import type { ResourceMeta } from "@/low-code/schema/types";

export const myResource: ResourceMeta = {
  resource: "myResource",
  label: "我的资源",
  idKey: "id",

  api: {
    list: "/api/v1/my-resources",
    detail: "/api/v1/my-resources/{id}",
    create: "/api/v1/my-resources",
    update: "/api/v1/my-resources/{id}",
    delete: "/api/v1/my-resources/{id}",
  },

  filters: {
    fields: [
      { key: "keyword", label: "关键词", component: "text", operator: "like" },
      { key: "status", label: "状态", component: "select", dict: "common_status" },
    ],
  },

  table: {
    pagination: true,
    columns: [
      { key: "name", title: "名称", type: "text", sortable: true },
      { key: "status", title: "状态", type: "status", dict: "common_status" },
      { key: "createdAt", title: "创建时间", type: "datetime", sortable: true },
    ],
  },

  form: {
    sections: [
      {
        key: "basic",
        title: "基础信息",
        fields: [
          { key: "name", label: "名称", component: "text", required: true },
          { key: "status", label: "状态", component: "select", dict: "common_status" },
        ],
      },
    ],
    actions: [
      { key: "cancel", label: "取消" },
      { key: "submit", label: "保存", kind: "submit" },
    ],
  },

  detail: {
    sections: [
      {
        key: "basic",
        title: "详细信息",
        fields: [
          { key: "name", label: "名称", type: "text" },
          { key: "status", label: "状态", type: "status", dict: "common_status" },
          { key: "createdAt", label: "创建时间", type: "datetime" },
        ],
      },
    ],
  },

  actions: [
    { key: "create", label: "新建", kind: "drawer" },
    { key: "edit", label: "编辑", kind: "drawer" },
    { key: "delete", label: "删除", kind: "danger" },
  ],
};
```

## 第二步：注册资源

在 `register.ts` 的 `ALL_RESOURCES` 中添加键值对：

```typescript title="frontend/src/low-code-resources/register.ts"
import { myResource } from "./my-resource";

const ALL_RESOURCES: Record<string, ResourceMeta> = {
  // ... 已有资源
  myResourceKey: myResource,
};
```

:::tip
`register.ts` 中的 **key** 是运行时唯一标识，菜单的 `resourceKey` 必须与此一致。
:::

## 第三步：菜单接入

在后台菜单配置中设置 `resourceKey: "myResourceKey"`，系统自动使用 `SystemResourcePage` 渲染标准列表页。

## 核心文件

| 文件 | 作用 |
|------|------|
| `packages/low-code-engine/src/schema/types.ts` | `ResourceMeta` 及所有子结构类型定义（包内导出） |
| `frontend/src/low-code-resources/*.ts` | 各业务资源 Schema 定义 |
| `frontend/src/low-code-resources/register.ts` | **运行时注册表**（以这里为准） |
| `packages/low-code-engine/src/components/resource-page/LHResourcePage.tsx` | 标准列表页渲染组件 |
| `packages/low-code-engine/src/index.ts` | 引擎 public API 统一导出入口 |

## 下一步

了解完整的配置结构 👉 [ResourceMeta 顶层配置](/development/lowcode/guide/resource-meta)
