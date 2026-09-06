import { normalizeSnowflakeId } from "@/low-code/lib/id-utils";
import type { DetailSectionSchema, TableColumnSchema } from "@/low-code/schema/types";

export function normalizeOwnerAppealRecord(record: Record<string, unknown>) {
  return {
    ...record,
    id: normalizeSnowflakeId(record.id) ?? record.id,
    submissionId: normalizeSnowflakeId(record.submissionId) ?? record.submissionId,
    assignmentId: normalizeSnowflakeId(record.assignmentId) ?? record.assignmentId,
    taskId: normalizeSnowflakeId(record.taskId) ?? record.taskId,
    itemId: normalizeSnowflakeId(record.itemId) ?? record.itemId,
    labelerId: normalizeSnowflakeId(record.labelerId) ?? record.labelerId,
    ownerId: normalizeSnowflakeId(record.ownerId) ?? record.ownerId,
  };
}

export const ownerAppealTableColumns: TableColumnSchema[] = [
  {
    key: "taskTitle",
    title: "任务",
    type: "link",
    minWidth: 140,
    ellipsis: 1,
    link: {
      labelField: "taskTitle",
      action: "openRelated",
      resourceKey: "tasks",
      idField: "taskId",
    },
  },
  {
    key: "sourceItemKey",
    title: "题目",
    type: "link",
    minWidth: 100,
    ellipsis: 1,
    link: {
      labelField: "sourceItemKey",
      action: "openRelated",
      resourceKey: "taskItems",
      idField: "itemId",
      pathParams: { taskId: "taskId" },
    },
  },
  { key: "itemSeqNo", title: "序号", type: "number", width: 64, minWidth: 56 },
  {
    key: "payloadPreview",
    title: "题目摘要",
    type: "text",
    formatter: "payloadPreview",
    width: 200,
    minWidth: 160,
    maxWidth: 280,
  },
  {
    key: "draftPreviewText",
    title: "标注摘要",
    type: "text",
    minWidth: 160,
    maxWidth: 320,
    ellipsis: 2,
  },
  {
    key: "labelerName",
    title: "申诉人",
    type: "user",
    user: { idField: "labelerId", nameField: "labelerName", role: "LABELER" },
  },
  {
    key: "submissionDisplayLabel",
    title: "提交",
    type: "link",
    minWidth: 120,
    ellipsis: 1,
    link: {
      labelField: "submissionDisplayLabel",
      action: "openRelated",
      resourceKey: "submissions",
      idField: "submissionId",
    },
  },
  {
    key: "submissionStatus",
    title: "提交状态",
    type: "status",
    dict: "submission_status",
    minWidth: 120,
  },
  { key: "appealNo", title: "申诉次", type: "number", width: 72, minWidth: 64 },
  { key: "status", title: "申诉状态", type: "text", minWidth: 88 },
  {
    key: "reasonText",
    title: "申诉理由",
    type: "text",
    minWidth: 160,
    maxWidth: 280,
    ellipsis: 2,
  },
  { key: "createdAt", title: "申诉时间", type: "datetime", sortable: true, minWidth: 128 },
  { key: "decidedAt", title: "裁决时间", type: "datetime", sortable: true, minWidth: 128 },
];

export const ownerAppealMetaDetailSection: DetailSectionSchema = {
  key: "appeal",
  title: "申诉信息",
  fields: [
    { key: "status", label: "申诉状态", type: "text" },
    { key: "appealNo", label: "申诉次数", type: "number" },
    { key: "reasonText", label: "申诉理由", type: "text" },
    { key: "decisionReasonText", label: "裁决说明", type: "text" },
    { key: "createdAt", label: "申诉时间", type: "datetime" },
    { key: "decidedAt", label: "裁决时间", type: "datetime" },
    {
      key: "taskTitle",
      label: "任务",
      type: "link",
      link: {
        labelField: "taskTitle",
        action: "openRelated",
        resourceKey: "tasks",
        idField: "taskId",
      },
    },
    {
      key: "submissionDisplayLabel",
      label: "提交记录",
      type: "link",
      link: {
        labelField: "submissionDisplayLabel",
        action: "openRelated",
        resourceKey: "submissions",
        idField: "submissionId",
      },
    },
    { key: "submissionStatus", label: "提交状态", type: "status", dict: "submission_status" },
    {
      key: "labelerName",
      label: "申诉人",
      type: "user",
      user: { idField: "labelerId", nameField: "labelerName", role: "LABELER" },
    },
    {
      key: "ownerName",
      label: "任务 Owner",
      type: "user",
      user: { idField: "ownerId", nameField: "ownerName", role: "OWNER" },
    },
  ],
};

/** 与 labelerTaskItems / 验收样本一致的题目展示 */
export const ownerAppealItemDetailSection: DetailSectionSchema = {
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
};

/** 与「我的草稿」一致的标注作答展示 */
export const ownerAppealAnnotateDetailSection: DetailSectionSchema = {
  key: "draftContent",
  title: "标注内容",
  fields: [
    { key: "currentRoundNo", label: "轮次", type: "number" },
    {
      key: "annotateForm",
      label: "",
      type: "templateForm",
      templateForm: { role: "input", dataField: "draftData" },
    },
  ],
};

export const ownerAppealItemRawDetailSection: DetailSectionSchema = {
  key: "raw",
  title: "原始 JSON",
  fields: [{ key: "payloadJson", label: "题目载荷", type: "json" }],
};

export const ownerAppealDetailSections: DetailSectionSchema[] = [
  ownerAppealMetaDetailSection,
  ownerAppealItemDetailSection,
  ownerAppealAnnotateDetailSection,
  ownerAppealItemRawDetailSection,
];
