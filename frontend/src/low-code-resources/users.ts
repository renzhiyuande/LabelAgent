import type { ResourceMeta } from "@/low-code/schema/types";

export const usersResource: ResourceMeta = {
  resource: "users",
  label: "用户",
  idKey: "id",
  permissions: {
    page: "system:admin",
  },
  capabilities: {
    query: true,
    detail: true,
    create: true,
    edit: true,
  },
  normalizeRecord: (record) => {
    const roles = Array.isArray(record.roles) ? record.roles : [];
    return {
      ...record,
      roles: roles
        .map((item) =>
          typeof item === "object" && item !== null && "roleName" in item
            ? String((item as { roleName: unknown }).roleName)
            : String(item),
        )
        .filter(Boolean),
      roleIds: roles
        .map((item) =>
          typeof item === "object" && item !== null && "id" in item
            ? Number((item as { id: unknown }).id)
            : null,
        )
        .filter((item): item is number => item != null),
    };
  },
  prepareValues: (values) => ({
    username: values.username,
    displayName: values.displayName,
    password: values.password || null,
    email: values.email || null,
    phone: values.phone || null,
    roleIds: Array.isArray(values.roleIds) ? values.roleIds.map((item) => Number(item)) : [],
  }),
  api: {
    query: "/api/v1/admin/users",
    detail: "/api/v1/admin/users/{id}",
    create: "/api/v1/admin/users",
    update: "/api/v1/admin/users/{id}",
    options: {
      roles: "/api/v1/engine/options/roles",
    },
  },
  table: {
    pagination: true,
    selectable: true,
    bulkActions: [
      { key: "enable", label: "批量启用", kind: "request", permission: "system:admin" },
      { key: "disable", label: "批量禁用", kind: "danger", permission: "system:admin" },
      {
        key: "assignRoles",
        label: "批量分配角色",
        kind: "assignment",
        permission: "system:admin",
        api: "/api/v1/admin/users/{id}/roles",
        bulkApi: "/api/v1/admin/users/roles/batch",
        assignment: {
          payloadKey: "roleIds",
          title: "分配角色",
          description: "更新用户可拥有的后台角色。保存后会影响该用户重新登录后的权限与菜单。",
          candidatesSource: "roles",
          assignedApi: "/api/v1/admin/users/{id}",
          assignedPath: "roles",
          variant: "flat",
          fieldLabel: "角色",
          targetTitle: "对象信息",
          targetDescription: "当前正在配置的用户。",
          summary: [
            { label: "用户名", field: "username" },
            { label: "显示名", field: "displayName" },
            { label: "当前状态", field: "status" },
          ],
        },
        confirm: {
          title: "确认批量分配角色？",
          description: "将为选中的 {count} 个用户统一设置角色，覆盖其现有角色配置。",
          confirmText: "继续配置",
          cancelText: "取消",
        },
      },
    ],
    defaultSort: { field: "id", order: "desc" },
    columns: [
      { key: "username", title: "用户名", type: "text",sortable: true },
      { key: "displayName", title: "显示名", type: "text",sortable: true },
      { key: "email", title: "邮箱", type: "text" },
      { key: "phone", title: "手机号", type: "text" },
      { key: "status", title: "状态", type: "status", dict: "common_status" },
      { key: "roles", title: "角色", type: "tags" },
      { key: "lastLoginAt", title: "最近登录", type: "datetime" },
    ],
  },
  filters: {
    fields: [
      {
        key: "keyword",
        label: "关键词",
        component: "text",
        field: "keyword",
        operator: "like",
        placeholder: "用户名",
      },
      {
        key: "status",
        label: "状态",
        component: "select",
        field: "status",
        operator: "eq",
        dict: "common_status",
      },
      {
        key: "roleIds",
        label: "角色",
        component: "remoteSelect",
        field: "roleIds",
        operator: "eq",
        remote: { source: "roles" },
      },
    ],
  },
  form: {
    width: "md",
    sections: [
      {
        key: "basic",
        title: "基础信息",
        fields: [
          { key: "username", label: "用户名", component: "text", required: true, rules: [{ type: "minLength", value: 3, message: "用户名至少 3 个字符" }] },
          { key: "displayName", label: "显示名", component: "text", required: true, rules: [{ type: "maxLength", value: 20, message: "显示名不能超过 20 个字符" }] },
          { key: "password", label: "密码", component: "text", placeholder: "留空则使用默认密码", permission: "system:admin", rules: [{ type: "minLength", value: 6, message: "密码至少 6 位" }] },
          { key: "email", label: "邮箱", component: "text", rules: [{ type: "email", message: "请输入正确的邮箱格式" }] },
          { key: "phone", label: "手机号", component: "text", rules: [{ type: "phone", message: "请输入 11 位手机号" }] },
          { key: "roleIds", label: "角色", component: "remoteSelect", remote: { source: "roles" } },
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
        title: "基础信息",
        fields: [
          { key: "username", label: "用户名", type: "text" },
          { key: "displayName", label: "显示名", type: "text" },
          { key: "email", label: "邮箱", type: "text" },
          { key: "phone", label: "手机号", type: "text" },
          { key: "status", label: "状态", type: "text" },
          { key: "roles", label: "角色", type: "tags" },
          { key: "lastLoginAt", label: "最近登录", type: "datetime" },
        ],
      },
    ],
  },
  actions: [
    { key: "create", label: "新建", kind: "drawer", permission: "system:admin" },
    { key: "enable", label: "启用", kind: "request", permission: "system:admin", visibleWhen: [{ field: "status", operator: "ne", value: "ACTIVE" }] },
    { key: "disable", label: "禁用", kind: "danger", permission: "system:admin", visibleWhen: [{ field: "status", operator: "eq", value: "ACTIVE" }] },
    {
      key: "assignRoles",
      label: "分配角色",
      kind: "assignment",
      permission: "system:admin",
      api: "/api/v1/admin/users/{id}/roles",
      assignment: {
        payloadKey: "roleIds",
        title: "分配角色",
        description: "更新用户可拥有的后台角色。保存后会影响该用户重新登录后的权限与菜单。",
        candidatesSource: "roles",
        assignedApi: "/api/v1/admin/users/{id}",
        assignedPath: "roles",
        variant: "flat",
        fieldLabel: "角色",
        targetTitle: "对象信息",
        targetDescription: "当前正在配置的用户。",
        summary: [
          { label: "用户名", field: "username" },
          { label: "显示名", field: "displayName" },
          { label: "当前状态", field: "status" },
        ],
      },
    },
  ],
};
