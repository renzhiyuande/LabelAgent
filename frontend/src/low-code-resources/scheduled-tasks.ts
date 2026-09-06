import type { ResourceMeta } from "@/low-code/schema/types";

export const scheduledTasksResource: ResourceMeta = {
  resource: "scheduledTasks",
  label: "定时任务",
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
  api: {
    query: "/api/v1/admin/scheduled-tasks",
    detail: "/api/v1/admin/scheduled-tasks/{id}",
    create: "/api/v1/admin/scheduled-tasks",
    update: "/api/v1/admin/scheduled-tasks/{id}",
    actions: {
      enable: "/api/v1/admin/scheduled-tasks/{id}/enable",
      disable: "/api/v1/admin/scheduled-tasks/{id}/disable",
      triggerNow: "/api/v1/admin/scheduled-tasks/{id}/trigger-now",
    },
  },
  table: {
    pagination: true,
    columns: [
      { key: "taskName", title: "任务名称", type: "text" },
      { key: "taskType", title: "任务类型", type: "text" },
      { key: "cronExpr", title: "Cron 表达式", type: "text" },
      { key: "enabled", title: "状态", type: "status", dict: "enabled_flag" },
      { key: "priority", title: "优先级", type: "number" },
      { key: "lastTriggeredAt", title: "上次触发", type: "datetime" },
      { key: "nextTriggerAt", title: "下次触发", type: "datetime" },
      { key: "totalTriggerCount", title: "触发次数", type: "number" },
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
        placeholder: "任务名称 / 类型",
      },
      {
        key: "taskType",
        label: "任务类型",
        component: "select",
        field: "taskType",
        operator: "eq",
        dict: "scheduled_task_type",
      },
      {
        key: "enabled",
        label: "状态",
        component: "select",
        field: "enabled",
        operator: "eq",
        dict: "enabled_flag",
      },
    ],
  },
  form: {
    sections: [
      {
        key: "basic",
        title: "任务配置",
        fields: [
          { key: "taskName", label: "任务名称", component: "text", required: true },
          { key: "taskType", label: "任务类型", component: "text", required: true, description: "对应 AsyncTaskHandler 的 taskType" },
          { key: "cronExpr", label: "Cron 表达式", component: "text", required: true, placeholder: "如 0 0/30 * * * *", description: "Spring 6 位 cron (秒 分 时 日 月 周)" },
          { key: "payloadJson", label: "载荷 JSON", component: "textarea", defaultValue: "{}" },
          { key: "bizType", label: "业务类型", component: "text" },
          { key: "bizId", label: "业务 ID", component: "text", placeholder: "0" },
          { key: "priority", label: "优先级", component: "text", defaultValue: "5", description: "0-9，越小越优先" },
          { key: "maxRetryCount", label: "最大重试", component: "text", defaultValue: "3" },
          { key: "enabled", label: "启用", component: "switch", defaultValue: true },
          { key: "description", label: "描述", component: "textarea" },
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
        title: "任务详情",
        fields: [
          { key: "summary.taskName", path: "summary.taskName", label: "任务名称", type: "text" },
          { key: "summary.taskType", path: "summary.taskType", label: "任务类型", type: "text" },
          { key: "summary.cronExpr", path: "summary.cronExpr", label: "Cron 表达式", type: "text" },
          { key: "summary.enabled", path: "summary.enabled", label: "启用", type: "text" },
          { key: "summary.priority", path: "summary.priority", label: "优先级", type: "text" },
          { key: "summary.lastTriggeredAt", path: "summary.lastTriggeredAt", label: "上次触发", type: "datetime" },
          { key: "summary.nextTriggerAt", path: "summary.nextTriggerAt", label: "下次触发", type: "datetime" },
          { key: "summary.totalTriggerCount", path: "summary.totalTriggerCount", label: "触发次数", type: "text" },
          { key: "summary.description", path: "summary.description", label: "描述", type: "text" },
        ],
      },
      {
        key: "payload",
        title: "载荷数据",
        fields: [
          { key: "payload", path: "payload", label: "Payload JSON", type: "json" },
        ],
      },
    ],
  },
  actions: [
    { key: "enable", label: "启用", kind: "request", permission: "system:admin", visibleWhen: [{ field: "enabled", operator: "eq", value: 0 }] },
    { key: "disable", label: "禁用", kind: "danger", permission: "system:admin", visibleWhen: [{ field: "enabled", operator: "eq", value: 1 }] },
    { key: "triggerNow", label: "立即触发", kind: "request", permission: "system:admin" },
  ],
  headerActions: [],
};
