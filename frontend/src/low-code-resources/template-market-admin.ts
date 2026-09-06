import { normalizeSnowflakeId } from "@/low-code/lib/id-utils";
import type { ResourceMeta } from "@/low-code/schema/types";

/**
 * 模板市场管理：管理员审核模板上架申请
 * - 列表 GET /api/v1/template-market/admin
 * - 详情 GET /api/v1/template-market/admin/{id}
 * - 审核 POST /api/v1/template-market/audit/{id}
 */
export const templateMarketAdminResource: ResourceMeta = {
  resource: "templateMarketAdmin",
  label: "模板市场管理",
  idKey: "id",
  permissions: {
    page: "template:market:audit",
    list: "template:market:audit",
    show: "template:market:audit",
  },
  capabilities: {
    query: true,
    detail: true,
    create: false,
    edit: false,
    delete: false,
  },
  api: {
    query: "/api/v1/template-market/admin",
    detail: "/api/v1/template-market/admin/{id}",
  },
  table: {
    pagination: true,
    selectable: false,
    defaultSort: { field: "publishedAt", order: "desc" },
    columns: [
      { key: "templateName", title: "模板名称", type: "text", sortable: true },
      { key: "templateCode", title: "模板编码", type: "text", sortable: true },
      { key: "publisherName", title: "发布者", type: "text", sortable: true },
      {
        key: "auditStatus",
        title: "审核状态",
        type: "status",
        sortable: true,
        dict: "template_market_status",
      },
      {
        key: "marketStatus",
        title: "上架状态",
        type: "status",
        sortable: true,
        enum: [{ label: "已上架", value: "ACTIVE" }, { label: "已下架", value: "OFFLINE" }],
      },
      { key: "publishedAt", title: "发布时间", type: "datetime", sortable: true },
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
        placeholder: "模板名称 / 编码",
      },
      {
        key: "auditStatus",
        label: "审核状态",
        component: "select",
        field: "auditStatus",
        operator: "eq",
        placeholder: "请选择状态",
        dict: "template_market_status",
      },
    ],
  },
  form: {
    sections: [],
    actions: [],
  },
  normalizeRecord: (record) => {
    const row = record as Record<string, unknown>;
    return {
      ...row,
      id: normalizeSnowflakeId(row.id) ?? row.id,
    };
  },
  detail: {
    sections: [
      {
        key: "basic",
        title: "模板信息",
        fields: [
          { key: "templateName", label: "模板名称", type: "text" },
          { key: "templateCode", label: "模板编码", type: "text" },
          { key: "templateDesc", label: "模板描述", type: "text" },
          { key: "sceneCode", label: "标注场景", type: "text" },
          { key: "publisherName", label: "发布者", type: "text" },
          { key: "versionInfo", label: "版本信息", type: "text" },
          { key: "auditStatus", label: "审核状态", type: "status", dict: "template_market_status" },
          {
            key: "marketStatus",
            label: "上架状态",
            type: "enum",
            enum: [{ value: "ACTIVE", label: "已上架" }, { value: "OFFLINE", label: "已下架" }],
          },
          {
            key: "isFeatured",
            label: "是否精选",
            type: "enum",
            enum: [{ value: 1, label: "是" }, { value: 0, label: "否" }],
          },
          { key: "publishedAt", label: "发布时间", type: "datetime" },
        ],
      },
      {
        key: "statistics",
        title: "统计信息",
        fields: [
          { key: "downloadCount", label: "下载量", type: "number" },
          { key: "favoriteCount", label: "收藏数", type: "number" },
          { key: "ratingAvg", label: "平均评分", type: "number" },
        ],
      },
      {
        key: "audit",
        title: "审核信息",
        fields: [
          { key: "reviewComment", label: "审核意见", type: "text" },
          { key: "reviewedAt", label: "审核时间", type: "datetime" },
          { key: "reviewerName", label: "审核人", type: "text" },
        ],
      },
    ],
  },
  actions: [
    {
      key: "approve",
      label: "通过审核",
      kind: "request",
      permission: "template:market:audit",
      visibleWhen: [{ field: "auditStatus", operator: "eq", value: "PENDING" }],
      confirm: {
        title: "确认通过审核？",
        description: "通过后该模板可继续上架到模板市场",
        confirmText: "确认通过",
        cancelText: "取消",
      },
    },
    {
      key: "reject",
      label: "拒绝审核",
      kind: "danger",
      permission: "template:market:audit",
      visibleWhen: [{ field: "auditStatus", operator: "eq", value: "PENDING" }],
      confirm: {
        title: "确认拒绝审核？",
        description: "请输入拒绝原因",
        confirmText: "确认拒绝",
        cancelText: "取消",
      },
    },
    {
      key: "publish",
      label: "上架",
      kind: "request",
      permission: "template:market:audit",
      visibleWhen: [{ field: "auditStatus", operator: "eq", value: "APPROVED" }, { field: "marketStatus", operator: "ne", value: "ACTIVE" }],
      confirm: {
        title: "确认上架？",
        description: "上架后模板会出现在公开模板市场中。",
        confirmText: "确认上架",
        cancelText: "取消",
      },
    },
    {
      key: "offline",
      label: "下架",
      kind: "danger",
      permission: "template:market:audit",
      visibleWhen: [{ field: "auditStatus", operator: "eq", value: "APPROVED" }, { field: "marketStatus", operator: "eq", value: "ACTIVE" }],
      confirm: {
        title: "确认下架？",
        description: "下架后模板将不再显示在公开模板市场中。",
        confirmText: "确认下架",
        cancelText: "取消",
      },
    },
  ],
};
