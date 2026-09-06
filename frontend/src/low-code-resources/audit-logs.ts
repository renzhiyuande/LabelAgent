import type { ResourceMeta } from "@/low-code/schema/types";

export const auditLogsResource: ResourceMeta = {
  resource: "auditLogs",
  label: "审计日志",
  idKey: "id",
  permissions: {
    page: "system:admin",
  },
  capabilities: {
    query: true,
    detail: true,
    create: false,
    edit: false,
  },
  api: {
    query: "/api/v1/admin/audit-logs",
    detail: "/api/v1/admin/audit-logs/{id}",
    create: "/api/v1/admin/audit-logs",
    update: "/api/v1/admin/audit-logs/{id}",
    options: {
      users: "/api/v1/engine/options/users",
    },
  },
  table: {
    pagination: true,
    defaultSort: { field: "occurredAt", order: "desc" },
    columns: [
      { key: "entityType", title: "实体类型", type: "text" },
      { key: "entityId", title: "实体 ID", type: "number" },
      { key: "actionCode", title: "动作编码", type: "text" },
      { key: "operatorName", title: "操作人", type: "text",sortable: true },
      { key: "operatorId", title: "操作人 ID", type: "number" },
      { key: "traceId", title: "追踪 ID", type: "text" },
      { key: "occurredAt", title: "发生时间", type: "datetime",sortable: true},
    ],
  },
  filters: {
    fields: [
      { key: "entityType", label: "实体类型", component: "select", field: "entityType", operator: "eq", dict: "audit_entity_type" },
      { key: "actionCode", label: "动作编码", component: "select", field: "actionCode", operator: "eq", dict: "audit_action_code" },
      {
        key: "operatorId",
        label: "操作人",
        component: "remoteSelect",
        field: "operatorId",
        operator: "eq",
        remote: { source: "users" },
      },
      { key: "traceId", label: "追踪 ID", component: "text", field: "traceId", operator: "eq" },
      {
        key: "occurredAt",
        label: "发生时间",
        component: "dateRange",
        field: "occurredAt",
        operator: "between",
      },
    ],
  },
  form: {
    sections: [],
    actions: [],
  },
  detail: {
    sections: [
      {
        key: "basic",
        title: "日志详情",
        fields: [
          { key: "entityType", label: "实体类型", type: "text" },
          { key: "entityId", label: "实体 ID", type: "text" },
          { key: "actionCode", label: "动作编码", type: "text" },
          { key: "operatorType", label: "操作人类型", type: "text" },
          { key: "operatorName", label: "操作人", type: "text" },
          { key: "operatorId", label: "操作人 ID", type: "text" },
          { key: "sourceIp", label: "来源 IP", type: "text" },
          { key: "traceId", label: "追踪 ID", type: "text" },
          { key: "remark", label: "备注", type: "text" },
          { key: "occurredAt", label: "发生时间", type: "datetime" },
        ],
      },
    ],
  },
  actions: [],
  headerActions: [],
};
