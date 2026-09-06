import type { ResourceMeta } from "@/low-code/schema/types";

export const dataScopesResource: ResourceMeta = {
  resource: "dataScopes",
  label: "数据权限",
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
    policyCode: values.policyCode,
    policyName: values.policyName,
    resourceType: values.resourceType,
    scopeType: values.scopeType,
    scopeValueJson: values.scopeValueJson || null,
    remark: values.remark || null,
  }),
  api: {
    query: "/api/v1/admin/data-scopes",
    detail: "/api/v1/admin/data-scopes/{id}",
    create: "/api/v1/admin/data-scopes",
    update: "/api/v1/admin/data-scopes/{id}",
    actions: {
      enable: "/api/v1/admin/data-scopes/{id}/enable",
      disable: "/api/v1/admin/data-scopes/{id}/disable",
    },
    options: {
      resourceTypes: "/api/v1/engine/options/dataScopeResourceTypes",
      scopeTypes: "/api/v1/engine/options/dataScopeScopeTypes",
    },
  },
  table: {
    pagination: true,
    columns: [
      { key: "policyCode", title: "策略编码", type: "text" },
      { key: "policyName", title: "策略名称", type: "text" },
      { key: "resourceType", title: "资源类型", type: "text" },
      { key: "scopeType", title: "范围类型", type: "text" },
      { key: "status", title: "状态", type: "status" ,dict: "common_status"},
      { key: "remark", title: "备注", type: "text" },
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
        placeholder: "策略编码 / 名称",
      },
      {
        key: "resourceType",
        label: "资源类型",
        component: "select",
        field: "resourceType",
        operator: "eq",
        remote: { source: "resourceTypes" },
      },
      {
        key: "scopeType",
        label: "范围类型",
        component: "select",
        field: "scopeType",
        operator: "eq",
        remote: { source: "scopeTypes" },
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
    width: "lg",
    sections: [
      {
        key: "basic",
        title: "策略信息",
        fields: [
          { key: "policyCode", label: "策略编码", component: "text", required: true },
          { key: "policyName", label: "策略名称", component: "text", required: true },
          {
            key: "resourceType",
            label: "资源类型",
            component: "remoteSelect",
            required: true,
            remote: { source: "resourceTypes" },
          },
          {
            key: "scopeType",
            label: "范围类型",
            component: "remoteSelect",
            required: true,
            remote: {
              source: "scopeTypes",
              params: { resourceType: { from: "resourceType" } },
            },
          },
          {
            key: "scopeValueJson",
            label: "范围值 JSON",
            component: "jsonEditor",
            placeholder: "可留空；CUSTOM 等类型按约定填写 JSON",
          },
          {
            key: "remark",
            label: "备注",
            component: "textarea",
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
        title: "策略详情",
        fields: [
          { key: "policyCode", label: "策略编码", type: "text" },
          { key: "policyName", label: "策略名称", type: "text" },
          { key: "resourceType", label: "资源类型", type: "text" },
          { key: "scopeType", label: "范围类型", type: "text" },
          { key: "scopeValueJson", label: "范围值 JSON", type: "text" },
          { key: "status", label: "状态", type: "text" },
          { key: "remark", label: "备注", type: "text" },
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
