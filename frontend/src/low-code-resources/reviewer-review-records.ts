import { normalizeSnowflakeId } from "@/low-code/lib/id-utils";
import { formatReviewActionLabel } from "@/features/review/utils/map-reviewer-review-records";
import type { ResourceMeta } from "@/low-code/schema/types";
import { reviewerReviewRecordDetailSections } from "./reviewer-review-record-display.shared";

export const reviewerReviewRecordsResource: ResourceMeta = {
  resource: "reviewerReviewRecords",
  label: "审核结果",
  idKey: "id",
  permissions: {
    page: ["business:reviewer:workbench"],
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
    const action = String(row.action ?? "");
    const actionLabel = formatReviewActionLabel(action);
    const isFinalDecision = Boolean(row.isFinalDecision);
    const reviewLevelLabel = String(row.reviewLevelLabel ?? "").trim();
    const reviewLevel = String(row.reviewLevel ?? "").trim();
    return {
      ...row,
      id: normalizeSnowflakeId(row.id) ?? row.id,
      submissionId: normalizeSnowflakeId(row.submissionId) ?? row.submissionId,
      taskId: normalizeSnowflakeId(row.taskId) ?? row.taskId,
      labelerId: normalizeSnowflakeId(row.labelerId) ?? row.labelerId,
      reviewerId: normalizeSnowflakeId(row.reviewerId) ?? row.reviewerId,
      reviewLevelDisplay: reviewLevelLabel || reviewLevel || "—",
      actionLabel: isFinalDecision ? `${actionLabel} · 终审` : actionLabel,
    };
  },
  api: {
    query: "/api/v1/reviewer/review-records",
    detail: "/api/v1/reviewer/review-records/{id}",
    options: {
      reviewerReviewLevels: "/api/v1/business/options/reviewerReviewLevels",
    },
  },
  table: {
    pagination: true,
    selectable: false,
    defaultSort: { field: "decidedAt", order: "desc" },
    rowActionKeys: ["viewSubmission"],
    columns: [
      {
        key: "submissionCode",
        title: "提交",
        type: "link",
        minWidth: 140,
        ellipsis: 1,
        link: {
          labelField: "submissionCode",
          action: "detail",
        },
      },
      { key: "title", title: "标题", type: "text", minWidth: 120, ellipsis: 2 },
      {
        key: "taskName",
        title: "任务",
        type: "link",
        minWidth: 120,
        ellipsis: 1,
        link: {
          labelField: "taskName",
          href: "/reviewer/audit-pool?scopeType=task&scopeIds={taskId}&scopeLabel={taskName}&status=all",
        },
      },
      {
        key: "labelerName",
        title: "标注员",
        type: "user",
        minWidth: 96,
        user: { idField: "labelerId", nameField: "labelerName", role: "LABELER" },
      },
      { key: "reviewLevelDisplay", title: "级别", type: "text", minWidth: 88 },
      { key: "actionLabel", title: "动作", type: "text", minWidth: 108 },
      {
        key: "reviewerName",
        title: "审核员",
        type: "user",
        minWidth: 96,
        user: { idField: "reviewerId", nameField: "reviewerName", role: "REVIEWER" },
      },
      { key: "decidedAt", title: "时间", type: "datetime", sortable: true, minWidth: 148 },
      {
        key: "commentText",
        title: "意见",
        type: "text",
        minWidth: 180,
        ellipsis: 2,
      },
    ],
  },
  filters: {
    primary: ["keyword", "taskId", "reviewLevel", "action"],
    fields: [
      {
        key: "keyword",
        label: "关键词",
        component: "text",
        field: "keyword",
        operator: "like",
        placeholder: "提交单号、任务、标注员、意见…",
      },
      {
        key: "taskId",
        label: "任务",
        component: "remoteSelect",
        field: "taskId",
        operator: "eq",
        placeholder: "全部任务",
        remote: { source: "tasks" },
      },
      {
        key: "reviewLevel",
        label: "审核级别",
        component: "remoteSelect",
        field: "reviewLevel",
        operator: "eq",
        placeholder: "全部级别",
        remote: {
          source: "reviewerReviewLevels",
          params: { taskId: { from: "taskId", required: false } },
        },
      },
      {
        key: "action",
        label: "审核动作",
        component: "select",
        field: "action",
        operator: "eq",
        placeholder: "全部动作",
        options: [
          { label: "通过", value: "APPROVE" },
          { label: "驳回", value: "REJECT" },
          { label: "打回修改", value: "RETURN" },
        ],
      },
    ],
  },
  form: { sections: [], actions: [] },
  detail: {
    width: "lg",
    layout: "tabs",
    sections: reviewerReviewRecordDetailSections,
  },
  actions: [
    {
      key: "viewSubmission",
      label: "查看提交",
      kind: "link",
      href: "/reviewer/audit-pool/{submissionId}?scopeType=task&scopeIds={taskId}&scopeLabel={taskName}&status=all",
    },
  ],
};
