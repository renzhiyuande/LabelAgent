import type { ResourceMeta } from "@/low-code/schema/types";

export const permissionsResource: ResourceMeta = {
  resource: "permissions",
  label: "权限",
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
  prepareValues: (values) => ({
    permissionCode: values.permissionCode,
    permissionName: values.permissionName,
    moduleCode: values.moduleCode,
    apiPattern: values.apiPattern || null,
  }),
  api: {
    query: "/api/v1/admin/permissions",
    detail: "/api/v1/admin/permissions/{id}",
    create: "/api/v1/admin/permissions",
    update: "/api/v1/admin/permissions/{id}",
    actions: {
      enable: "/api/v1/admin/permissions/{id}/enable",
      disable: "/api/v1/admin/permissions/{id}/disable",
    },
  },
  table: {
    pagination: true,
    columns: [
      { key: "permissionCode", title: "权限编码", type: "text" },
      { key: "permissionName", title: "权限名称", type: "text" },
      { key: "moduleCode", title: "模块", type: "text" },
      { key: "apiPattern", title: "接口模式", type: "text" },
      { key: "status", title: "状态", type: "status", dict: "common_status" },
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
        placeholder: "权限编码 / 名称",
      },
      {
        key: "moduleCode",
        label: "模块",
        component: "select",
        field: "moduleCode",
        operator: "eq",
        dict: "permission_module",
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
        title: "权限信息",
        fields: [
          {
            key: "permissionCode",
            label: "权限编码",
            component: "text",
            required: true,
            rules: [{ type: "maxLength", value: 60, message: "权限编码不能超过 60 个字符" }],
          },
          {
            key: "permissionName",
            label: "权限名称",
            component: "text",
            required: true,
            rules: [{ type: "maxLength", value: 40, message: "权限名称不能超过 40 个字符" }],
          },
          {
            key: "moduleCode",
            label: "模块编码",
            component: "text",
            required: true,
            rules: [{ type: "maxLength", value: 40, message: "模块编码不能超过 40 个字符" }],
          },
          {
            key: "apiPattern",
            label: "接口模式",
            component: "text",
            rules: [{ type: "maxLength", value: 120, message: "接口模式不能超过 120 个字符" }],
          },
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
        title: "权限详情",
        fields: [
          { key: "permissionCode", label: "权限编码", type: "text" },
          { key: "permissionName", label: "权限名称", type: "text" },
          { key: "moduleCode", label: "模块编码", type: "text" },
          { key: "apiPattern", label: "接口模式", type: "text" },
          { key: "status", label: "状态", type: "text" },
        ],
      },
    ],
  },
  actions: [
    { key: "create", label: "新建", kind: "drawer", permission: "system:admin" },
    { key: "enable", label: "启用", kind: "request", permission: "system:admin", visibleWhen: [{ field: "status", operator: "ne", value: "ACTIVE" }] },
    { key: "disable", label: "禁用", kind: "danger", permission: "system:admin", visibleWhen: [{ field: "status", operator: "eq", value: "ACTIVE" }] },
  ],
};
