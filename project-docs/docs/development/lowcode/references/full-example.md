# 完整示例

> **相关文档**：[ResourceMeta 总览](../guide/resource-meta) | [注册接入](../guide/registration) | [快速上手指南](../quick-start) | [最佳实践](../guide/best-practices)

以下展示两个真实资源配置的完整代码，分别代表**标准 CRUD 资源**和**复杂业务资源**。

## 示例一：用户管理（标准 CRUD）

```typescript title="frontend/src/low-code-resources/users.ts"
import type { ResourceMeta } from "@/low-code/schema/types";

export const usersResource: ResourceMeta = {
  resource: "users",
  label: "用户",
  idKey: "id",

  // 权限
  permissions: { page: "system:admin" },

  // 能力开关
  capabilities: { query: true, detail: true, create: true, edit: true },

  // 数据预处理
  normalizeRecord: (record) => {
    const roles = Array.isArray(record.roles) ? record.roles : [];
    return {
      ...record,
      roles: roles.map((item) =>
        typeof item === "object" ? String(item.roleName) : String(item)
      ),
      roleIds: roles
        .map((item) => (typeof item === "object" ? Number(item.id) : null))
        .filter(Boolean),
    };
  },

  prepareValues: (values) => ({
    username: values.username,
    displayName: values.displayName,
    password: values.password || null,
    email: values.email || null,
    phone: values.phone || null,
    roleIds: Array.isArray(values.roleIds)
      ? values.roleIds.map((item) => Number(item))
      : [],
  }),

  // API 端点
  api: {
    query: "/api/v1/admin/users",  // 传统 REST 列表
    detail: "/api/v1/admin/users/{id}",
    create: "/api/v1/admin/users",
    update: "/api/v1/admin/users/{id}",
    options: { roles: "/api/v1/engine/options/roles" },
  },

  // 数据表格
  table: {
    pagination: true,
    selectable: true,
    defaultSort: { field: "id", order: "desc" },
    columns: [
      { key: "displayName", title: "显示名", type: "text", sortable: true },
      { key: "email", title: "邮箱", type: "text" },
      { key: "status", title: "状态", type: "status", dict: "common_status" },
      { key: "roles", title: "角色", type: "tags" },
      { key: "lastLoginAt", title: "最近登录", type: "datetime" },
    ],
    bulkActions: [
      { key: "enable", label: "批量启用", kind: "request", permission: "system:admin" },
      { key: "disable", label: "批量禁用", kind: "danger", permission: "system:admin" },
      {
        key: "assignRoles",
        label: "批量分配角色",
        kind: "assignment",
        api: "/api/v1/admin/users/{id}/roles",
        bulkApi: "/api/v1/admin/users/roles/batch",
        assignment: {
          payloadKey: "roleIds",
          title: "分配角色",
          candidatesSource: "roles",
          assignedPath: "roles",
          variant: "flat",
          summary: [
            { label: "用户名", field: "username" },
            { label: "显示名", field: "displayName" },
            { label: "状态", field: "status" },
          ],
        },
      },
    ],
  },

  // 查询栏
  filters: {
    primary: ["keyword", "status"],
    fields: [
      {
        key: "keyword",
        label: "关键词",
        component: "text",
        operator: "like",
        placeholder: "用户名",
      },
      {
        key: "status",
        label: "状态",
        component: "select",
        operator: "eq",
        dict: "common_status",
      },
    ],
  },

  // 表单
  form: {
    width: "md",
    sections: [
      {
        key: "basic",
        title: "基础信息",
        fields: [
          { key: "displayName", label: "显示名", component: "text", required: true,
            rules: [{ type: "maxLength", value: 20, message: "不能超过 20 字符" }] },
          { key: "email", label: "邮箱", component: "text",
            rules: [{ type: "email", message: "邮箱格式错误" }] },
          { key: "phone", label: "手机号", component: "text",
            rules: [{ type: "phone", message: "11 位手机号" }] },
          { key: "roleIds", label: "角色", component: "remoteSelect",
            remote: { source: "roles" } },
        ],
      },
    ],
    actions: [
      { key: "cancel", label: "取消" },
      { key: "submit", label: "保存", kind: "submit" },
    ],
  },

  // 详情
  detail: {
    sections: [{
      key: "basic",
      title: "基本信息",
      fields: [
        { key: "displayName", label: "显示名", type: "text" },
        { key: "email", label: "邮箱", type: "text" },
        { key: "status", label: "状态", type: "status", dict: "common_status" },
        { key: "roles", label: "角色", type: "tags" },
        { key: "lastLoginAt", label: "最近登录", type: "datetime" },
      ],
    }],
  },

  // 操作按钮
  actions: [
    { key: "create", label: "新建", kind: "drawer", permission: "system:admin" },
    { key: "enable", label: "启用", kind: "request", permission: "system:admin",
      visibleWhen: [{ field: "status", operator: "ne", value: "ACTIVE" }] },
    { key: "disable", label: "禁用", kind: "danger", permission: "system:admin",
      visibleWhen: [{ field: "status", operator: "eq", value: "ACTIVE" }] },
    {
      key: "assignRoles",
      label: "分配角色",
      kind: "assignment",
      permission: "system:admin",
      api: "/api/v1/admin/users/{id}/roles",
      assignment: {
        payloadKey: "roleIds",
        title: "分配角色",
        candidatesSource: "roles",
        assignedApi: "/api/v1/admin/users/{id}",
        assignedPath: "roles",
        variant: "flat",
        summary: [
          { label: "用户名", field: "username" },
          { label: "显示名", field: "displayName" },
        ],
      },
    },
  ],
};
```

