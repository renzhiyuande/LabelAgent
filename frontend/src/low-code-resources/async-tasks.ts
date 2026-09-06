import type { ResourceMeta } from "@/low-code/schema/types";

export const asyncTasksResource: ResourceMeta = {
  resource: "asyncTasks",
  label: "异步任务",
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
    query: "/api/v1/admin/async-tasks",
    detail: "/api/v1/admin/async-tasks/{id}",
    create: "/api/v1/admin/async-tasks",
    update: "/api/v1/admin/async-tasks/{id}",
    actions: {
      retry: "/api/v1/admin/async-tasks/{id}/retry",
      cancel: "/api/v1/admin/async-tasks/{id}/cancel",
    },
  },
  table: {
    pagination: true,
    columns: [
      { key: "taskType", title: "任务类型", type: "text" },
      { key: "bizType", title: "业务类型", type: "text" },
      { key: "bizId", title: "业务 ID", type: "number" },
      { key: "bizKey", title: "业务键", type: "text" },
      { key: "priority", title: "优先级", type: "number" },
      { key: "status", title: "状态", type: "status", dict: "async_task_status" },
      { key: "retryCount", title: "重试次数", type: "number" },
      { key: "nextRunAt", title: "下次执行", type: "datetime" },
    ],
  },
  filters: {
    fields: [
      {
        key: "status",
        label: "状态",
        component: "select",
        field: "status",
        operator: "eq",
        dict: "async_task_status",
      },
      {
        key: "taskType",
        label: "任务类型",
        component: "select",
        field: "taskType",
        operator: "eq",
        dict: "async_task_type",
      },
      {
        key: "bizType",
        label: "业务类型",
        component: "select",
        field: "bizType",
        operator: "eq",
        dict: "async_biz_type",
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
        title: "任务详情",
        fields: [
          { key: "summary.taskType", path: "summary.taskType", label: "任务类型", type: "text" },
          { key: "summary.bizType", path: "summary.bizType", label: "业务类型", type: "text" },
          { key: "summary.bizId", path: "summary.bizId", label: "业务 ID", type: "text" },
          { key: "summary.bizKey", path: "summary.bizKey", label: "业务键", type: "text" },
          { key: "summary.priority", path: "summary.priority", label: "优先级", type: "text" },
          { key: "summary.status", path: "summary.status", label: "状态", type: "text" },
          { key: "summary.retryCount", path: "summary.retryCount", label: "重试次数", type: "text" },
          { key: "summary.manualRetryCount", path: "summary.manualRetryCount", label: "人工重试", type: "text" },
          { key: "summary.nextRunAt", path: "summary.nextRunAt", label: "下次执行", type: "datetime" },
          { key: "summary.workerId", path: "summary.workerId", label: "Worker", type: "text" },
          { key: "summary.lastErrorCode", path: "summary.lastErrorCode", label: "错误码", type: "text" },
          { key: "summary.lastErrorMessage", path: "summary.lastErrorMessage", label: "错误信息", type: "text" },
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
    {
      key: "retry",
      label: "重试",
      kind: "request",
      permission: "system:admin",
      visibleWhen: [{ field: "status", operator: "in", value: ["FAILED", "DEAD_LETTER"] }],
    },
    {
      key: "cancel",
      label: "取消",
      kind: "danger",
      permission: "system:admin",
      visibleWhen: [{ field: "status", operator: "in", value: ["PENDING", "RUNNING"] }],
    },
  ],
  headerActions: [],
};
