import { normalizeSnowflakeId } from "@/low-code/lib/id-utils";
import type { ResourceMeta } from "@/low-code/schema/types";

function sampleStatusLabel(status?: unknown): string {
  switch (String(status ?? "")) {
    case "PENDING":
      return "待检查";
    case "CHECKED":
      return "已检查";
    default:
      return String(status ?? "—");
  }
}

function decisionLabel(value?: unknown): string {
  switch (String(value ?? "")) {
    case "PASS":
      return "通过";
    case "FAIL":
      return "打回";
    default:
      return String(value ?? "—");
  }
}

function sampleSourceLabel(value?: unknown): string {
  switch (String(value ?? "")) {
    case "AUTO":
      return "自动抽样";
    case "MANUAL":
      return "手动添加";
    default:
      return String(value ?? "—");
  }
}

export const acceptanceSamplesResource: ResourceMeta = {
  resource: "acceptanceSamples",
  label: "验收样本",
  idKey: "id",
  permissions: {
    page: ["system:admin", "business:acceptance:manage"],
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
    acceptanceId: normalizeSnowflakeId(record.acceptanceId) ?? record.acceptanceId,
    taskId: normalizeSnowflakeId(record.taskId) ?? record.taskId,
    itemId: normalizeSnowflakeId(record.itemId) ?? record.itemId,
    assignmentId: normalizeSnowflakeId(record.assignmentId) ?? record.assignmentId,
    submissionId: normalizeSnowflakeId(record.submissionId) ?? record.submissionId,
    submissionVersionId: normalizeSnowflakeId(record.submissionVersionId) ?? record.submissionVersionId,
    labelerId: normalizeSnowflakeId(record.labelerId) ?? record.labelerId,
    sampleStatusText: sampleStatusLabel(record.sampleStatus),
    ownerDecisionText: decisionLabel(record.ownerDecision),
    sampleSourceText: sampleSourceLabel(record.sampleSource),
    submissionStatus: record.submissionStatus ?? record.status,
  }),
  api: {
    query: "/api/v1/owner/acceptances/{acceptanceId}/samples",
    detail: "/api/v1/owner/acceptances/{acceptanceId}/samples/{id}",
    actions: {
      decide: "/api/v1/owner/acceptances/samples/{id}/decision",
    },
  },
  table: {
    pagination: true,
    selectable: false,
    defaultSort: { field: "id", order: "desc" },
    columns: [
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
        key: "submitPreviewText",
        title: "标注摘要",
        type: "text",
        minWidth: 160,
        maxWidth: 320,
        ellipsis: 2,
      },
      {
        key: "labelerName",
        title: "标注员",
        type: "user",
        user: { idField: "labelerId", nameField: "labelerName", role: "LABELER" },
      },
      { key: "submissionStatus", title: "提交状态", type: "status", dict: "submission_status", minWidth: 96 },
      { key: "currentRoundNo", title: "轮次", type: "number", width: 56, minWidth: 48 },
      { key: "sampleSourceText", title: "样本来源", type: "text" },
      { key: "sampleStatusText", title: "样本状态", type: "text" },
      { key: "ownerDecisionText", title: "验收结论", type: "text" },
      { key: "ownerCommentText", title: "验收备注", type: "text" },
      { key: "checkedAt", title: "检查时间", type: "datetime", sortable: true },
    ],
    rowActions: [
      {
        key: "pass",
        label: "通过",
        kind: "request",
        api: "/api/v1/owner/acceptances/samples/{id}/decision",
        requestBody: { decision: "PASS" },
        permission: ["system:admin", "business:acceptance:manage"],
        visibleWhen: [{ field: "sampleStatus", operator: "eq", value: "PENDING" }],
      },
      {
        key: "fail",
        label: "打回",
        kind: "danger",
        api: "/api/v1/owner/acceptances/samples/{id}/decision",
        requestBody: { decision: "FAIL" },
        permission: ["system:admin", "business:acceptance:manage"],
        visibleWhen: [{ field: "sampleStatus", operator: "eq", value: "PENDING" }],
      },
    ],
  },
  filters: {
    fields: [],
  },
  form: { sections: [], actions: [] },
  detail: {
    width: "lg",
    sections: [
      {
        key: "item",
        title: "题目信息",
        fields: [
          { key: "sourceItemKey", label: "源数据标识", type: "text" },
          { key: "itemSeqNo", label: "题目序号", type: "number" },
          {
            key: "itemForm",
            label: "题目内容",
            type: "templateForm",
            templateForm: { role: "display" },
          },
        ],
      },
      {
        key: "submission",
        title: "标注信息",
        fields: [
          {
            key: "labelerName",
            label: "标注员",
            type: "user",
            user: { idField: "labelerId", nameField: "labelerName", role: "LABELER" },
          },
          { key: "submissionStatus", label: "提交状态", type: "status", dict: "submission_status" },
          { key: "currentRoundNo", label: "轮次", type: "number" },
          {
            key: "annotateForm",
            label: "标注内容",
            type: "templateForm",
            templateForm: { role: "input", dataField: "submitData" },
          },
        ],
      },
      {
        key: "acceptance",
        title: "验收信息",
        fields: [
          { key: "sampleSourceText", label: "样本来源", type: "text" },
          { key: "sampleStatusText", label: "样本状态", type: "text" },
          { key: "ownerDecisionText", label: "验收结论", type: "text" },
          { key: "ownerCommentText", label: "验收备注", type: "text" },
          { key: "checkedAt", label: "检查时间", type: "datetime" },
        ],
      },
    ],
  },
  actions: [],
};
