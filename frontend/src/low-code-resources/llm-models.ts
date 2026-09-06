import type { ResourceMeta } from "@/low-code/schema/types";

export const llmModelsResource: ResourceMeta = {
  resource: "llm_models",
  label: "LLM 模型",
  idKey: "id",
  permissions: {
    page: "system:admin",
    list: "system:admin",
    show: "system:admin",
    create: "system:admin",
    edit: "system:admin",
    delete: "system:admin",
  },
  capabilities: {
    query: true,
    detail: true,
    create: true,
    edit: true,
    delete: true,
  },
  prepareValues: (values) => ({
    providerId: values.providerId == null || values.providerId === "" ? null : Number(values.providerId),
    modelCode: values.modelCode,
    modelName: values.modelName,
    modelType: values.modelType,
    contextWindow: values.contextWindow === "" || values.contextWindow == null ? null : Number(values.contextWindow),
    maxOutputTokens:
      values.maxOutputTokens === "" || values.maxOutputTokens == null ? null : Number(values.maxOutputTokens),
    costPer1kInputTokens:
      values.costPer1kInputTokens === "" || values.costPer1kInputTokens == null
        ? null
        : Number(values.costPer1kInputTokens),
    costPer1kOutputTokens:
      values.costPer1kOutputTokens === "" || values.costPer1kOutputTokens == null
        ? null
        : Number(values.costPer1kOutputTokens),
    status: values.status,
  }),
  api: {
    query: "/api/v1/admin/llm-providers/{providerId}/models",
    detail: "/api/v1/admin/llm-models/{id}",
    create: "/api/v1/admin/llm-models",
    update: "/api/v1/admin/llm-models/{id}",
    delete: "/api/v1/admin/llm-models/{id}",
  },
  table: {
    pagination: true,
    selectable: false,
    defaultSort: { field: "modelName", order: "asc" },
    columns: [
      { key: "modelCode", title: "模型编码", type: "text", sortable: true },
      { key: "modelName", title: "模型名称", type: "text", sortable: true },
      { key: "modelType", title: "模型类型", type: "text" },
      { key: "contextWindow", title: "上下文窗口", type: "number" },
      { key: "status", title: "状态", type: "text" },
      { key: "createdAt", title: "创建时间", type: "datetime", sortable: true },
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
        placeholder: "模型名称 / 编码",
      },
      {
        key: "modelType",
        label: "模型类型",
        component: "select",
        field: "modelType",
        operator: "eq",
        dict: "llm_model_type",
      },
      {
        key: "status",
        label: "状态",
        component: "select",
        field: "status",
        operator: "eq",
        dict: "provider_status",
      },
    ],
  },
  form: {
    width: "md",
    sections: [
      {
        key: "basic",
        title: "模型信息",
        fields: [
          {
            key: "providerId",
            label: "提供商 ID",
            component: "text",
            required: true,
            readonly: true,
            defaultValue: "",
          },
          { key: "modelCode", label: "模型编码", component: "text", required: true },
          { key: "modelName", label: "模型名称", component: "text", required: true },
          { key: "modelType", label: "模型类型", component: "select", dict: "llm_model_type", required: true },
          { key: "contextWindow", label: "上下文窗口", component: "number" },
          { key: "maxOutputTokens", label: "最大输出 Token", component: "number" },
          {
            key: "costPer1kInputTokens",
            label: "输入 Token 单价 / 1K",
            component: "number",
            placeholder: "如 0.001",
          },
          {
            key: "costPer1kOutputTokens",
            label: "输出 Token 单价 / 1K",
            component: "number",
            placeholder: "如 0.002",
          },
          { key: "status", label: "状态", component: "select", dict: "provider_status", required: true },
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
        title: "模型信息",
        fields: [
          { key: "id", label: "ID", type: "number" },
          { key: "providerId", label: "提供商 ID", type: "number" },
          { key: "modelCode", label: "模型编码", type: "text" },
          { key: "modelName", label: "模型名称", type: "text" },
          { key: "modelType", label: "模型类型", type: "text" },
          { key: "contextWindow", label: "上下文窗口", type: "number" },
          { key: "maxOutputTokens", label: "最大输出 Token", type: "number" },
          { key: "costPer1kInputTokens", label: "输入 Token 单价 / 1K", type: "number" },
          { key: "costPer1kOutputTokens", label: "输出 Token 单价 / 1K", type: "number" },
          { key: "status", label: "状态", type: "text" },
          { key: "createdAt", label: "创建时间", type: "datetime" },
        ],
      },
    ],
  },
  actions: [
    { key: "enable", label: "启用", kind: "request", api: "/api/v1/admin/llm-models/{id}/enable" },
    { key: "disable", label: "禁用", kind: "request", api: "/api/v1/admin/llm-models/{id}/disable" },
    { key: "delete", label: "删除", kind: "danger", confirm: { title: "确认删除该模型？" } },
  ],
};
