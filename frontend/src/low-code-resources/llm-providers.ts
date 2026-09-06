import type { ResourceMeta } from "@/low-code/schema/types";
import { asJsonObject } from "@/low-code-resources/json-field";

export const llmProvidersResource: ResourceMeta = {
  resource: "llm_providers",
  label: "LLM 提供商",
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
    providerName: values.providerName,
    providerCode: values.providerCode,
    baseUrl: values.baseUrl,
    apiKey: values.apiKey,
    configJson: asJsonObject(values.configJson),
  }),
  api: {
    query: "/api/v1/admin/llm-providers",
    detail: "/api/v1/admin/llm-providers/{id}",
    create: "/api/v1/admin/llm-providers",
    update: "/api/v1/admin/llm-providers/{id}",
    delete: "/api/v1/admin/llm-providers/{id}",
  },
  table: {
    pagination: true,
    selectable: false,
    defaultSort: { field: "createdAt", order: "desc" },
    columns: [
      { key: "providerCode", title: "提供商编码", type: "text", sortable: true },
      { key: "providerName", title: "提供商名称", type: "text", sortable: true },
      { key: "baseUrl", title: "API 端点", type: "text" },
      {
        key: "status",
        title: "启用",
        type: "switch",
        slotMeta: {
          checkedValue: "ACTIVE",
          uncheckedValue: "INACTIVE",
        },
      },
      { key: "isSystemProvider", title: "系统内置", type: "text", formatter: "boolean" },
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
        placeholder: "提供商名称 / 编码",
      },
      {
        key: "providerCode",
        label: "提供商类型",
        component: "select",
        field: "providerCode",
        operator: "eq",
        dict: "llm_provider_code",
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
    width: "lg",
    sections: [
      {
        key: "basic",
        title: "基础信息",
        fields: [
          {
            key: "providerName",
            label: "提供商名称",
            component: "text",
            required: true,
            placeholder: "例如：OpenAI GPT-4",
            rules: [
              { type: "required", message: "请输入提供商名称" },
              { type: "maxLength", value: 128, message: "提供商名称不能超过 128 个字符" },
            ],
          },
          {
            key: "providerCode",
            label: "提供商类型",
            component: "select",
            required: true,
            placeholder: "请选择提供商类型",
            dict: "llm_provider_code",
            rules: [{ type: "required", message: "请选择提供商类型" }],
          },
          {
            key: "baseUrl",
            label: "API 端点",
            component: "text",
            required: true,
            placeholder: "例如：https://api.openai.com/v1",
            description: "LLM 服务的 API 基础地址",
            rules: [
              { type: "required", message: "请输入 API 端点" },
              { type: "maxLength", value: 512, message: "API 端点不能超过 512 个字符" },
            ],
          },
          {
            key: "apiKey",
            label: "API 密钥",
            component: "text",
            inputType: "password",
            required: true,
            placeholder: "请输入 API 密钥",
            description: "用于身份验证的密钥，将加密存储；编辑时留空表示不修改已保存的密钥",
            rules: [
              { type: "required", message: "请输入 API 密钥" },
              { type: "maxLength", value: 512, message: "API 密钥不能超过 512 个字符" },
            ],
          },
        ],
      },
      {
        key: "config",
        title: "提供商配置",
        description: "根据不同提供商类型配置特定参数",
        fields: [
          {
            key: "configJson",
            label: "配置参数",
            component: "jsonEditor",
            required: false,
            placeholder: "请输入 JSON 格式的配置参数",
            description: "提供商特定的配置参数，如模型列表、默认参数等",
            defaultValue: {},
          },
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
        title: "基础信息",
        fields: [
          { key: "id", label: "ID", type: "number" },
          { key: "providerCode", label: "提供商编码", type: "text" },
          { key: "providerName", label: "提供商名称", type: "text" },
          { key: "baseUrl", label: "API 端点", type: "text" },
          { key: "maskedApiKey", label: "API 密钥", type: "text" },
          { key: "isSystemProvider", label: "系统内置", type: "text", formatter: "boolean" },
          { key: "status", label: "状态", type: "text" },
          { key: "createdAt", label: "创建时间", type: "datetime" },
          { key: "updatedAt", label: "更新时间", type: "datetime" },
        ],
      },
      {
        key: "config",
        title: "配置信息",
        fields: [
          { key: "configJson", label: "配置参数", type: "text", formatter: "json" },
        ],
      },
    ],
  },
  actions: [
    {
      key: "create",
      label: "新建提供商",
      kind: "drawer",
      permission: "system:admin",
    },
    {
      key: "edit",
      label: "编辑",
      kind: "drawer",
      permission: "system:admin",
    },
    {
      key: "enable",
      label: "启用",
      kind: "request",
      permission: "system:admin",
      visibleWhen: [{ field: "status", operator: "ne", value: "ACTIVE" }],
    },
    {
      key: "disable",
      label: "禁用",
      kind: "danger",
      permission: "system:admin",
      visibleWhen: [{ field: "status", operator: "eq", value: "ACTIVE" }],
    },
    {
      key: "delete",
      label: "删除",
      kind: "danger",
      permission: "system:admin",
      visibleWhen: [{ field: "isSystemProvider", operator: "ne", value: 1 }],
      confirm: {
        title: "确认删除提供商？",
        description: "删除后，使用该提供商的模板将无法正常工作。此操作不可恢复。",
        confirmText: "确认删除",
        cancelText: "取消",
      },
    },
  ],
};
