import { normalizeSnowflakeId } from "@/low-code/lib/id-utils";
import type { ResourceMeta } from "@/low-code/schema/types";

/**
 * 标注员题目详情：通过 assignmentId 读取已分配题目的 payload。
 * 仅用于列表 openRelated 弹层，不提供独立列表页。
 */
export const labelerTaskItemsResource: ResourceMeta = {
  resource: "labelerTaskItems",
  label: "题目详情",
  idKey: "id",
  permissions: {
    page: ["business:labeler:workbench"],
  },
  capabilities: {
    query: false,
    detail: true,
    create: false,
    edit: false,
    delete: false,
  },
  normalizeRecord: (record) => ({
    ...record,
    id: normalizeSnowflakeId(record.id) ?? record.id,
    taskId: normalizeSnowflakeId(record.taskId) ?? record.taskId,
    itemSeqNo: record.itemSeqNo ?? record.seqNo,
  }),
  api: {
    query: "/api/v1/labeler/assignments/{id}/item",
    detail: "/api/v1/labeler/assignments/{id}/item",
  },
  filters: {
    fields: [],
  },
  form: { sections: [], actions: [] },
  actions: [],
  detail: {
    width: "lg",
    layout: "tabs",
    sections: [
      {
        key: "item",
        title: "题目内容",
        fields: [
          { key: "sourceItemKey", label: "源数据标识", type: "text" },
          { key: "itemSeqNo", label: "题目序号", type: "number" },
          {
            key: "itemForm",
            label: "",
            type: "templateForm",
            templateForm: { role: "display" },
          },
        ],
      },
      {
        key: "raw",
        title: "原始 JSON",
        fields: [{ key: "payloadJson", label: "完整载荷", type: "json" }],
      },
    ],
  },
};
