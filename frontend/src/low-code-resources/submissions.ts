import { normalizeSnowflakeId } from "@/low-code/lib/id-utils";
import type { ResourceMeta } from "@/low-code/schema/types";

export const submissionsResource: ResourceMeta = {
  resource: "submissions",
  label: "提交记录",
  idKey: "id",
  permissions: {
    page: ["system:admin", "business:assignment:read", "business:submission:read"],
    create: ["system:admin", "business:assignment:update", "business:submission:update"],
    edit: ["system:admin", "business:assignment:update", "business:submission:update"],
  },
  capabilities: {
    query: true,
    detail: true,
    create: true,
    edit: true,
  },
  normalizeRecord: (record) => {
    const row = record as Record<string, unknown>;
    const status = row.status ?? row.currentStatus;
    return {
      ...row,
      id: normalizeSnowflakeId(row.id) ?? row.id,
      assignmentId: normalizeSnowflakeId(row.assignmentId) ?? row.assignmentId,
      taskId: normalizeSnowflakeId(row.taskId) ?? row.taskId,
      itemId: normalizeSnowflakeId(row.itemId) ?? row.itemId,
      labelerId: normalizeSnowflakeId(row.labelerId) ?? row.labelerId,
      status,
      currentStatus: status,
    };
  },
  prepareValues: (values) => ({
    assignmentId: values.assignmentId ? Number(values.assignmentId) : null,
    draftData: values.draftData ?? {},
    autoSave: Boolean(values.autoSave),
    finalSubmitData: values.finalSubmitData ?? {},
    comment: values.comment || null,
  }),
  api: {
    query: "/api/v1/owner/submissions",
    detail: "/api/v1/owner/submissions/{id}",
    create: "/api/v1/owner/submissions/draft",
    update: "/api/v1/owner/submissions/{id}/draft",
    actions: {
      submit: "/api/v1/owner/submissions/{id}/submit",
    },
  },
  table: {
    pagination: true,
    selectable: false,
    defaultSort: { field: "createdAt", order: "desc" },
    columns: [
      {
        key: "taskTitle",
        title: "任务",
        type: "link",
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
        link: {
          labelField: "sourceItemKey",
          action: "openRelated",
          resourceKey: "taskItems",
          idField: "itemId",
          pathParams: { taskId: "taskId" },
        },
      },
      { key: "itemSeqNo", title: "序号", type: "number" },
      {
        key: "payloadPreview",
        title: "题目摘要",
        type: "text",
        formatter: "payloadPreview",
        width: 200,
      },
      {
        key: "labelerName",
        title: "标注员",
        type: "user",
        user: { idField: "labelerId", nameField: "labelerName", role: "LABELER" },
      },
      { key: "status", title: "提交状态", type: "status", sortable: true, dict: "submission_status" },
      { key: "currentRoundNo", title: "轮次", type: "number" },
      { key: "draftSavedAt", title: "草稿保存时间", type: "datetime", sortable: true },
      { key: "lastSubmittedAt", title: "最后提交时间", type: "datetime", sortable: true },
      { key: "createdAt", title: "创建时间", type: "datetime", sortable: true },
    ],
  },
  filters: {
    fields: [
      {
        key: "status",
        label: "提交状态",
        component: "select",
        field: "status",
        operator: "eq",
        dict: "submission_status",
      },
      {
        key: "keyword",
        label: "关键词",
        component: "text",
        field: "keyword",
        operator: "like",
        placeholder: "题目标识",
      },
      {
        key: "taskId",
        label: "任务",
        component: "remoteSelect",
        field: "taskId",
        operator: "eq",
        remote: { source: "tasks" },
      },
      {
        key: "labelerId",
        label: "标注员",
        component: "remoteSelect",
        field: "labelerId",
        operator: "eq",
        remote: { source: "collaborators", params: { role: "LABELER" } },
      },
    ],
  },
  form: {
    width: "lg",
    sections: [
      {
        key: "createDraft",
        title: "创建草稿",
        fields: [
          { key: "assignmentId", label: "分配ID", component: "text", required: true, placeholder: "雪花 ID" },
        ],
      },
      {
        key: "saveDraft",
        title: "草稿内容",
        fields: [
          { key: "draftData", label: "草稿数据", component: "json", required: true, defaultValue: {} },
          { key: "autoSave", label: "自动保存", component: "switch", defaultValue: false },
        ],
      },
    ],
    actions: [
      { key: "cancel", label: "取消" },
      { key: "submit", label: "保存草稿", kind: "submit" },
    ],
  },
  detail: {
    sections: [
      {
        key: "basic",
        title: "提交信息",
        fields: [
          { key: "taskTitle", label: "任务名称", type: "text" },
          { key: "taskCode", label: "任务编码", type: "text" },
          { key: "sourceItemKey", label: "源数据标识", type: "text" },
          { key: "itemSeqNo", label: "题目序号", type: "number" },
          { key: "payloadPreview", label: "题目摘要", type: "json", formatter: "payloadPreview" },
          {
            key: "labelerName",
            label: "标注员",
            type: "user",
            user: { idField: "labelerId", nameField: "labelerName", role: "LABELER" },
          },
          { key: "currentStatus", label: "当前状态", type: "status", dict: "submission_status" },
          { key: "currentRoundNo", label: "当前轮次", type: "number" },
          { key: "submitCount", label: "提交次数", type: "number" },
          { key: "assignmentId", label: "分配ID", type: "text" },
          { key: "taskId", label: "任务ID", type: "text" },
          { key: "itemId", label: "题目ID", type: "text" },
          { key: "draftSavedAt", label: "草稿保存时间", type: "datetime" },
          { key: "lastSubmittedAt", label: "最后提交时间", type: "datetime" },
          { key: "createdAt", label: "创建时间", type: "datetime" },
        ],
      },
      {
        key: "draft",
        title: "草稿数据",
        fields: [
          { key: "draftData", label: "草稿内容", type: "json" },
        ],
      },
    ],
  },
  actions: [
    {
      key: "create",
      label: "新建提交记录",
      kind: "drawer",
      permission: ["system:admin", "business:assignment:update", "business:submission:update"],
    },
    {
      key: "edit",
      label: "保存草稿",
      kind: "drawer",
      permission: ["system:admin", "business:assignment:update", "business:submission:update"],
      visibleWhen: [{ field: "status", operator: "eq", value: "DRAFT" }],
    },
    {
      key: "submit",
      label: "正式提交",
      kind: "request",
      permission: ["system:admin", "business:assignment:update", "business:submission:update"],
      visibleWhen: [{ field: "status", operator: "eq", value: "DRAFT" }],
    },
    {
      key: "viewAiReview",
      label: "AI 审核详情",
      kind: "request",
      actionCode: "viewAiReview",
      permission: ["system:admin", "business:submission:read"],
      visibleWhen: [
        { field: "status", operator: "in", value: ["AI_PASSED", "AI_REJECTED", "HUMAN_REVIEWING", "APPROVED", "REJECTED", "NEEDS_REVISION", "SUBMITTED", "AI_REVIEWING"] },
      ],
    },
  ],
};
