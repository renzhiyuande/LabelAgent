import { normalizeSnowflakeId } from "@/low-code/lib/id-utils";
import type { ResourceMeta } from "@/low-code/schema/types";
import {
  enrichRewardSettlementDisplayRecord,
  ownerRewardRuleRemoteSchemaFormSection,
  rewardRuleSnapshotDetailField,
} from "./reward-settlement-display.shared";

function statusLabel(status?: unknown): string {
  switch (String(status ?? "")) {
    case "DRAFT":
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

export const rewardSettlementsResource: ResourceMeta = {
  resource: "rewardSettlements",
  label: "奖励结算",
  idKey: "id",
  page: {
    summary: {
      badge: "当前筛选摘要",
      title: "奖励批次概况",
      description: "汇总当前筛选下的批次金额、待确认与待打款数量。",
      emptyTitle: "当前筛选下暂无奖励批次",
      emptyDescription: "可以切换任务或状态，确认是否还没有生成结算批次。",
      metrics: [
        { key: "totalAmount", label: "批次总金额" },
        { key: "draftCount", label: "待确认批次" },
        { key: "confirmedCount", label: "待打款批次" },
        { key: "closedCount", label: "已关闭批次" },
      ],
      actions: [{ label: "Owner 统计详情", href: "/dashboard/owner" }],
    },
  },
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
      taskId: normalizeSnowflakeId(record.taskId) ?? record.taskId,
      confirmedBy: normalizeSnowflakeId(record.confirmedBy) ?? record.confirmedBy,
      exportFileId: normalizeSnowflakeId(record.exportFileId) ?? record.exportFileId,
      statusText: statusLabel(record.status),
    }),
  api: {
    query: "/api/v1/owner/reward-settlements",
    detail: "/api/v1/owner/reward-settlements/{id}",
    options: {
      tasks: "/api/v1/engine/options/tasks",
    },
    actions: {
      createBatch: "/api/v1/owner/reward-settlements/tasks/{taskId}",
      confirm: "/api/v1/owner/reward-settlements/{id}/confirm",
      markPaid: "/api/v1/owner/reward-settlements/{id}/paid",
      reverse: "/api/v1/owner/reward-settlements/{id}/reverse",
      export: "/api/v1/owner/reward-settlements/{id}/export",
    },
  },
  table: {
    pagination: true,
    selectable: false,
    defaultSort: { field: "createdAt", order: "desc" },
    columns: [
      { key: "batchNo", title: "批次号", type: "link", link: { action: "detail" } },
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
      { key: "statusText", title: "批次状态", type: "text" },
      { key: "totalAmount", title: "总金额", type: "number" },
      { key: "effectiveTotalCount", title: "有效条数", type: "number" },
      { key: "userTotalCount", title: "标注员数", type: "number" },
      { key: "confirmedAt", title: "确认时间", type: "datetime", sortable: true },
      { key: "paidAt", title: "打款时间", type: "datetime", sortable: true },
      { key: "createdAt", title: "创建时间", type: "datetime", sortable: true },
    ],
  },
  filters: {
    fields: [
      { key: "keyword", label: "关键词", component: "text", field: "keyword", operator: "like", placeholder: "批次号 / 任务名" },
      {
        key: "status",
        label: "批次状态",
        component: "select",
        field: "status",
        operator: "eq",
        options: [
          { label: "待确认", value: "DRAFT" },
          { label: "已确认", value: "CONFIRMED" },
          { label: "已打款", value: "PAID" },
          { label: "已冲正", value: "REVERSED" },
        ],
      },
      { key: "taskId", label: "任务", component: "remoteSelect", field: "taskId", operator: "eq", remote: { source: "tasks" } }
    ],
  },
  form: { sections: [ownerRewardRuleRemoteSchemaFormSection], actions: [] },
  detail: {
    width: "lg",
    sections: [
      {
        key: "basic",
        title: "批次信息",
        fields: [
          { key: "taskTitle", label: "任务名称", type: "text" },
          { key: "taskId", label: "任务ID", type: "text" },
          { key: "batchNo", label: "批次号", type: "text" },
          { key: "statusText", label: "批次状态", type: "text" },
          { key: "settleScope", label: "结算范围", type: "text" },
          { key: "currencyCode", label: "币种", type: "text" },
          { key: "totalAmount", label: "总金额", type: "number" },
          { key: "targetTotalCount", label: "目标条数", type: "number" },
          { key: "effectiveTotalCount", label: "有效条数", type: "number" },
          { key: "userTotalCount", label: "标注员数", type: "number" },
          { key: "remark", label: "备注", type: "text" },
        ],
      },
      {
        key: "audit",
        title: "确认与打款",
        fields: [
          {
            key: "confirmedByName",
            label: "确认人",
            type: "user",
            user: { idField: "confirmedBy", nameField: "confirmedByName", role: "OWNER" },
          },
          { key: "confirmedAt", label: "确认时间", type: "datetime" },
          { key: "paidAt", label: "打款时间", type: "datetime" },
          { key: "reversedAt", label: "冲正时间", type: "datetime" },
          { key: "exportFileName", label: "导出文件", type: "link" },
        ],
      },
      {
        key: "rule",
        title: "奖励规则快照",
        fields: [rewardRuleSnapshotDetailField],
      },
    ],
  },
  actions: [
    {
      key: "details",
      label: "查看明细",
      kind: "request",
      permission: ["system:admin", "business:reward:manage"],
      sidePanel: {
        resourceKey: "rewardSettlementDetails",
        scope: { field: "batchId", from: "id" },
        width: "xl",
        hideFilters: ["batchId"],
        title: "{batchNo} · 奖励明细",
        description: "查看这批奖励的用户与提交级明细。",
      },
    },
    {
      key: "confirm",
      label: "确认",
      kind: "request",
      permission: ["system:admin", "business:reward:manage"],
      visibleWhen: [{ field: "status", operator: "eq", value: "DRAFT" }],
      confirm: {
        title: "确认该奖励批次？",
        description: "确认后将写入确认时间，并把明细状态更新为已确认。",
        confirmText: "确认",
        cancelText: "取消",
      },
    },
    {
      key: "markPaid",
      label: "已打款",
      kind: "request",
      permission: ["system:admin", "business:reward:manage"],
      visibleWhen: [{ field: "status", operator: "eq", value: "CONFIRMED" }],
      confirm: {
        title: "确认该批次已打款？",
        description: "将把批次与明细状态更新为已打款。",
        confirmText: "确认打款",
        cancelText: "取消",
      },
    },
    {
      key: "reverse",
      label: "冲正",
      kind: "danger",
      permission: ["system:admin", "business:reward:manage"],
      visibleWhen: [{ field: "status", operator: "in", value: ["DRAFT", "CONFIRMED", "PAID"] }],
      confirm: {
        title: "确认冲正该批次？",
        description: "冲正后批次和明细都会标记为已冲正，后续可重新结算。",
        confirmText: "确认冲正",
        cancelText: "取消",
      },
    },
    {
      key: "export",
      label: "导出",
      kind: "request",
      permission: ["system:admin", "business:reward:manage"],
      visibleWhen: [{ field: "status", operator: "eq", value: "CONFIRMED" }],
    },
  ],
  headerActions: [
    {
      key: "createBatch",
      label: "生成奖励批次",
      kind: "request",
      permission: ["system:admin", "business:reward:manage"],
      prompt: {
        title: "生成奖励批次",
        description: "选择要结算奖励的任务",
        confirmLabel: "生成",
        fields: [
          {
            key: "taskId",
            label: "任务",
            component: "remoteSelect",
            required: true,
            placeholder: "请选择任务",
            remote: { source: "tasks" },
          },
        ],
      },
    },
  ],
};
