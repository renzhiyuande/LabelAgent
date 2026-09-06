import { normalizeSnowflakeId } from "@/low-code/lib/id-utils";
import type { ResourceMeta } from "@/low-code/schema/types";

/**
 * 任务广场：列表/详情/领取均使用 Labeler REST（Legacy），不走低代码 engine。
 * - 列表 GET /api/v1/labeler/market?page&pageSize&keyword&sceneCode
 * - 批量领取 POST /api/v1/labeler/tasks/{taskId}/claim-batch
 *   一次按任务的 maxClaimPerUser 配额领取多题，成功后跳「我的任务」
 */
export const labelerMarketResource: ResourceMeta = {
  resource: "labelerMarket",
  label: "任务广场",
  idKey: "taskId",
  permissions: {
    page: ["business:labeler:workbench"],
  },
  capabilities: {
    query: false,
    detail: false,
    create: false,
    edit: false,
    delete: false,
  },
  page: {
    key: "card",
    card: {
      layout: "grid",
      columns: { base: 1, md: 2, lg: 3 },
      title: { field: "taskName", fallback: "未命名任务" },
      subtitle: { field: "sceneCode" },
      description: { field: "descriptionText", maxLines: 2, fallback: "暂无任务说明" },
      badges: [
        {
          field: "status",
          dict: "task_status",
        },
        {
          field: "templateReady",
          enum: [
            { value: true, label: "模板就绪", tone: "success" },
            { value: false, label: "模板未就绪", tone: "warning" },
          ],
        },
      ],
      metrics: [
        { label: "剩余题量", field: "remainingItems" },
        { label: "已领取", field: "claimedItems" },
        { label: "截止时间", field: "deadlineAt", formatter: "datetime" },
      ],
      primaryAction: "claim",
      clickable: false,
      showOverflowMenu: false,
      empty: {
        title: "暂无可领取任务",
        description: "请稍后再来，或调整筛选条件",
      },
      skeleton: { count: 6 },
    },
  },
  normalizeRecord: (record) => {
    const row = record as Record<string, unknown>;
    return {
      ...row,
      taskId: normalizeSnowflakeId(row.taskId) ?? row.taskId,
      taskName: row.taskName ?? row.title,
      assignmentId: normalizeSnowflakeId(row.assignmentId) ?? row.assignmentId,
    };
  },
  api: {
    query: "/api/v1/labeler/market",
    detail: "/api/v1/labeler/market/{id}",
    create: "/api/v1/labeler/market",
    update: "/api/v1/labeler/market/{id}",
    actions: {
      claim: "/api/v1/labeler/tasks/{taskId}/claim-batch",
    },
  },
  table: {
    pagination: true,
    selectable: false,
    defaultSort: { field: "updatedAt", order: "desc" },
    columns: [
      { key: "taskName", title: "任务名称", type: "text" },
      { key: "sceneCode", title: "场景", type: "text" },
      { key: "status", title: "状态", type: "status" },
      { key: "remainingItems", title: "剩余题量", type: "number" },
      { key: "templateReady", title: "模板就绪", type: "text" },
      { key: "canClaim", title: "可领取", type: "text" },
      { key: "deadlineAt", title: "截止时间", type: "datetime" },
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
        placeholder: "任务名称",
      },
      {
        key: "sceneCode",
        label: "标注场景",
        component: "text",
        field: "sceneCode",
        operator: "eq",
      },
    ],
  },
  form: {
    sections: [],
    actions: [],
  },
  detail: {
    sections: [
      {
        key: "basic",
        title: "任务信息",
        fields: [
          { key: "taskName", label: "任务名称", type: "text" },
          { key: "sceneCode", label: "场景", type: "text" },
          { key: "status", label: "状态", type: "text" },
          { key: "remainingItems", label: "剩余题量", type: "number" },
          { key: "claimedItems", label: "已领取", type: "number" },
          { key: "templateReady", label: "模板就绪", type: "text" },
          { key: "canClaim", label: "可领取", type: "text" },
          { key: "blockReason", label: "不可领取原因", type: "text" },
          { key: "deadlineAt", label: "截止时间", type: "datetime" },
          { key: "descriptionText", label: "说明", type: "text" },
        ],
      },
    ],
  },
  actions: [
    {
      key: "claim",
      label: "批量领取",
      kind: "request",
      permission: ["business:labeler:workbench"],
      api: "/api/v1/labeler/tasks/{taskId}/claim-batch",
      confirm: {
        title: "确认批量领取？",//todo 实现自定义数量输入
        description: "系统按任务的「单人最大领取数量」一次性为您分配尚未作答的题目，领完进入「我的任务」",
      },
      visibleWhen: [{ field: "canClaim", operator: "eq", value: true }],
      navigateOnSuccess: { href: "/labeler/my-tasks" },
    },
  ],
};
