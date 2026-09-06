import { normalizeSnowflakeId } from "@/low-code/lib/id-utils";
import type { ResourceMeta } from "@/low-code/schema/types";

export const taskItemsResource: ResourceMeta = {
  resource: "taskItems",
  label: "标注数据项",
  idKey: "id",
  normalizeRecord: (record) => ({
    ...record,
    id: normalizeSnowflakeId(record.id) ?? record.id,
    taskId: normalizeSnowflakeId(record.taskId) ?? record.taskId,
  }),
  permissions: {
    page: ["system:admin", "business:task:read"],
  },
  capabilities: {
    query: true,
    detail: true,
  },
  api: {
    query: "/api/v1/owner/tasks/items",
    detail: "/api/v1/owner/tasks/{taskId}/items/{id}",
    create: "/api/v1/owner/tasks/{taskId}/items",
    update: "/api/v1/owner/tasks/{taskId}/items/{id}",
  },
  table: {
    pagination: true,
    selectable: true,
    bulkActions: [
      {
        key: "delete",
        label: "删除",
        kind: "danger",
        permission: ["system:admin", "business:task:update"],
        confirm: {
          title: "确认删除选中的 {count} 项？",
          description: "将删除 {count} 条标注数据项，删除后不可恢复",
          confirmText: "确认删除",
          cancelText: "取消",
        },
      },
    ],
    columns: [
      { key: "seqNo", title: "序号", type: "number" },
      { key: "sourceItemKey", title: "源数据标识", type: "text" },
      { key: "payloadPreview", title: "业务数据", type: "text", formatter: "payloadPreview" },
      { key: "itemStatus", title: "数据项状态", type: "status" },
      { key: "currentAssignmentCount", title: "当前分配次数", type: "number" },
      { key: "createdAt", title: "创建时间", type: "datetime" },
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
        placeholder: "源标识",
      },
      {
        key: "taskId",
        label: "任务",
        component: "remoteSelect",
        field: "taskId",
        operator: "eq",
        remote: { source: "tasks" },
      },
    ],
  },
  form: {
    sections: [],
    actions: [],
  },
  detail: {
    width: "lg",
    sections: [
      {
        key: "meta",
        title: "管理信息",
        fields: [
          { key: "seqNo", label: "序号", type: "text" },
          { key: "sourceItemKey", label: "源数据标识", type: "text" },
          { key: "itemStatus", label: "数据项状态", type: "text" },
          { key: "currentAssignmentCount", label: "当前分配次数", type: "text" },
          { key: "createdAt", label: "创建时间", type: "datetime" },
        ],
      },
      {
        key: "payload",
        title: "业务数据",
        fields: [{ key: "payload", label: "", type: "payloadMap" }],
      },
      {
        key: "raw",
        title: "原始 JSON",
        fields: [{ key: "payloadJson", label: "完整载荷", type: "json", }],
      },
    ],
  },
  actions: [
    {
      key: "delete",
      label: "删除",
      kind: "danger",
      permission: ["system:admin", "business:task:update"],
      confirm: {
        title: "确认删除？",
        description: "删除后不可恢复",
        confirmText: "确认删除",
        cancelText: "取消",
      },
    },
  ],
  headerActions: [
    {
      key: "importItems",
      label: "导入标注数据",
      kind: "workflow",
      permission: ["system:admin", "business:task:import"],
      workflow: {
        rendererCode: "taskItems.import",
        title: "导入标注数据",
        description: "支持上传 JSON 文件或直接粘贴 JSON 数组，导入前会展示预览。",
        width: "xl",
        placement: "right",
      },
    },
  ],
};
