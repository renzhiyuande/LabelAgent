import { normalizeSnowflakeId } from "@/low-code/lib/id-utils";
import type { ResourceMeta } from "@/low-code/schema/types";
import {
  labelerMyTaskInfoSection,
  labelerMyTaskProgressSection,
  labelerMyTaskSubmitHistorySection,
} from "./labeler-submission-display.shared";

/**
 * 我的任务：按 task 聚合展示当前标注员领取过的任务。
 * - 列表 GET /api/v1/labeler/my-tasks?page&pageSize&keyword
 * - 详情 GET /api/v1/labeler/my-tasks/{taskId}
 * - 点击「继续作答」→ /labeler/work/{nextAssignmentId}
 */
export const labelerMyTasksResource: ResourceMeta = {
  resource: "labelerMyTasks",
  label: "我的任务",
  idKey: "taskId",
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
  page: {
    key: "card",
    card: {
      layout: "grid",
      columns: { base: 1, md: 2, lg: 3, xl: 4 },
      title: { field: "taskName", fallback: "未命名任务" },
      subtitle: { field: "sceneCode" },
      description: { field: "descriptionText", maxLines: 3, fallback: "" },
      badges: [
        {
          field: "openCount",
          enum: [
            { value: 0, label: "全部已交", tone: "success" },
          ],
        },
      ],
      metrics: [
        { label: "我领取数", field: "totalCount" },
        { label: "待作答", field: "openCount" },
        { label: "需修改", field: "needsRevisionCount" },
      ],
      primaryAction: "continue",
      secondaryActions: ["viewDetail"],
      clickable: true,
      showOverflowMenu: false,
      empty: {
        title: "暂无领取任务",
        description: "去任务广场领一些题目吧",
      },
      skeleton: { count: 8 },
    },
  },
  normalizeRecord: (record) => {
    const row = record as Record<string, unknown>;
    const openCount = Number(row.openCount ?? 0);
    const needsRevisionCount = Number(row.needsRevisionCount ?? 0);
    const nextAssignmentId = normalizeSnowflakeId(row.nextAssignmentId) ?? row.nextAssignmentId;
    return {
      ...row,
      taskId: normalizeSnowflakeId(row.taskId) ?? row.taskId,
      nextAssignmentId,
      ownerId: normalizeSnowflakeId(row.ownerId) ?? row.ownerId,
      canContinueWork: nextAssignmentId != null && nextAssignmentId !== "",
      hasPendingWork: openCount > 0 || needsRevisionCount > 0,
    };
  },
  api: {
    query: "/api/v1/labeler/my-tasks",
    detail: "/api/v1/labeler/my-tasks/{id}",
    create: "/api/v1/labeler/my-tasks",
    update: "/api/v1/labeler/my-tasks/{id}",
  },
  table: {
    pagination: true,
    selectable: false,
    defaultSort: { field: "lastActivityAt", order: "desc" },
    columns: [
      { key: "taskName", title: "任务名称", type: "text" },
      { key: "sceneCode", title: "场景", type: "text" },
      { key: "totalCount", title: "我领取数", type: "number" },
      { key: "openCount", title: "待作答", type: "number" },
      { key: "submittedCount", title: "待审核", type: "number" },
      { key: "submittedEverCount", title: "已提交", type: "number" },
      { key: "approvedCount", title: "已通过", type: "number" },
      { key: "needsRevisionCount", title: "需修改", type: "number" },
      { key: "lastActivityAt", title: "最近活动", type: "datetime" },
      { key: "deadlineAt", title: "任务截止", type: "datetime" },
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
        placeholder: "任务名称 / 编码",
      },
    ],
  },
  form: { sections: [], actions: [] },
  detail: {
    width: "lg",
    layout: "tabs",
    sections: [
      labelerMyTaskProgressSection,
      labelerMyTaskInfoSection,
      labelerMyTaskSubmitHistorySection,
    ],
  },
  actions: [
    {
      key: "continue",
      label: "继续作答",
      kind: "link",
      permission: ["business:labeler:workbench"],
      href: "/labeler/work/{nextAssignmentId}",
      visibleWhen: [{ field: "canContinueWork", operator: "eq", value: true }],
    },
    {
      key: "viewDetail",
      label: "查看详情",
      kind: "drawer",
      permission: ["business:labeler:workbench"],
    },
  ],
};
