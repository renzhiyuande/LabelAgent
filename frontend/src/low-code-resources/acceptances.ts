import { normalizeSnowflakeId } from "@/low-code/lib/id-utils";
import type { ResourceMeta } from "@/low-code/schema/types";

function baseStatusLabel(status?: unknown): string {
  switch (String(status ?? "")) {
    case "PENDING":
      return "待抽样";
    case "SAMPLING":
      return "抽样中";
    case "CONFIRMED":
      return "已确认";
    case "REOPENED":
      return "已重开";
    case "ARCHIVED":
      return "已归档";
    default:
      return String(status ?? "—");
  }
}

/** 后端 status 在抽检阶段恒为 SAMPLING/REOPENED，展示文案按检查进度细分。 */
export function resolveAcceptanceStatusText(record: Record<string, unknown>): string {
  const status = String(record.status ?? "");
  const total = Number(record.sampleTotalCount ?? 0);
  const checked = Number(record.sampledCount ?? 0);

  if ((status === "SAMPLING" || status === "REOPENED") && total > 0) {
    if (checked >= total) {
      return "待确认";
    }
    if (checked > 0) {
      return "抽检中";
    }
    return "待抽检";
  }

  return baseStatusLabel(status);
}

export const acceptancesResource: ResourceMeta = {
  resource: "acceptances",
  label: "数据验收",
  idKey: "id",
  page: {
    summary: {
      variant: "strip",
      badge: "抽样进度摘要",
      title: "验收抽样概况",
      description: "汇总当前筛选下的抽样进度、待确认与确认结果。",
      emptyTitle: "当前筛选下暂无验收单",
      emptyDescription: "可以先生成验收单，或切换任务筛选查看历史验收记录。",
      metrics: [
        { key: "completion", label: "抽样完成度" },
        { key: "readyToConfirmCount", label: "待确认" },
        { key: "inProgressCount", label: "抽检中" },
        { key: "confirmedVsFailed", label: "确认 / 打回" },
      ],
      actions: [{ label: "Owner 看板", href: "/dashboard/owner" }],
    },
  },
  permissions: {
    page: ["system:admin", "business:acceptance:manage"],
  },
  capabilities: {
    query: false,
    detail: true,
    create: true,
    edit: false,
    delete: false,
  },
  normalizeRecord: (record) => ({
    ...record,
    id: normalizeSnowflakeId(record.id) ?? record.id,
    taskId: normalizeSnowflakeId(record.taskId) ?? record.taskId,
    statusText: resolveAcceptanceStatusText(record),
    taskTitle:
      record.taskTitle != null && String(record.taskTitle).trim() !== ""
        ? String(record.taskTitle)
        : record.taskId != null
          ? String(record.taskId)
          : "—",
  }),
  api: {
    query: "/api/v1/owner/acceptances",
    detail: "/api/v1/owner/acceptances/{id}",
    create: "/api/v1/owner/acceptances",
    actions: {
      generateSamples: "/api/v1/owner/acceptances/{id}/samples",
      confirm: "/api/v1/owner/acceptances/{id}/confirm",
      reopen: "/api/v1/owner/acceptances/{id}/reopen",
    },
  },
  table: {
    pagination: true,
    selectable: false,
    defaultSort: { field: "createdAt", order: "desc" },
    columns: [
      { key: "id", title: "验收单ID", type: "link", link: { action: "detail" } },
      {
        key: "taskTitle",
        title: "任务",
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
      { key: "acceptanceType", title: "验收类型", type: "text" },
      { key: "statusText", title: "验收状态", type: "text" },
      { key: "sampleTotalCount", title: "样本总数", type: "number" },
      { key: "sampledCount", title: "已检查数", type: "number" },
      { key: "passCount", title: "通过数", type: "number" },
      { key: "failedCount", title: "打回数", type: "number" },
      { key: "confirmedAt", title: "确认时间", type: "datetime", sortable: true },
      { key: "createdAt", title: "创建时间", type: "datetime", sortable: true },
    ],
  },
  filters: {
    fields: [
      { key: "status", label: "验收状态", component: "select", field: "status", operator: "eq", dict: "acceptance_status"},
      { key: "taskId", label: "任务", component: "remoteSelect", field: "taskId", operator: "eq", remote: { source: "tasks" } }],
  },
  form: {
    sections: [
      {
        key: "basic",
        title: "验收配置",
        fields: [
          { key: "taskId", label: "任务ID", component: "remoteSelect", required: true, remote: { source: "tasks" } },
          {
            key: "sampleMode",
            label: "抽样方式",
            component: "select",
            required: true,
            defaultValue: "RATIO",
            options: [
              { label: "比例抽样", value: "RATIO" },
              { label: "固定数量", value: "FIXED" },
            ],
          },
          { key: "sampleValue", label: "抽样值", component: "number", required: true },
        ],
      },
    ],
    actions: [],
  },
  detail: {
    width: "lg",
    sections: [
      {
        key: "basic",
        title: "验收单信息",
        fields: [
          { key: "id", label: "验收单ID", type: "text" },
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
          { key: "acceptanceType", label: "验收类型", type: "text" },
          { key: "statusText", label: "验收状态", type: "text" },
          { key: "sampleTotalCount", label: "样本总数", type: "number" },
          { key: "sampledCount", label: "已检查数", type: "number" },
          { key: "passCount", label: "通过数", type: "number" },
          { key: "failedCount", label: "打回数", type: "number" },
          { key: "commentText", label: "备注", type: "text" },
          { key: "confirmedAt", label: "确认时间", type: "datetime" },
          { key: "createdAt", label: "创建时间", type: "datetime" },
        ],
      },
    ],
  },
  actions: [
    {
      key: "samples",
      label: "查看样本",
      kind: "request",
      permission: ["system:admin", "business:acceptance:manage"],
      sidePanel: {
        resourceKey: "acceptanceSamples",
        scope: { field: "acceptanceId", from: "id" },
        width: "xl",
        hideFilters: ["acceptanceId"],
        title: "验收单 {id} · 样本列表",
        description: "查看并处理当前验收单的抽样明细。",
      },
    },
    {
      key: "generateSamples",
      label: "生成样本",
      kind: "request",
      permission: ["system:admin", "business:acceptance:manage"],
      visibleWhen: [{ field: "status", operator: "in", value: ["PENDING", "REOPENED"] }],
      confirm: {
        title: "确认生成验收样本？",
        description: "会按当前验收单配置重新生成抽样样本。",
        confirmText: "生成",
        cancelText: "取消",
      },
    },
    {
      key: "confirm",
      label: "确认验收",
      kind: "request",
      permission: ["system:admin", "business:acceptance:manage"],
      visibleWhen: [{ field: "status", operator: "in", value: ["SAMPLING", "REOPENED"] }],
      confirm: {
        title: "确认当前验收单？",
        description: "全部样本检查完成后可确认；确认后会把任务验收状态更新为已确认。",
        confirmText: "确认",
        cancelText: "取消",
      },
    },
    {
      key: "reopen",
      label: "重开验收",
      kind: "danger",
      permission: ["system:admin", "business:acceptance:manage"],
      visibleWhen: [{ field: "status", operator: "eq", value: "CONFIRMED" }],
      confirm: {
        title: "确认重开当前验收单？",
        description: "重开后可重新抽样或再次确认。",
        confirmText: "重开",
        cancelText: "取消",
      },
    },
  ],
  headerActions: [],
};
