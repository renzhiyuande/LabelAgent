import type { ResourceMeta } from "@/low-code/schema/types";

export const dictItemsResource: ResourceMeta = {
  resource: "dictItems",
  label: "字典项",
  idKey: "id",
  permissions: {
    page: "system:admin",
  },
  capabilities: {
    query: true,
    detail: true,
    create: true,
    edit: true,
    delete: true,
  },
  prepareValues: (values) => ({
    dictTypeId: values.dictTypeId == null || values.dictTypeId === "" ? null : String(values.dictTypeId),
    itemCode: values.itemCode,
    itemLabel: values.itemLabel,
    itemValue: values.itemValue,
    sortNo: values.sortNo === "" || values.sortNo == null ? 0 : Number(values.sortNo),
    isDefault: Boolean(values.isDefault),
    className: values.className || null,
    tone: values.tone || null,
  }),
  api: {
    query: "/api/v1/admin/dict-types/{dictTypeId}/items",
    detail: "/api/v1/admin/dict-items/{id}",
    create: "/api/v1/admin/dict-items",
    update: "/api/v1/admin/dict-items/{id}",
    delete: "/api/v1/admin/dict-items/{id}",
  },
  table: {
    pagination: true,
    columns: [
      { key: "itemCode", title: "字典项编码", type: "text" },
      { key: "itemLabel", title: "字典项名称", type: "text" },
      { key: "itemValue", title: "字典项值", type: "text" },
      { key: "sortNo", title: "排序", type: "number" },
      { key: "isDefault", title: "默认项", type: "text", formatter: "boolean" },
      { key: "status", title: "状态", type: "status", dict: "common_status" },
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
        placeholder: "字典项编码 / 名称",
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
        title: "字典项信息",
        fields: [
          {
            key: "dictTypeId",
            label: "字典类型 ID",
            component: "text",
            required: true,
            readonly: true,
            defaultValue: "",
          },
          {
            key: "itemCode",
            label: "字典项编码",
            component: "text",
            required: true,
            rules: [{ type: "pattern", value: "^[A-Z_][A-Z0-9_]*$", message: "字典项编码只允许大写字母、数字和下划线，且需以字母或下划线开头" }],
          },
          {
            key: "itemLabel",
            label: "字典项名称",
            component: "text",
            required: true,
            rules: [{ type: "maxLength", value: 30, message: "字典项名称不能超过 30 个字符" }],
          },
          {
            key: "itemValue",
            label: "字典项值",
            component: "text",
            required: true,
            rules: [{ type: "maxLength", value: 60, message: "字典项值不能超过 60 个字符" }],
          },
          {
            key: "sortNo",
            label: "排序",
            component: "number",
            defaultValue: 0,
          },
          {
            key: "isDefault",
            label: "是否默认",
            component: "switch",
            defaultValue: false,
          },
          {
            key: "tone",
            label: "标签色调",
            component: "dictTagTone",
            description: "用于列表、详情中的标签展示色调",
          },
          {
            key: "className",
            label: "样式类名",
            component: "dictTagClassName",
            description: "可选手写 CSS 类名；留空时自动使用 lh-tag {色调}",
          },
          {
            key: "_tagPreview",
            label: "标签预览",
            component: "dictTagPreview",
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
          { key: "dictTypeId", label: "字典类型 ID", type: "text" },
          { key: "itemCode", label: "字典项编码", type: "text" },
          { key: "itemLabel", label: "字典项名称", type: "text" },
          { key: "itemValue", label: "字典项值", type: "text" },
          { key: "sortNo", label: "排序", type: "text" },
          { key: "isDefault", label: "默认项", type: "text", formatter: "boolean" },
          { key: "tone", label: "标签色调", type: "text" },
          { key: "className", label: "样式类名", type: "text" },
          { key: "_tagPreview", label: "标签效果", type: "dictTagPreview" },
          { key: "status", label: "状态", type: "status", dict: "common_status" },
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
        title: "确认删除字典项？",
        description: "删除后，该字典项将不再出现在当前字典类型中。",
      },
    },
  ],
};
