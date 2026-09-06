import { normalizeSnowflakeId } from "@/low-code/lib/id-utils";
import type { ResourceMeta } from "@/low-code/schema/types";
import { assignmentLifecycleSection } from "./labeler-submission-display.shared";

export const assignmentsResource: ResourceMeta = {
  resource: "assignments",
  label: "任务分配",
  idKey: "id",
  permissions: {
    page: ["system:admin", "business:assignment:read"],
    create: ["system:admin", "business:assignment:create"],
    edit: ["system:admin", "business:assignment:update"],
    delete: ["system:admin", "business:assignment:update"],
  },
  capabilities: {
    query: true,
    detail: true,
    create: true,
    edit: true,
    delete: true,
  },
  normalizeRecord: (record) => {
    const row = record as Record<string, unknown>;
    return {
      ...row,
      id: normalizeSnowflakeId(row.id) ?? row.id,
      taskId: normalizeSnowflakeId(row.taskId) ?? row.taskId,
      itemId: normalizeSnowflakeId(row.itemId) ?? row.itemId,
      labelerId: normalizeSnowflakeId(row.labelerId) ?? row.labelerId,
    };
  },
  prepareValues: (values) => {
    const id = normalizeSnowflakeId(values.id);
    const labelerId = values.labelerId ? (normalizeSnowflakeId(values.labelerId) ?? values.labelerId) : null;
    const deadlineAt = values.deadlineAt || null;
    if (id) {
      return { labelerId, deadlineAt };
    }
    return {
      taskId: normalizeSnowflakeId(values.taskId) ?? values.taskId,
      itemId: normalizeSnowflakeId(values.itemId) ?? values.itemId,
      slotNo: values.slotNo ? Number(values.slotNo) : 1,
      labelerId,
      assignType: values.assignType || "MANUAL_ASSIGN",
      deadlineAt,
    };
  },
  api: {
    query: "/api/v1/owner/assignments",
    detail: "/api/v1/owner/assignments/{id}",
    create: "/api/v1/owner/assignments",
    update: "/api/v1/owner/assignments/{id}",
    delete: "/api/v1/owner/assignments/{id}",
    options: {
      collaborators: "/api/v1/business/options/collaborators",
      tasks: "/api/v1/engine/options/tasks",
      assignableTaskItems: "/api/v1/business/options/assignableTaskItems",
    },
    actions: {
      claim: "/api/v1/owner/assignments/{id}/claim",
      draft: "/api/v1/owner/assignments/{id}/draft",
      submit: "/api/v1/owner/assignments/{id}/submit",
      reopen: "/api/v1/owner/assignments/{id}/reopen",
    },
  },
  table: {
    pagination: true,
    selectable: true,
    bulkActions: [
      {
        key: "batchCancel",
        label: "批量取消分配",
        kind: "request",
        permission: ["system:admin", "business:assignment:update"],
        confirm: {
          title: "确认取消选中的 {count} 项分配？",
          description: "将取消这些分配记录（未领取/已认领）；已提交等状态无法取消。",
          confirmText: "确认取消",
          cancelText: "返回",
        },
      },
    ],
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
      { key: "status", title: "分配状态", type: "status", sortable: true, dict: "assignment_status" },
      { key: "assignType", title: "分配类型", type: "text", dict: "assignment_type" },
      { key: "claimedAt", title: "认领时间", type: "datetime", sortable: true },
      { key: "deadlineAt", title: "截止时间", type: "datetime", sortable: true },
      { key: "createdAt", title: "创建时间", type: "datetime", sortable: true },
    ],
  },
  filters: {
    fields: [
      {
        key: "status",
        label: "分配状态",
        component: "select",
        field: "status",
        operator: "eq",
        dict: "assignment_status",
      },
      {
        key: "keyword",
        label: "关键词",
        component: "text",
        field: "keyword",
        operator: "like",
        placeholder: "题目标识 / 序号",
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
        key: "basic",
        title: "分配信息",
        fields: [
          {
            key: "taskId",
            label: "任务",
            component: "remoteSelect",
            required: true,
            visibleIn: ["create"],
            placeholder: "请选择任务",
            remote: { source: "tasks" },
          },
          {
            key: "itemId",
            label: "题目",
            component: "remoteSelect",
            required: true,
            visibleIn: ["create"],
            placeholder: "请先选择任务",
            remote: {
              source: "assignableTaskItems",
              params: { taskId: { from: "taskId" } },
            },
          },
          {
            key: "slotNo",
            label: "分配槽位",
            component: "number",
            required: true,
            visibleIn: ["create", "edit"],
            defaultValue: 1,
            readonly: true,
          },
          {
            key: "taskTitle",
            label: "任务",
            component: "text",
            readonly: true,
            visibleIn: ["edit"],
          },
          {
            key: "sourceItemKey",
            label: "题目",
            component: "text",
            readonly: true,
            visibleIn: ["edit"],
          },
          {
            key: "labelerId",
            label: "标注员",
            component: "user",
            required: true,
            visibleIn: ["create", "edit"],
            remote: { source: "collaborators", params: { role: "LABELER" } },
            user: { idField: "labelerId", nameField: "labelerName", role: "LABELER" },
          },
          {
            key: "assignType",
            label: "分配类型",
            component: "select",
            required: true,
            defaultValue: "MANUAL_ASSIGN",
            dict: "assignment_type",
            visibleIn: ["create"],
          },
          { key: "deadlineAt", label: "截止时间", component: "datetime" },
        ],
      },
    ],
    actions: [
      { key: "cancel", label: "取消" },
      { key: "submit", label: "保存", kind: "submit" },
    ],
  },
  detail: {
    sections: [
      {
        key: "basic",
        title: "分配详情",
        fields: [
          { key: "taskTitle", label: "任务名称", type: "text" },
          { key: "taskCode", label: "任务编码", type: "text" },
          { key: "taskId", label: "任务ID", type: "text" },
          { key: "sourceItemKey", label: "源数据标识", type: "text" },
          { key: "itemSeqNo", label: "题目序号", type: "number" },
          { key: "itemId", label: "题目ID", type: "text" },
          { key: "payloadPreview", label: "题目摘要", type: "json", formatter: "payloadPreview" },
          { key: "slotNo", label: "分配槽位", type: "number" },
          {
            key: "labelerName",
            label: "标注员",
            type: "user",
            user: { idField: "labelerId", nameField: "labelerName", role: "LABELER" },
          },
          { key: "assignType", label: "分配类型", type: "text" },
          { key: "status", label: "分配状态", type: "status", dict: "assignment_status" },
          { key: "claimedAt", label: "认领时间", type: "datetime" },
          { key: "deadlineAt", label: "截止时间", type: "datetime" },
          { key: "createdAt", label: "创建时间", type: "datetime" },
        ],
      },
      assignmentLifecycleSection,
    ],
  },
  headerActions: [],
  actions: [
    { key: "create", label: "新建分配", kind: "drawer", permission: ["system:admin", "business:assignment:create"] },
    { key: "claim", label: "认领任务", kind: "request" },
    { key: "submit", label: "提交任务", kind: "request" },
    {
      key: "reopen",
      label: "重新打开",
      kind: "request",
      permission: ["system:admin", "business:assignment:update"],
      visibleWhen: [{ field: "status", operator: "in", value: ["EXPIRED", "CANCELLED"] }],
      confirm: {
        title: "确认重新打开该分配？",
        description: "仅用于已取消或已过期的分配，槽位将回到待认领。已提交的记录请使用标注员撤回或审核打回。",
        confirmText: "确认重新打开",
        cancelText: "返回",
      },
    },
    {
      key: "cancel",
      label: "取消分配",
      kind: "danger",
      permission: ["system:admin", "business:assignment:update"],
      visibleWhen: [{ field: "status", operator: "in", value: ["UNCLAIMED", "CLAIMED"] }],
      confirm: {
        title: "确认取消该分配？",
        description: "取消后该题目槽位可重新指派。",
        confirmText: "确认取消",
        cancelText: "返回",
      },
    },
  ],
};
