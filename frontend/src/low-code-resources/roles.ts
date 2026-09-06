import type { ResourceMeta } from "@/low-code/schema/types";

export const rolesResource: ResourceMeta = {
  resource: "roles",
  label: "角色",
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
  normalizeRecord: (record) => ({
    ...record,
    permissions: Array.isArray(record.permissions) ? record.permissions : [],
  }),
  prepareValues: (values) => ({
    roleCode: values.roleCode,
    roleName: values.roleName,
    remark: values.remark || null,
  }),
  api: {
    query: "/api/v1/admin/roles",
    detail: "/api/v1/admin/roles/{id}",
    create: "/api/v1/admin/roles",
    update: "/api/v1/admin/roles/{id}",
  },
  table: {
    pagination: true,
    columns: [
      { key: "roleCode", title: "角色编码", type: "text", sortable: true },
      { key: "roleName", title: "角色名称", type: "text", sortable: true },
      { key: "status", title: "状态", type: "status", dict: "common_status" },
      { key: "remark", title: "备注", type: "text" },
      { key: "permissions", title: "权限", type: "tags" },
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
        placeholder: "角色编码",
      },
      {
        key: "status",
        label: "状态",
        component: "select",
        field: "status",
        operator: "eq",
        dict: "common_status",
      },
    ],
  },
  form: {
    sections: [
      {
        key: "basic",
        title: "角色信息",
        fields: [
          {
            key: "roleCode",
            label: "角色编码",
            component: "text",
            required: true,
            rules: [{ type: "pattern", value: "^[A-Z_]+$", message: "角色编码只允许大写字母和下划线" }],
          },
          { key: "roleName", label: "角色名称", component: "text", required: true, rules: [{ type: "maxLength", value: 20, message: "角色名称不能超过 20 个字符" }] },
          { key: "remark", label: "备注", component: "text", rules: [{ type: "maxLength", value: 100, message: "备注不能超过 100 个字符" }] },
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
        title: "角色详情",
        fields: [
          { key: "roleCode", label: "角色编码", type: "text" },
          { key: "roleName", label: "角色名称", type: "text" },
          { key: "status", label: "状态", type: "text" },
          { key: "remark", label: "备注", type: "text" },
          { key: "permissions", label: "权限", type: "tags" },
        ],
      },
    ],
  },
  actions: [
    { key: "create", label: "新建", kind: "drawer", permission: "system:admin" },
    { key: "enable", label: "启用", kind: "request", permission: "system:admin", visibleWhen: [{ field: "status", operator: "ne", value: "ACTIVE" }] },
    { key: "disable", label: "禁用", kind: "danger", permission: "system:admin", visibleWhen: [{ field: "status", operator: "eq", value: "ACTIVE" }] },
    {
      key: "assignPermissions",
      label: "分配权限",
      kind: "assignment",
      permission: "system:admin",
      api: "/api/v1/admin/roles/{id}/permissions",
      assignment: {
        payloadKey: "permissionIds",
        title: "分配权限",
        description: "更新角色可执行的功能权限。保存后会影响拥有该角色的用户能力边界。",
        candidatesApi: "/api/v1/admin/permissions?page=1&pageSize=100",
        variant: "flat",
        fieldLabel: "权限",
        targetTitle: "对象信息",
        targetDescription: "当前正在配置的角色。",
        summary: [
          { label: "角色编码", field: "roleCode" },
          { label: "角色名称", field: "roleName" },
          { label: "当前状态", field: "status" },
        ],
      },
    },
    {
      key: "assignMenus",
      label: "分配菜单",
      kind: "assignment",
      permission: "system:admin",
      api: "/api/v1/admin/roles/{id}/menus",
      assignment: {
        payloadKey: "menuIds",
        title: "分配菜单",
        description: "更新角色可见菜单。保存后会影响拥有该角色的用户导航入口。",
        candidatesApi: "/api/v1/admin/menus/tree",
        variant: "tree",
        fieldLabel: "菜单",
        targetTitle: "对象信息",
        targetDescription: "当前正在配置的角色。",
        searchPlaceholder: "搜索菜单名称 / 路径",
        summary: [
          { label: "角色编码", field: "roleCode" },
          { label: "角色名称", field: "roleName" },
          { label: "当前状态", field: "status" },
        ],
      },
    },
    {
      key: "assignDataScopes",
      label: "分配数据权限",
      kind: "assignment",
      permission: "system:admin",
      api: "/api/v1/admin/roles/{id}/data-scopes",
      assignment: {
        payloadKey: "policyIds",
        title: "分配数据权限",
        description: "更新角色绑定的数据权限策略。保存后会影响相关资源的可访问范围。",
        candidatesApi: "/api/v1/admin/data-scopes?page=1&pageSize=100",
        assignedPath: "policies",
        resourceTypeFilter: true,
        variant: "flat",
        fieldLabel: "数据权限策略",
        targetTitle: "对象信息",
        targetDescription: "当前正在配置的角色。",
        summary: [
          { label: "角色编码", field: "roleCode" },
          { label: "角色名称", field: "roleName" },
          { label: "当前状态", field: "status" },
        ],
      },
    },
  ],
};
