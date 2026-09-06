import { normalizeSnowflakeId } from "@/low-code/lib/id-utils";
import type { ResourceMeta } from "@/low-code/schema/types";
import {
  buildCalcBasisDetailFields,
  enrichRewardSettlementDisplayRecord,
  labelerRewardRuleRemoteSchemaFormSection,
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

export const labelerMyRewardsResource: ResourceMeta = {
  resource: "labelerMyRewards",
  label: "我的奖励",
  idKey: "id",
  page: {
    summary: {
      badge: "个人奖励摘要",
      title: "我的奖励概况",
      description: "汇总当前筛选下的累计奖励、待确认与待打款状态。",
      emptyTitle: "当前筛选下暂无奖励明细",
      emptyDescription: "可以切换任务或状态筛选，查看历史奖励记录。",
      metrics: [
        { key: "totalAmount", label: "累计奖励" },
        { key: "pendingCount", label: "待确认" },
        { key: "confirmedCount", label: "待打款" },
        { key: "settledVsReversed", label: "已完成 / 冲正" },
      ],
      actions: [{ label: "Labeler 统计详情", href: "/dashboard/labeler" }],
    },
  },
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
    query: "/api/v1/labeler/my-rewards",
    detail: "/api/v1/labeler/my-rewards/{id}",
  },
  table: {
    pagination: true,
    selectable: false,
    defaultSort: { field: "createdAt", order: "desc" },
    columns: [
      {
        key: "taskTitle",
        title: "任务名称",
        type: "link",
        minWidth: 120,
        ellipsis: 1,
        link: {
          labelField: "taskTitle",
          action: "openRelated",
          resourceKey: "labelerMyTasks",
          idField: "taskId",
        },
      },
      // { key: "taskTitle", title: "任务名称", type: "text" },
      { key: "batchNo", title: "批次号", type: "text" },
      { key: "statusText", title: "奖励状态", type: "text" },
      { key: "batchStatusText", title: "批次状态", type: "text" },
      { key: "amount", title: "金额", type: "number" },
      { key: "rewardReason", title: "奖励原因", type: "text" },
      { key: "settledAt", title: "结算时间", type: "datetime", sortable: true },
      { key: "batchPaidAt", title: "打款时间", type: "datetime", sortable: true },
      { key: "createdAt", title: "创建时间", type: "datetime", sortable: true },
    ],
  },
  filters: {
    fields: [
      { key: "keyword", label: "关键词", component: "text", field: "keyword", operator: "like", placeholder: "任务名 / 批次号" },
      {
        key: "status",
        label: "奖励状态",
        component: "select",
        field: "status",
        operator: "eq",
        options: [
          { label: "待确认", value: "PENDING" },
          { label: "已确认", value: "CONFIRMED" },
          { label: "已打款", value: "PAID" },
          { label: "已冲正", value: "REVERSED" },
        ],
      },
      {
        key: "batchStatus",
        label: "批次状态",
        component: "select",
        field: "batchStatus",
        operator: "eq",
        options: [
          { label: "待确认", value: "DRAFT" },
          { label: "已确认", value: "CONFIRMED" },
          { label: "已打款", value: "PAID" },
          { label: "已冲正", value: "REVERSED" },
        ],
      },
      { key: "taskId", label: "任务", component: "remoteSelect", field: "taskId", operator: "eq", remote: { source: "tasks" } }],
  },
  form: { sections: [labelerRewardRuleRemoteSchemaFormSection], actions: [] },
  detail: {
    width: "lg",
    sections: [
      {
        key: "basic",
        title: "奖励信息",
        fields: [
          { key: "taskTitle", label: "任务名称", type: "text" },
          { key: "batchNo", label: "批次号", type: "text" },
          { key: "statusText", label: "奖励状态", type: "text" },
          { key: "batchStatusText", label: "批次状态", type: "text" },
          { key: "amount", label: "金额", type: "number" },
          { key: "rewardReason", label: "奖励原因", type: "text" },
          { key: "currencyCode", label: "币种", type: "text" },
          { key: "settledAt", label: "结算时间", type: "datetime" },
          { key: "batchPaidAt", label: "打款时间", type: "datetime" },
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
          { key: "reversedAt", label: "冲正时间", type: "datetime" },
        ],
      },
      {
        key: "basis",
        title: "计算依据",
        fields: buildCalcBasisDetailFields("labeler"),
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
