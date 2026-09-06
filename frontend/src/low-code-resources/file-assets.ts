import type { ResourceMeta } from "@/low-code/schema/types";

const CATEGORY_OPTIONS = [
  { label: "全部", value: "" },
  { label: "表单附件", value: "form" },
  { label: "模板素材", value: "asset" },
  { label: "导出结果", value: "export" },
];

export const fileAssetsResource: ResourceMeta = {
  resource: "fileAssets",
  label: "素材库",
  idKey: "id",
  permissions: {
    // page: ["system:admin", "system:file:read"],
    // list: ["system:admin", "system:file:read"],
    // show: ["system:admin", "system:file:read"],
    // delete: ["system:admin", "system:file:delete"],
  },
  capabilities: {
    query: true,
    detail: true,
    create: false,
    edit: false,
    delete: true,
  },
  api: {
    query: "/api/v1/files",
    detail: "/api/v1/files/{id}",
    delete: "/api/v1/files/{id}",
  },
  table: {
    pagination: true,
    selectable: false,
    defaultSort: { field: "uploadedAt", order: "desc" },
    columns: [
      {
        key: "preview",
        title: "预览",
        type: "image",
        slot: "image",
        width: 72,
        slotMeta: { fileIdField: "id", mimeTypeField: "mimeType", altField: "originalName" },
      },
      { key: "originalName", title: "文件名", type: "text", sortable: true },
      { key: "mimeType", title: "类型", type: "text" },
      {
        key: "sizeBytes",
        title: "大小",
        type: "text",
        formatter: "bytes",
      },
      { key: "categoryCode", title: "分类", type: "text" },
      {
        key: "isPublic",
        title: "公开",
        type: "text",
        formatter: "boolean",
      },
      { key: "uploadedAt", title: "上传时间", type: "datetime", sortable: true },
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
        placeholder: "文件名",
      },
      {
        key: "categoryCode",
        label: "分类",
        component: "select",
        field: "categoryCode",
        operator: "eq",
        options: CATEGORY_OPTIONS,
      },
      {
        key: "mimeTypePrefix",
        label: "MIME 前缀",
        component: "text",
        field: "mimeTypePrefix",
        operator: "eq",
        placeholder: "例如 image/",
      },
      {
        key: "uploadedBy",
        label: "上传人",
        component: "remoteSelect",
        field: "uploadedBy",
        operator: "eq",
        remote: { source: "users" },
      },
      {
        key: "status",
        label: "状态",
        component: "select",
        field: "status",
        operator: "eq",
        dict: "common_status",
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
        title: "文件详情",
        fields: [
          { key: "id", label: "ID", type: "number" },
          { key: "originalName", label: "文件名", type: "text" },
          { key: "mimeType", label: "MIME 类型", type: "text" },
          { key: "sizeBytes", label: "大小", type: "text", formatter: "bytes" },
          { key: "categoryCode", label: "分类", type: "text" },
          { key: "isPublic", label: "公开", type: "text", formatter: "boolean" },
          { key: "uploadedBy", label: "上传人 ID", type: "number" },
          { key: "uploadedAt", label: "上传时间", type: "datetime" },
          { key: "downloadUrl", label: "下载路径", type: "text" },
        ],
      },
    ],
  },
  actions: [
    {
      key: "delete",
      label: "删除",
      kind: "danger",
      permission: ["system:admin", "system:file:delete"],
      confirm: {
        title: "确认删除素材？",
        description: "删除后引用该文件的展示可能失效，此操作不可恢复。",
        confirmText: "确认删除",
        cancelText: "取消",
      },
    },
  ],
  headerActions: [
    {
      key: "upload",
      label: "上传素材",
      kind: "request",
      actionCode: "fileAssets.upload",
      permission: ["system:admin", "system:file:upload"],
    },
  ],
};
