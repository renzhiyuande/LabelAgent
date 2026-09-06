import { normalizeSnowflakeId } from "@/low-code/lib/id-utils";
import type { ResourceMeta } from "@/low-code/schema/types";

/** 某 assignment 下历次 submission attempt（含已归档），由侧栏列表展示 */
export const assignmentSubmissionAttemptsResource: ResourceMeta = {
  resource: "assignmentSubmissionAttempts",
  label: "标注记录",
  idKey: "id",
  permissions: {
    page: ["system:admin", "business:assignment:read", "business:submission:read"],
  },
  capabilities: {
    query: false,
    detail: true,
    create: false,
    edit: false,
    delete: false,
  },
  normalizeRecord: (record) => {
    const row = record as Record<string, unknown>;
    const isCurrent = row.isCurrent === true || row.isCurrent === 1;
    const rawName = row.labelerName;
    const labelerName =
      rawName != null && String(rawName).trim() !== ""
        ? String(rawName)
        : row.labelerId != null
          ? `#${row.labelerId}`
          : "-";
    const status = row.status ?? row.currentStatus;
    return {
      ...row,
      id: normalizeSnowflakeId(row.id) ?? row.id,
      assignmentId: normalizeSnowflakeId(row.assignmentId) ?? row.assignmentId,
      labelerId: normalizeSnowflakeId(row.labelerId) ?? row.labelerId,
      labelerName: isCurrent ? `${labelerName}（当前）` : labelerName,
      status,
      currentStatus: status,
      isCurrent,
    };
  },
  api: {
    query: "/api/v1/owner/assignments/{assignmentId}/submission-attempts",
    detail: "/api/v1/owner/submissions/{id}",
  },
  table: {
    pagination: true,
    selectable: false,
    defaultSort: { field: "createdAt", order: "desc" },
    rowActionKeys: ["viewAiReview"],
    columns: [
      {
        key: "labelerName",
        title: "标注员",
        type: "user",
        minWidth: 120,
        user: { idField: "labelerId", nameField: "labelerName", role: "LABELER" },
      },
      { key: "status", title: "状态", type: "status", dict: "submission_status", minWidth: 108 },
      { key: "currentRoundNo", title: "轮次", type: "number", width: 56, minWidth: 48 },
      { key: "submitCount", title: "提交次数", type: "number", width: 80, minWidth: 72 },
      {
        key: "draftPreviewText",
        title: "草稿摘要",
        type: "text",
        minWidth: 160,
        ellipsis: 2,
        formatter: "ellipsis",
      },
      {
        key: "supersededReason",
        title: "归档原因",
        type: "text",
        minWidth: 120,
        enum: [
          { label: "换标注员归档", value: "LABELER_REASSIGNED" },
          { label: "新标注员认领", value: "LABELER_CLAIMED" },
        ],
      },
      { key: "supersededAt", title: "归档时间", type: "datetime", minWidth: 140 },
      { key: "createdAt", title: "创建时间", type: "datetime", minWidth: 140 },
      { key: "lastSubmittedAt", title: "最后提交", type: "datetime", minWidth: 140 },
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
        key: "attempt",
        title: "标注 attempt",
        fields: [
          {
            key: "labelerName",
            label: "标注员",
            type: "user",
            user: { idField: "labelerId", nameField: "labelerName", role: "LABELER" },
          },
          { key: "currentStatus", label: "状态", type: "status", dict: "submission_status" },
          { key: "currentRoundNo", label: "轮次", type: "number" },
          { key: "submitCount", label: "提交次数", type: "number" },
          { key: "draftPreviewText", label: "草稿摘要", type: "text" },
          { key: "draftSavedAt", label: "草稿保存时间", type: "datetime" },
          { key: "lastSubmittedAt", label: "最后提交", type: "datetime" },
          { key: "createdAt", label: "创建时间", type: "datetime" },
        ],
      },
      {
        key: "context",
        title: "题目上下文",
        fields: [
          { key: "taskTitle", label: "任务", type: "text" },
          { key: "sourceItemKey", label: "源数据标识", type: "text" },
          { key: "itemSeqNo", label: "题目序号", type: "number" },
          { key: "payloadPreview", label: "题目摘要", type: "json", formatter: "payloadPreview" },
          { key: "assignmentId", label: "分配 ID", type: "text" },
        ],
      },
      {
        key: "draft",
        title: "草稿数据",
        fields: [{ key: "draftData", label: "草稿内容", type: "json" }],
      },
    ],
  },
  actions: [
    {
      key: "viewAiReview",
      label: "AI 审核详情",
      kind: "request",
      actionCode: "viewAiReview",
      permission: ["system:admin", "business:submission:read"],
      visibleWhen: [
        {
          field: "status",
          operator: "in",
          value: [
            "AI_PASSED",
            "AI_REJECTED",
            "HUMAN_REVIEWING",
            "APPROVED",
            "REJECTED",
            "NEEDS_REVISION",
            "SUBMITTED",
            "AI_REVIEWING",
          ],
        },
      ],
    },
  ],
};
