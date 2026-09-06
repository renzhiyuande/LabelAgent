import { normalizeSnowflakeId } from "@/low-code/lib/id-utils";
import type { ResourceMeta } from "@/low-code/schema/types";

/**
 * 模板市场：用户浏览、搜索和安装模板的市场视图
 * - 列表 GET /api/v1/template-market
 * - 详情 GET /api/v1/template-market/{id}
 * - 安装 POST /api/v1/template-market/{id}/install
 */
export const templateMarketResource: ResourceMeta = {
  resource: "templateMarket",
  label: "模板市场",
  idKey: "id",
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
      clickable: true,
      title: { field: "templateName", fallback: "未命名模板" },
      subtitle: { field: "sceneCode" },
      description: { field: "templateDesc", maxLines: 3, fallback: "暂无描述" },
      badges: [
        {
          field: "marketStatus",
          enum: [{ value: "ACTIVE", label: "已上架", tone: "success" }, { value: "INACTIVE", label: "未上架", tone: "default" }],
        },
        {
          field: "installed",
          enum: [{ value: true, label: "已安装", tone: "success" }, { value: false, label: "未安装", tone: "default" }],
        },
        {
          field: "isFeatured",
          enum: [
            { value: true, label: "精选", tone: "success" },{ value: false, label: "非精选", tone: "default" },
          ],
        },
      ],
      metrics: [
        { label: "下载量", field: "downloadCount" },
        { label: "收藏数", field: "favoriteCount" },
        { label: "评分", field: "ratingAvg", formatter: "number" },
      ],
      primaryAction: "install",
      showOverflowMenu: false,
      empty: {
        title: "暂无模板",
        description: "请稍后再来，或调整筛选条件",
      },
      skeleton: { count: 8 },
    },
  },
  api: {
    query: "/api/v1/template-market",
    detail: "/api/v1/template-market/{id}",
    actions: {
      install: "/api/v1/template-market/{id}/install",
    },
  },
  form: {
    sections: [],
    actions: [],
  },
  table: {
    pagination: true,
    selectable: false,
    defaultSort: { field: "publishedAt", order: "desc" },
    columns: [
      { key: "templateName", title: "模板名称", type: "text" },
      { key: "sceneCode", title: "场景", type: "text" },
      {
        key: "marketStatus",
        title: "上架状态",
        type: "status",
        enum: [{ label: "已上架", value: "ACTIVE" }],
      },
      { key: "downloadCount", title: "下载量", type: "number" },
      { key: "favoriteCount", title: "收藏数", type: "number" },
      { key: "ratingAvg", title: "评分", type: "number" },
      { key: "publishedAt", title: "发布时间", type: "datetime" },
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
        placeholder: "模板名称或描述",
      },
      {
        key: "sceneCode",
        label: "标注场景",
        component: "select",
        field: "sceneCode",
        operator: "eq",
        placeholder: "请选择场景",
        options: [],
        remote: {
          source: "sceneOptions",
        },
      },
    ],
  },
  normalizeRecord: (record) => {
    const row = record as Record<string, unknown>;
    const installed = row.installed === true || row.installed === 1 || row.installed === "true";
    const isFeatured = row.isFeatured === true || row.isFeatured === 1 || row.isFeatured === "true";
    return {
      ...row,
      id: normalizeSnowflakeId(row.id) ?? row.id,
      installed,
      isFeatured,
      installedTemplateId: normalizeSnowflakeId(row.installedTemplateId) ?? row.installedTemplateId,
      installedTemplateVersionId:
        normalizeSnowflakeId(row.installedTemplateVersionId) ?? row.installedTemplateVersionId,
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
          {
            key: "marketStatus",
            label: "上架状态",
            type: "enum",
            enum: [{ value: "ACTIVE", label: "已上架" }],
          },
          {
            key: "isFeatured",
            label: "是否精选",
            type: "enum",
            enum: [
              { value: 1, label: "是" },
              { value: 0, label: "否" },
            ],
          },
          { key: "publishedAt", label: "发布时间", type: "datetime" },
          {
            key: "installed",
            label: "安装状态",
            type: "enum",
            enum: [
              { value: true, label: "已安装" },
              { value: false, label: "未安装" },
            ],
          },
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
    ],
  },
  actions: [
    {
      key: "install",
      label: "安装模板",
      kind: "request",
      api: "/api/v1/template-market/{id}/install",
      visibleWhen: [{ field: "installed", operator: "ne", value: true }],
      confirm: {
        title: "确认安装模板？",
        description: "安装后该模板将添加到您的模板库中",
        confirmText: "确认安装",
        cancelText: "取消",
      },
      successMessage: "「{templateName}」已安装到您的模板库",
    },
    {
      key: "openInstalled",
      label: "打开模板",
      kind: "link",
      href: "/system/template-designer?templateId={installedTemplateId}&versionId={installedTemplateVersionId}",
      visibleWhen: [{ field: "installed", operator: "eq", value: true }],
    },
  ],
};
