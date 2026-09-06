import { normalizeSnowflakeId } from "@/low-code/lib/id-utils";
import {
  ASSIGNMENT_BOARD_BATCH_ASSIGN_COLUMNS,
  ASSIGNMENT_BOARD_TABLE_COLUMNS,
} from "../features/business/shared/assignment-board-columns";
import { prepareBatchAssignValues } from "@/low-code/utils/prepare-batch-assign-values";
import type { ResourceMeta } from "@/low-code/schema/types";

/**
 * 分配管理题目池：按 task_item 展示指派状态（方案 A），不依赖发布 preseed。
 */
export const taskAssignmentBoardResource: ResourceMeta = {
  resource: "taskAssignmentBoard",
  label: "分配题目池",
  idKey: "id",
  permissions: {
    page: ["system:admin", "business:assignment:read", "business:task:read"],
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
    assignmentId: normalizeSnowflakeId(record.assignmentId) ?? record.assignmentId,
    labelerId: normalizeSnowflakeId(record.labelerId) ?? record.labelerId,
  }),
  prepareValues: prepareBatchAssignValues,
  api: {
    query: "/api/v1/owner/tasks/{taskId}/assignment-board",
    detail: "/api/v1/owner/tasks/{taskId}/items/{id}",
    create: "/api/v1/owner/assignments/batch",
    options: {
      collaborators: "/api/v1/business/options/collaborators",
    },
  },
  table: {
    pagination: true,
    selectable: true,
    bulkActions: [
      {
        key: "batchAssign",
        label: "批量指派",
        kind: "drawer",
        permission: ["system:admin", "business:assignment:create"],
      },
      {
        key: "batchCancel",
        label: "批量取消分配",
        kind: "request",
        permission: ["system:admin", "business:assignment:update"],
        confirm: {
          title: "确认取消选中的 {count} 项分配？",
          description: "将取消这些题目的有效分配（未领取/已认领）；已提交等状态无法取消。",
          confirmText: "确认取消",
          cancelText: "返回",
        },
      },
      {
        key: "batchReopen",
        label: "批量打开",
        kind: "request",
        permission: ["system:admin", "business:assignment:update"],
        confirm: {
          title: "确认打开选中的 {count} 项取消分配？",
          description: "仅已取消的分配记录可打开，打开后会恢复为待认领状态。",
          confirmText: "确认打开",
          cancelText: "返回",
        },
      },
    ],
    defaultSort: { field: "seqNo", order: "asc" },
    columns: ASSIGNMENT_BOARD_TABLE_COLUMNS,
    rowActions: [
      {
        key: "viewSubmissionAttempts",
        label: "标注记录",
        kind: "request",
        permission: ["system:admin", "business:assignment:read"],
        visibleWhen: [{ field: "assignmentId", operator: "notEmpty", value: true }],
        sidePanel: {
          resourceKey: "assignmentSubmissionAttempts",
          scope: {
            field: "assignmentId",
            from: "assignmentId",
          },
          width: "xl",
          hideFilters: ["assignmentId"],
          title: "第 {seqNo} 题 · 标注记录",
          description: "源标识 {sourceItemKey} · 查看历次标注 attempt（含已归档）",
        },
      },
    ],
  },
  filters: {
    fields: [
      {
        key: "keyword",
        label: "关键词",
        component: "text",
        field: "keyword",
        operator: "like",
        placeholder: "序号或源标识",
      },
      {
        key: "assignStatus",
        label: "指派状态",
        component: "select",
        field: "assignStatus",
        operator: "eq",
        defaultValue: "ALL",
        options: [
          { label: "未指派", value: "UNASSIGNED" },
          { label: "已指派", value: "ASSIGNED" },
          { label: "已取消", value: "CANCELLED" },
        ],
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
    title: "批量指派标注员",
    description: "将未指派的题目批量分配给一名标注员；已指派的题目不可勾选。",
    width: "lg",
    sections: [
      {
        key: "target",
        title: "指派对象",
        fields: [
          {
            key: "labelerId",
            label: "标注员",
            component: "user",
            required: true,
            remote: { source: "collaborators", params: { role: "LABELER" } },
            user: { idField: "labelerId", nameField: "labelerDisplayName", role: "LABELER" },
          },
          { key: "deadlineAt", label: "截止时间", component: "datetime" },
        ],
      },
      {
        key: "items",
        title: "待指派题目",
        fields: [
          {
            key: "board",
            label: "",
            component: "dynamicTable",
            dynamicTable: {
              dataSource: "resource",
              resourceKey: "taskAssignmentBoard",
              scope: { field: "taskId", from: "context.scope" },
              listFilters: [{ field: "assignStatus", op: "eq", value: "UNASSIGNED" }],
              selectable: true,
              selectionPath: "selectedItemIds",
              pagination: true,
              pageSize: 10,
              height: 480,
              hideActionsColumn: true,
              rowSelectableWhen: [{ field: "assignable", operator: "eq", value: true }],
              columns: ASSIGNMENT_BOARD_BATCH_ASSIGN_COLUMNS,
              empty: { title: "暂无未指派题目" },
            },
          },
        ],
      },
    ],
    actions: [
      { key: "cancel", label: "取消" },
      { key: "submit", label: "确认批量指派", kind: "submit" },
    ],
  },
  detail: {
    width: "lg",
    sections: [
      {
        key: "meta",
        title: "管理信息",
        fields: [
          { key: "seqNo", label: "序号", type: "text" },
          { key: "sourceItemKey", label: "源数据标识", type: "text" },
          { key: "itemStatus", label: "数据项状态", type: "text" },
          { key: "currentAssignmentCount", label: "当前分配次数", type: "text" },
          { key: "createdAt", label: "创建时间", type: "datetime" },
        ],
      },
      {
        key: "payload",
        title: "业务数据",
        fields: [{ key: "payload", label: "", type: "payloadMap" }],
      },
      {
        key: "raw",
        title: "原始 JSON",
        fields: [{ key: "payloadJson", label: "完整载荷", type: "json" }],
      },
    ],
  },
  headerActions: [
    {
      key: "batchAssign",
      label: "批量指派",
      kind: "drawer",
      permission: ["system:admin", "business:assignment:create"],
    },
  ],
  actions: [],
};
