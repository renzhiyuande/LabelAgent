# 注册与接入

编写完 [`ResourceMeta`](./resource-meta) 后，需要注册到运行时注册表中，并在菜单中接入才能被渲染。

> **相关文档**：[快速上手指南](../quick-start) | [ResourceMeta 总览](./resource-meta) | [页面布局](./page-layouts)

## 三步接入

### 1. 编写资源配置

在 `frontend/src/low-code-resources/` 下创建文件：

```typescript title="frontend/src/low-code-resources/my-resource.ts"
import type { ResourceMeta } from "@/low-code/schema/types";

export const myResource: ResourceMeta = {
  resource: "myResource",
  label: "我的资源",
  idKey: "id",
  // ... 完整配置
};
```

### 2. 注册到 `register.ts`

```typescript title="frontend/src/low-code-resources/register.ts"
import { myResource } from "./my-resource";

const ALL_RESOURCES: Record<string, ResourceMeta> = {
  // ... 已有资源
  myResourceKey: myResource,
};
```

**注意**：`register.ts` 中的 key 是运行时唯一标识。菜单的 `resourceKey`、侧面板的 `resourceKey` 必须与此一致。

### 3. 菜单配置

在后台菜单中设置 `resourceKey: "myResourceKey"`，系统自动使用 `SystemResourcePage` 渲染。

## 页面组件选择

系统根据 `resourceKey` 自动选择渲染方式：

```tsx
// SystemResourcePage.tsx
<LHResourcePage resourceKey="myResourceKey" />
```

- **标准列表页**：`LHResourcePage` — 查询栏 + 表格 + 抽屉
- **侧面板列表**：`LHResourceSidePanel` — 嵌入侧栏的子资源列表
- **卡片页面**：`LHResourceCardPage` — 卡片网格展示

页面类型由 `resource.page.key` 控制（`default` / `card` / `tree`）。

## `index.ts` 的 re-export

`frontend/src/low-code-resources/register.ts` 的 `ALL_RESOURCES` 是唯一注册入口。**没有 `index.ts` re-export 模式**——所有资源必须显式录入 `ALL_RESOURCES` 对象。

**⚠️ 重要**：未写入 `register.ts` 的 Schema 在页面上不可见。

## 常用导入

```typescript
// 获取资源配置
import { getResourceMeta, getRegisteredResourceKeys } from "@/low-code/schema/resource-registry";

const meta = getResourceMeta("tasks");       // 按 key 获取
const keys = getRegisteredResourceKeys();    // 获取所有已注册 key
```

## 完整注册表

当前已注册约 40 个资源：

```typescript
const ALL_RESOURCES: Record<string, ResourceMeta> = {
  asyncTasks, auditLogs, dataScopes,
  dictItems, dictTypes, menus, permissions,
  ownerAppeals, roles, systemClients, users,
  tasks, taskMembers, taskItems, assignments,
  taskAssignmentBoard, assignmentSubmissionAttempts,
  submissions, templates, templateVersions,
  templateFields, templateLayouts,
  labelerMarket, labelerMyDrafts, labelerMySubmitted,
  labelerMyTasks, labelerTaskItems,
  scheduledTasks, llmProviders, llmModels,
  dimensionPacks, templateMarket, templateMarketAdmin,
  fileAssets, rewardSettlements, rewardSettlementDetails,
  labelerMyRewards, acceptances, acceptanceSamples,
  exports,
};
```
