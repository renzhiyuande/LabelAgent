import type { ResourceMeta } from "@/low-code/schema/types";

export const dictTypesResource: ResourceMeta = {
  resource: "dictTypes",
  label: "字典类型",
  idKey: "id",
  permissions: {
    page: "system:admin",
    create: "system:dict:write",
    edit: "system:dict:write",
  },
  capabilities: {
    query: true,
    detail: true,
    create: true,
    edit: true,
    delete: true,
  },
  prepareValues: (values) => ({
    dictCode: values.dictCode,
    dictName: values.dictName,
    remark: values.remark || null,
  }),
  api: {
    query: "/api/v1/admin/dict-types",
    detail: "/api/v1/admin/dict-types/{id}",
    create: "/api/v1/admin/dict-types",
    update: "/api/v1/admin/dict-types/{id}",
    delete: "/api/v1/admin/dict-types/{id}",
  },
  table: {
    pagination: true,
    columns: [
      { key: "dictCode", title: "字典编码", type: "text" },
      { key: "dictName", title: "字典名称", type: "text" },
      { key: "status", title: "状态", type: "status", dict: "common_status" },
      { key: "remark", title: "备注", type: "text" },
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
        placeholder: "字典编码",
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
    sections: [
      {
        key: "basic",
        title: "字典类型信息",
        fields: [
          {
            key: "dictCode",
            label: "字典编码",
            component: "text",
            required: true,
            rules: [{ type: "pattern", value: "^[A-Z_][A-Z0-9_]*$", message: "字典编码只允许大写字母、数字和下划线，且需以字母或下划线开头" }],
          },
          {
            key: "dictName",
            label: "字典名称",
            component: "text",
            required: true,
            rules: [{ type: "maxLength", value: 30, message: "字典名称不能超过 30 个字符" }],
          },
          {
            key: "remark",
            label: "备注",
            component: "textarea",
            rules: [{ type: "maxLength", value: 100, message: "备注不能超过 100 个字符" }],
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
          { key: "dictCode", label: "字典编码", type: "text" },
          { key: "dictName", label: "字典名称", type: "text" },
          { key: "status", label: "状态", type: "status", dict: "common_status" },
          { key: "remark", label: "备注", type: "text" },
        ],
      },
    ],
  },
  actions: [
    { key: "create", label: "新建", kind: "drawer", permission: "system:admin" },
    { key: "enable", label: "启用", kind: "request", permission: "system:admin", visibleWhen: [{ field: "status", operator: "ne", value: "ACTIVE" }] },
    { key: "disable", label: "禁用", kind: "danger", permission: "system:admin", visibleWhen: [{ field: "status", operator: "eq", value: "ACTIVE" }] },
    {
      key: "delete",
      label: "删除",
      kind: "danger",
      permission: "system:admin",
      confirm: {
        title: "确认删除字典类型？",
        description: "删除后，该字典类型及其下所有字典项都会被一并删除。",
      },
    },
  ],
};