## 示例二：任务管理（复杂业务 + 远程子表单 + 侧面板）

```typescript title="frontend/src/low-code-resources/tasks.ts"
import type { ResourceMeta } from "@/low-code/schema/types";

export const tasksResource: ResourceMeta = {
  resource: "tasks",
  label: "标注任务",
  idKey: "id",

  // 权限
  permissions: {
    page: ["system:admin", "business:task:read"],
    create: ["system:admin", "business:task:create"],
    edit: ["system:admin", "business:task:update"],
    delete: ["system:admin", "business:task:update"],
  },

  // 能力开关
  capabilities: { query: true, detail: true, create: true, edit: true, delete: true },

  // 数据预处理
  normalizeRecord: (record) => {
    const templateReady = record.templateReady === true || record.templateReady === 1;
    const publishReady = record.publishReady === true || record.publishReady === 1;
    let readiness = "待模板";
    if (publishReady) readiness = "可发布";
    else if (templateReady) readiness = "待检查";
    return {
      ...record,
      readiness,
      templateReady: templateReady ? "是" : "否",
      publishReady: publishReady ? "是" : "否",
    };
  },

  prepareValues: (values) => ({
    taskCode: values.taskCode,
    title: values.title,
    descriptionText: values.descriptionText || null,
    sceneCode: values.sceneCode,
    deadlineAt: values.deadlineAt || null,
    rewardRuleJson: values.rewardRuleJson || null,
    settingsJson: values.settingsJson || null,
    reviewWorkflowJson: values.reviewWorkflowJson || null,
  }),

  // API
  api: {
    query: "/api/v1/owner/tasks",  // 传统 REST 列表
    detail: "/api/v1/owner/tasks/{id}",
    create: "/api/v1/owner/tasks",
    update: "/api/v1/owner/tasks/{id}",
    delete: "/api/v1/owner/tasks/{id}",
    actions: { publish: "/api/v1/owner/tasks/{id}/publish" },
  },

  // 表格
  table: {
    pagination: true,
    defaultSort: { field: "updatedAt", order: "desc" },
    columns: [
      { key: "taskCode", title: "编码", type: "text", sortable: true },
      { key: "title", title: "任务名称", type: "text", sortable: true },
      { key: "status", title: "状态", type: "status", dict: "task_status" },
      { key: "quota", title: "数据量", type: "number" },
      { key: "readiness", title: "发布就绪", type: "text" },
      { key: "deadlineAt", title: "截止时间", type: "datetime", sortable: true },
    ],
    rowActionKeys: ["edit", "assignments", "submissions"],
  },

  // 查询栏
  filters: {
    primary: ["keyword", "status"],
    fields: [
      { key: "keyword", label: "关键词", component: "text", operator: "like" },
      { key: "status", label: "状态", component: "select", operator: "eq", dict: "task_status" },
    ],
  },

  // 表单
  form: {
    width: "lg",
    sections: [
      {
        key: "basic",
        title: "基础信息",
        fields: [
          { key: "taskCode", label: "任务编码", component: "text", required: true },
          { key: "title", label: "任务名称", component: "text", required: true },
          { key: "descriptionText", label: "描述", component: "textarea" },
          {
            key: "distributeStrategy",
            label: "分发策略",
            component: "remoteSelect",
            required: true,
            defaultValue: "FIRST_COME",
            remote: { source: "distributeStrategies" },
          },
          {
            key: "rewardRuleMode",
            label: "奖励规则",
            component: "remoteSelect",
            required: true,
            remote: { source: "rewardRules" },
          },
          {
            key: "rewardRuleConfig",
            label: "规则配置",
            component: "remoteSchema",
            remoteSchema: {
              api: "/api/v1/owner/remote-schemas/rewardRules/{rewardRuleMode}/form-schema",
              dependsOn: "rewardRuleMode",
              binding: { payloadField: "rewardRuleJson", discriminatorKey: "mode" },
            },
          },
          { key: "deadlineAt", label: "截止时间", component: "datetime" },
        ],
      },
      {
        key: "settings",
        title: "任务设置",
        fields: [
          {
            key: "settingsConfig",
            label: "设置",
            component: "remoteSchema",
            remoteSchema: {
              api: "/api/v1/owner/remote-schemas/taskSettings/default/form-schema",
              binding: { payloadField: "settingsJson", stripSourceFields: false },
            },
          },
        ],
      },
    ],
    actions: [
      { key: "cancel", label: "取消" },
      { key: "submit", label: "保存", kind: "submit" },
    ],
  },

  // 详情（Tab 布局）
  detail: {
    width: "lg",
    layout: "tabs",
    sections: [
      {
        key: "basic",
        title: "基础信息",
        fields: [
          { key: "taskCode", label: "编码", type: "text" },
          { key: "title", label: "名称", type: "text" },
          { key: "status", label: "状态", type: "status", dict: "task_status" },
          { key: "rewardRuleJson", label: "奖励规则", type: "remoteSchema" },
          { key: "settingsJson", label: "任务设置", type: "remoteSchema" },
        ],
      },
    ],
  },

  // 操作（含 4 个侧面板 + 工作流）
  actions: [
    { key: "create", label: "新建任务", kind: "drawer",
      permission: ["system:admin", "business:task:create"] },
    { key: "edit", label: "编辑", kind: "drawer",
      permission: ["system:admin", "business:task:update"] },
    {
      key: "assignments",
      label: "分配管理",
      kind: "request",
      sidePanel: {
        resourceKey: "taskAssignmentBoard",
        scope: { field: "taskId", from: "id" },
        hideFilters: ["taskId"],
        title: "{title} · 分配管理",
      },
    },
    {
      key: "submissions",
      label: "提交记录",
      kind: "request",
      sidePanel: {
        resourceKey: "submissions",
        scope: { field: "taskId", from: "id" },
        hideFilters: ["taskId"],
        title: "{title} · 提交记录",
      },
    },
    {
      key: "publish",
      label: "发布任务",
      kind: "workflow",
      visibleWhen: [{ field: "status", operator: "eq", value: "DRAFT" }],
      workflow: {
        rendererCode: "task.publishPreparation",
        title: "发布任务",
        width: "lg",
        placement: "right",
      },
    },
    { key: "pause", label: "暂停", kind: "request",
      visibleWhen: [{ field: "status", operator: "eq", value: "PUBLISHED" }],
      confirm: { title: "确认暂停？", description: "暂停后任务停止领取" } },
    { key: "delete", label: "删除", kind: "danger",
      visibleWhen: [{ field: "status", operator: "in", value: ["DRAFT", "PAUSED"] }] },
  ],
};
```
