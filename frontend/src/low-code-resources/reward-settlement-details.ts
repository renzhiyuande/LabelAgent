import { normalizeSnowflakeId } from "@/low-code/lib/id-utils";
import type { ResourceMeta } from "@/low-code/schema/types";
import {
  buildCalcBasisDetailFields,
  enrichRewardSettlementDisplayRecord,
  ownerRewardRuleRemoteSchemaFormSection,
  rewardRuleSnapshotDetailField,
} from "./reward-settlement-display.shared";

function statusLabel(status?: unknown): string {
  switch (String(status ?? "")) {
    case "PENDING":
      return "待确认";
    case "CONFIRMED":
      return "已确认";
    case "PAID":
      return "已打款";
    case "REVERSED":
      return "已冲正";
    default:
      return String(status ?? "—");
  }
}

export const rewardSettlementDetailsResource: ResourceMeta = {
  resource: "rewardSettlementDetails",
  label: "奖励明细",
  idKey: "id",
  permissions: {
    page: ["system:admin", "business:reward:manage"],
  },
  capabilities: {
    query: false,
    detail: true,
    create: false,
    edit: false,
    delete: false,
  },
  normalizeRecord: (record) =>
    enrichRewardSettlementDisplayRecord({
      ...record,
      id: normalizeSnowflakeId(record.id) ?? record.id,
      batchId: normalizeSnowflakeId(record.batchId) ?? record.batchId,
      taskId: normalizeSnowflakeId(record.taskId) ?? record.taskId,
      userId: normalizeSnowflakeId(record.userId) ?? record.userId,
      submissionId: normalizeSnowflakeId(record.submissionId) ?? record.submissionId,
      submissionVersionId: normalizeSnowflakeId(record.submissionVersionId) ?? record.submissionVersionId,
      assignmentId: normalizeSnowflakeId(record.assignmentId) ?? record.assignmentId,
      statusText: statusLabel(record.status),
      batchStatusText: statusLabel(record.batchStatus),
    }),
  api: {
    query: "/api/v1/owner/reward-settlements/{batchId}/details",
    detail: "/api/v1/owner/reward-settlements/{batchId}/details/{id}",
  },
  table: {
    pagination: true,
    selectable: false,
    defaultSort: { field: "createdAt", order: "desc" },
    columns: [
      {
        key: "labelerDisplayName",
        title: "标注员",
        type: "user",
        user: { idField: "userId", nameField: "labelerDisplayName", role: "LABELER" },
      },
      {
        key: "taskTitle",
        title: "任务名称",
        type: "link",
        minWidth: 120,
        ellipsis: 1,
        link: {
          labelField: "taskTitle",
          action: "openRelated",
          resourceKey: "tasks",
          idField: "taskId",
        },
      },
      { key: "batchNo", title: "批次号", type: "text" },
      { key: "statusText", title: "明细状态", type: "text" },
      { key: "batchStatusText", title: "批次状态", type: "text" },
      { key: "amount", title: "金额", type: "number" },
      { key: "rewardReason", title: "奖励原因", type: "text" },
      { key: "effectiveAt", title: "生效时间", type: "datetime", sortable: true },
      { key: "settledAt", title: "结算时间", type: "datetime", sortable: true },
      { key: "createdAt", title: "创建时间", type: "datetime", sortable: true },
    ],
  },
  filters: {
    fields: [],
  },
  form: { sections: [ownerRewardRuleRemoteSchemaFormSection], actions: [] },
  detail: {
    width: "lg",
    sections: [
      {
        key: "basic",
        title: "明细信息",
        fields: [
          {
            key: "labelerDisplayName",
            label: "标注员",
            type: "user",
            user: { idField: "userId", nameField: "labelerDisplayName", role: "LABELER" },
          },
          { key: "taskTitle", label: "任务名称", type: "text" },
          { key: "batchNo", label: "批次号", type: "text" },
          { key: "statusText", label: "明细状态", type: "text" },
          { key: "batchStatusText", label: "批次状态", type: "text" },
          { key: "amount", label: "金额", type: "number" },
          { key: "rewardReason", label: "奖励原因", type: "text" },
          { key: "currencyCode", label: "币种", type: "text" },
        ],
      },
      {
        key: "source",
        title: "来源链路",
        fields: [
          { key: "submissionId", label: "提交ID", type: "text" },
          { key: "submissionVersionId", label: "提交版本ID", type: "text" },
          { key: "assignmentId", label: "分配ID", type: "text" },
          { key: "effectiveAt", label: "生效时间", type: "datetime" },
          { key: "settledAt", label: "结算时间", type: "datetime" },
          { key: "reversedAt", label: "冲正时间", type: "datetime" },
          { key: "batchConfirmedAt", label: "批次确认时间", type: "datetime" },
          { key: "batchPaidAt", label: "批次打款时间", type: "datetime" },
        ],
      },
      {
        key: "basis",
        title: "计算依据",
        fields: buildCalcBasisDetailFields("owner"),
      },
      {
        key: "rule",
        title: "规则快照",
        fields: [rewardRuleSnapshotDetailField],
      },
    ],
  },
  actions: [],
};
