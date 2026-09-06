import { normalizeSnowflakeId } from "@/low-code/lib/id-utils";
import type { ResourceMeta } from "@/low-code/schema/types";

function statusLabel(status?: unknown): string {
  switch (String(status ?? "")) {
    case "PENDING":
      return "待处理";
    case "RUNNING":
      return "导出中";
    case "SUCCESS":
      return "已完成";
    case "FAILED":
      return "失败";
    case "CANCELLED":
      return "已取消";
    default:
      return String(status ?? "—");
  }
}

function formatLabel(format?: unknown): string {
  switch (String(format ?? "")) {
    case "JSON":
      return "JSON";
    case "JSONL":
      return "JSONL";
    case "CSV":
      return "CSV";
    case "EXCEL":
      return "Excel";
    default:
      return String(format ?? "—");
  }
}

export const exportsResource: ResourceMeta = {
  resource: "exports",
  label: "数据导出",
  idKey: "id",
  page: {
    summary: {
      badge: "导出运行摘要",
      title: "导出任务概况",
      description: "汇总当前筛选下的处理中、可下载和失败任务数量。",
      emptyTitle: "当前筛选下暂无导出任务",
      emptyDescription: "可以先创建导出任务，或切换筛选查看历史结果。",
      metrics: [
        { key: "runningCount", label: "处理中任务" },
        { key: "successCount", label: "可下载结果" },
        { key: "failedCount", label: "失败 / 取消" },
        { key: "totalRecordCount", label: "累计记录数" },
      ],
      actions: [{ label: "Owner 统计详情", href: "/dashboard/owner" }],
    },
  },
  permissions: {
    page: ["system:admin", "business:export:manage"],
  },
  capabilities: {
    query: true,
    detail: true,
    create: true,
    edit: false,
    delete: false,
  },
  normalizeRecord: (record) => ({
    ...record,
    id: normalizeSnowflakeId(record.id) ?? record.id,
    taskId: normalizeSnowflakeId(record.taskId) ?? record.taskId,
    statusText: statusLabel(record.status),
    exportFormatText: formatLabel(record.exportFormat),
    taskTitle:
      record.taskTitle != null && String(record.taskTitle).trim() !== ""
        ? String(record.taskTitle)
        : record.taskId != null
          ? String(record.taskId)
          : "—",
  }),
  api: {
    query: "/api/v1/owner/exports",
    detail: "/api/v1/owner/exports/{id}",
    create: "/api/v1/owner/exports",
    options: {
      tasks: "/api/v1/engine/options/tasks",
    },
  },
  table: {
    pagination: true,
    selectable: false,
    defaultSort: { field: "createdAt", order: "desc" },
    columns: [
      { key: "jobName", title: "导出名称", type: "link", link: { action: "detail" } },
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
      { key: "exportFormatText", title: "导出格式", type: "text" },
      { key: "statusText", title: "导出状态", type: "text" },
      { key: "progressPercent", title: "进度(%)", type: "number" },
      { key: "totalRecordCount", title: "记录数", type: "number" },
      { key: "createdAt", title: "创建时间", type: "datetime", sortable: true },
    ],
  },
  filters: {
    fields: [
      { key: "keyword", label: "关键词", component: "text", field: "keyword", operator: "like", placeholder: "导出名称" },
      { key: "taskId", label: "任务", component: "remoteSelect", field: "taskId", operator: "eq", remote: { source: "tasks" } },
      { key: "status", label: "状态", component: "select", field: "status", operator: "eq", dict: "async_task_status" },
    ],
  },
  form: {
    width: "lg",
    sections: [
      {
        key: "basic",
        title: "导出配置",
        fields: [
          { key: "jobName", label: "导出名称", component: "text", required: true },
          {
            key: "taskId",
            label: "任务",
            component: "remoteSelect",
            required: true,
            placeholder: "请选择任务",
            remote: { source: "tasks" },
          },
          {
            key: "exportFormat",
            label: "导出格式",
            component: "select",
            required: true,
            defaultValue: "CSV",
            options: [
              { label: "CSV", value: "CSV" },
              { label: "Excel", value: "EXCEL" },
              { label: "JSON", value: "JSON" },
              { label: "JSONL", value: "JSONL" },
            ],
          },
          {
            key: "fieldMappings",
            label: "导出字段",
            component: "treeMultiSelect",
            span: 12,
            remote: {
              source: "exportFields",
              params: { taskId: { from: "taskId" } },
            },
            description:
              "先选择任务后加载可选字段：模板题目展示、标注作答、运行时镜像、审核结论与提交生命周期。不选则导出默认列。",
          },
          {
            key: "exportDataScope",
            label: "数据范围",
            component: "select",
            defaultValue: "APPROVED_ONLY",
            options: [
              { label: "仅已通过", value: "APPROVED_ONLY" },
              { label: "全部状态", value: "ALL" },
            ],
            description: "未指定提交状态时，按此范围筛选；指定状态后仅导出所选状态。",
          },
          {
            key: "submissionStatuses",
            label: "提交状态",
            component: "multiSelect",
            dict: "submission_status",
            description: "可选，多选后仅导出对应状态的提交记录。",
          },
          {
            key: "labelerId",
            label: "标注员",
            component: "user",
            user: { role: "LABELER" },
            description: "可选，仅导出指定标注员的提交。",
          },
        ],
      },
    ],
    actions: [
      { key: "cancel", label: "取消" },
      { key: "submit", label: "创建导出", kind: "submit" },
    ],
  },
  detail: {
    width: "lg",
    sections: [
      {
        key: "basic",
        title: "导出任务信息",
        fields: [
          { key: "id", label: "导出ID", type: "text" },
          { key: "jobName", label: "导出名称", type: "text" },
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
          { key: "exportFormatText", label: "导出格式", type: "text" },
          { key: "statusText", label: "导出状态", type: "text" },
          { key: "progressPercent", label: "进度(%)", type: "number" },
          { key: "totalRecordCount", label: "记录数", type: "number" },
          { key: "createdAt", label: "创建时间", type: "datetime" },
        ],
      },
    ],
  },
  prepareValues: (values) => {
    const fieldMappingsRaw = values.fieldMappings;
    const fieldMappings = Array.isArray(fieldMappingsRaw)
      ? fieldMappingsRaw.map((item) => String(item).trim()).filter(Boolean)
      : String(fieldMappingsRaw ?? "")
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);

    const submissionStatuses = Array.isArray(values.submissionStatuses)
      ? values.submissionStatuses.map((item) => String(item).trim()).filter(Boolean)
      : [];
    const exportScope = values.exportDataScope === "ALL" ? "ALL" : "APPROVED_ONLY";
    const labelerIdRaw = values.labelerId;
    const labelerId =
      labelerIdRaw == null || labelerIdRaw === ""
        ? undefined
        : Number(labelerIdRaw);

    const filterConditionsJson: Record<string, unknown> = {
      exportScope,
    };
    if (submissionStatuses.length > 0) {
      filterConditionsJson.statuses = submissionStatuses;
    }
    if (labelerId != null && !Number.isNaN(labelerId)) {
      filterConditionsJson.labelerId = labelerId;
    }

    return {
      jobName: values.jobName,
      exportFormat: values.exportFormat,
      taskId: values.taskId ? Number(values.taskId) : values.taskId,
      filterConditionsJson,
      fieldMappings,
    };
  },
  actions: [
    {
      key: "download",
      label: "下载",
      kind: "request",
      actionCode: "exportDownload",
      permission: ["system:admin", "business:export:manage"],
      visibleWhen: [{ field: "status", operator: "eq", value: "SUCCESS" }],
    },
  ],
  headerActions: [
    {
      key: "create",
      label: "创建导出",
      kind: "drawer",
      permission: ["system:admin", "business:export:manage"],
    },
  ],
};
