import type { ResourceMeta } from "@/low-code/schema/types";

export const systemClientsResource: ResourceMeta = {
  resource: "systemClients",
  label: "系统客户端",
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
    clientCode: values.clientCode,
    clientName: values.clientName,
    clientType: values.clientType,
    allowedScopes: Array.isArray(values.allowedScopes)
      ? values.allowedScopes.map((item) => String(item))
      : String(values.allowedScopes ?? "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
    expiresAt: values.expiresAt || null,
  }),
  api: {
    query: "/api/v1/admin/system-clients",
    detail: "/api/v1/admin/system-clients/{id}",
    create: "/api/v1/admin/system-clients",
    update: "/api/v1/admin/system-clients/{id}",
    actions: {
      enable: "/api/v1/admin/system-clients/{id}/enable",
      disable: "/api/v1/admin/system-clients/{id}/disable",
      "probe-health": "/api/v1/admin/system-clients/{id}/probe-health",
    },
  },
  table: {
    pagination: true,
    columns: [
      { key: "clientCode", title: "客户端编码", type: "text" },
      { key: "clientName", title: "客户端名称", type: "text" },
      { key: "clientType", title: "客户端类型", type: "text" },
      { key: "allowedScopes", title: "允许 Scope", type: "tags" },
      { key: "status", title: "账号状态", type: "status", dict: "common_status" },
      { key: "onlineStatus", title: "在线状态", type: "text" },
      { key: "probeLatencyMs", title: "探测延迟(ms)", type: "number" },
      { key: "lastProbeAt", title: "最近探测", type: "datetime" },
      { key: "lastUsedAt", title: "最近使用", type: "datetime" },
      { key: "expiresAt", title: "过期时间", type: "datetime" },
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
        placeholder: "客户端编码 / 名称",
      },
      {
        key: "clientType",
        label: "客户端类型",
        component: "select",
        field: "clientType",
        operator: "eq",
        dict: "system_client_type",
      },
      {
        key: "status",
        label: "账号状态",
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
        title: "客户端信息",
        fields: [
          { key: "clientCode", label: "客户端编码", component: "text", required: true },
          { key: "clientName", label: "客户端名称", component: "text", required: true },
          { key: "clientType", label: "客户端类型", component: "text", required: true, defaultValue: "AGENT" },
          {
            key: "allowedScopes",
            label: "允许 Scope",
            component: "tags",
            description: "按回车分隔多个 scope",
          },
          { key: "expiresAt", label: "过期时间", component: "text", placeholder: "ISO-8601 时间，可留空" },
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
        title: "客户端详情",
        fields: [
          { key: "clientCode", label: "客户端编码", type: "text" },
          { key: "clientName", label: "客户端名称", type: "text" },
          { key: "clientType", label: "客户端类型", type: "text" },
          { key: "allowedScopes", label: "允许 Scope", type: "tags" },
          { key: "status", label: "账号状态", type: "text" },
          { key: "onlineStatus", label: "在线状态", type: "text" },
          { key: "agentBaseUrl", label: "Agent 地址", type: "text" },
          { key: "probeLatencyMs", label: "探测延迟(ms)", type: "number" },
          { key: "lastProbeAt", label: "最近探测", type: "datetime" },
          { key: "probeMessage", label: "探测说明", type: "text" },
          { key: "lastUsedAt", label: "最近使用", type: "datetime" },
          { key: "expiresAt", label: "过期时间", type: "datetime" },
        ],
      },
    ],
  },
  actions: [
    { key: "create", label: "新建", kind: "drawer", permission: "system:admin" },
    { key: "enable", label: "启用", kind: "request", permission: "system:admin", visibleWhen: [{ field: "status", operator: "ne", value: "ACTIVE" }] },
    { key: "disable", label: "禁用", kind: "danger", permission: "system:admin", visibleWhen: [{ field: "status", operator: "eq", value: "ACTIVE" }] },
    {
      key: "probe-health",
      label: "探测在线",
      kind: "request",
      permission: "system:admin",
      visibleWhen: [{ field: "clientType", operator: "eq", value: "AGENT" }],
    },
  ],
  headerActions: [
    {
      key: "rotate-secret-doc",
      label: "密钥轮换走专有接口",
      kind: "button",
      actionCode: "systemClients.rotateSecretHint",
      permission: "system:admin",
    },
  ],
};
