import type { ResourceMeta } from "@/low-code/schema/types";

function toNumber(value: unknown, fallback: number | null = null): number | null {
  if (value == null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDimensionItem(item: Record<string, unknown>): Record<string, unknown> {
  const dimensionType = String(item.dimensionType ?? "SCORE");
  const normalized: Record<string, unknown> = {
    dimensionCode: item.dimensionCode ?? "",
    dimensionName: item.dimensionName ?? "",
    dimensionType,
    weight: toNumber(item.weight, 1),
    sortNo: toNumber(item.sortNo, 0),
    status: item.status === false || item.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
  };
  if (dimensionType === "SCORE") {
    normalized.scoreMin = toNumber(item.scoreMin, 0);
    normalized.scoreMax = toNumber(item.scoreMax, 100);
    normalized.passThreshold = toNumber(item.passThreshold, 80);
    normalized.rejectThreshold = toNumber(item.rejectThreshold, 50);
  }
  const promptInstruction = String(item.promptInstruction ?? item.prompt_instruction ?? "").trim();
  if (promptInstruction) {
    normalized.promptInstruction = promptInstruction;
  }
  return normalized;
}

function normalizeDimensions(raw: unknown): Record<string, unknown>[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((item) =>
    normalizeDimensionItem(item && typeof item === "object" ? (item as Record<string, unknown>) : {}),
  );
}

function dimensionsForForm(raw: unknown): Record<string, unknown>[] {
  return normalizeDimensions(raw).map((item) => ({
    ...item,
    status: item.status === "ACTIVE",
  }));
}

export const dimensionPacksResource: ResourceMeta = {
  resource: "dimension_packs",
  label: "维度包管理",
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
    packCode: values.packCode,
    packName: values.packName,
    packDesc: values.packDesc || "",
    sceneCode: values.sceneCode,
    sortNo: values.sortNo == null || values.sortNo === "" ? 0 : Number(values.sortNo),
    dimensions: normalizeDimensions(values.dimensions),
  }),
  normalizeRecord: (record) => ({
    ...record,
    packDesc: record.packDesc ?? record.packDescription ?? "",
    sortNo: record.sortNo ?? record.sortOrder ?? 0,
    isSystemPack: record.isSystemPack ?? record.builtinFlag ?? 0,
    dimensions: dimensionsForForm(record.dimensions),
  }),
  api: {
    query: "/api/v1/admin/dimension-packs",
    detail: "/api/v1/admin/dimension-packs/{id}",
    create: "/api/v1/admin/dimension-packs",
    update: "/api/v1/admin/dimension-packs/{id}",
    delete: "/api/v1/admin/dimension-packs/{id}",
  },
  table: {
    pagination: true,
    selectable: false,
    defaultSort: { field: "createdAt", order: "desc" },
    columns: [
      { key: "packCode", title: "维度包编码", type: "text", sortable: true },
      { key: "packName", title: "维度包名称", type: "text", sortable: true },
      { key: "sceneCode", title: "场景编码", type: "text", sortable: true },
      { key: "status", title: "状态", type: "status", sortable: true, dict: "provider_status" },
      { key: "isSystemPack", title: "系统内置", type: "text", formatter: "boolean" },
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
        placeholder: "维度包名称 / 编码",
      },
      {
        key: "sceneCode",
        label: "场景编码",
        component: "text",
        field: "sceneCode",
        operator: "eq",
        placeholder: "请输入场景编码",
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
            key: "packCode",
            label: "维度包编码",
            component: "text",
            required: true,
            placeholder: "例如：QUALITY_REVIEW_V1",
            rules: [
              { type: "required", message: "请输入维度包编码" },
              { type: "maxLength", value: 64, message: "维度包编码不能超过 64 个字符" },
            ],
          },
          {
            key: "packName",
            label: "维度包名称",
            component: "text",
            required: true,
            placeholder: "例如：质量审核维度包",
            rules: [
              { type: "required", message: "请输入维度包名称" },
              { type: "maxLength", value: 128, message: "维度包名称不能超过 128 个字符" },
            ],
          },
          {
            key: "packDesc",
            label: "维度包描述",
            component: "textarea",
            required: false,
            placeholder: "请输入维度包描述",
            rules: [
              { type: "maxLength", value: 512, message: "维度包描述不能超过 512 个字符" },
            ],
          },
          {
            key: "sceneCode",
            label: "场景编码",
            component: "text",
            required: true,
            placeholder: "例如：LABELING_REVIEW",
            description: "用于标识该维度包适用的业务场景",
            rules: [
              { type: "required", message: "请输入场景编码" },
              { type: "maxLength", value: 64, message: "场景编码不能超过 64 个字符" },
            ],
          },
          {
            key: "sortNo",
            label: "排序",
            component: "number",
            required: false,
            defaultValue: 0,
            description: "数值越小越靠前",
          },
        ],
      },
      {
        key: "dimensions",
        title: "维度配置",
        description: "配置该维度包包含的审核维度项",
        fields: [
          {
            key: "dimensions",
            label: "维度列表",
            component: "array",
            itemLayout: "table",
            required: false,
            defaultValue: [],
            span: 24,
            description: "配置审核维度项，可新增、编辑或删除每一项",
            fields: [
              {
                key: "dimensionCode",
                label: "维度编码",
                component: "text",
                span: 12,
                required: true,
                placeholder: "例如：QUALITY_SCORE",
                rules: [
                  { type: "required", message: "请输入维度编码" },
                  { type: "maxLength", value: 64, message: "维度编码不能超过 64 个字符" },
                ],
              },
              {
                key: "dimensionName",
                label: "维度名称",
                component: "text",
                span: 12,
                required: true,
                placeholder: "例如：内容质量",
                rules: [
                  { type: "required", message: "请输入维度名称" },
                  { type: "maxLength", value: 128, message: "维度名称不能超过 128 个字符" },
                ],
              },
              {
                key: "dimensionType",
                label: "维度类型",
                component: "select",
                span: 12,
                defaultValue: "SCORE",
                dict: "dimension_type",
              },
              {
                key: "scoreMin",
                label: "最低分",
                component: "number",
                span: 12,
                defaultValue: 0,
                visibleWhen: [{ field: "dimensionType", operator: "eq", value: "SCORE" }],
              },
              {
                key: "scoreMax",
                label: "最高分",
                component: "number",
                span: 12,
                defaultValue: 100,
                visibleWhen: [{ field: "dimensionType", operator: "eq", value: "SCORE" }],
              },
              {
                key: "passThreshold",
                label: "通过阈值",
                component: "number",
                span: 12,
                defaultValue: 80,
                description: "该维度得分 ≥ 此值视为通过",
                visibleWhen: [{ field: "dimensionType", operator: "eq", value: "SCORE" }],
              },
              {
                key: "rejectThreshold",
                label: "驳回阈值",
                component: "number",
                span: 12,
                defaultValue: 50,
                description: "该维度得分 ≤ 此值直接打回重标",
                visibleWhen: [{ field: "dimensionType", operator: "eq", value: "SCORE" }],
              },
              {
                key: "promptInstruction",
                label: "审核提示词",
                component: "textarea",
                span: 24,
                placeholder: "例如：严格检查标注结果是否与题面要求一致，重点关注…",
                description: "给 AI 审核 Agent 的该维度专项说明，会注入模板 Prompt 的 {{dimension.xxx.prompt_instruction}} 插槽",
                rules: [
                  { type: "maxLength", value: 512, message: "审核提示词不能超过 512 个字符" },
                ],
              },
              {
                key: "weight",
                label: "权重",
                component: "number",
                span: 12,
                defaultValue: 1,
                description: "用于加权汇总，默认 1",
              },
              {
                key: "sortNo",
                label: "排序",
                component: "number",
                span: 12,
                defaultValue: 0,
              },
              {
                key: "status",
                label: "启用",
                component: "switch",
                span: 12,
                defaultValue: true,
              },
            ],
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
          { key: "packCode", label: "维度包编码", type: "text" },
          { key: "packName", label: "维度包名称", type: "text" },
          { key: "packDesc", label: "维度包描述", type: "text" },
          { key: "sceneCode", label: "场景编码", type: "text" },
          { key: "sortNo", label: "排序", type: "number" },
          { key: "isSystemPack", label: "系统内置", type: "text", formatter: "boolean" },
          { key: "status", label: "状态", type: "text" },
          { key: "createdAt", label: "创建时间", type: "datetime" },
          { key: "updatedAt", label: "更新时间", type: "datetime" },
        ],
      },
      {
        key: "dimensions",
        title: "维度配置",
        fields: [
          {
            key: "dimensions",
            label: "维度列表",
            type: "arrayTable",
            columns: [
              { key: "dimensionCode", label: "维度编码" },
              { key: "dimensionName", label: "维度名称" },
              { key: "dimensionType", label: "类型" },
              { key: "scoreMin", label: "最低分", type: "number" },
              { key: "scoreMax", label: "最高分", type: "number" },
              { key: "passThreshold", label: "通过阈值", type: "number" },
              { key: "rejectThreshold", label: "驳回阈值", type: "number" },
              { key: "weight", label: "权重", type: "number" },
              { key: "sortNo", label: "排序", type: "number" },
              { key: "status", label: "启用", formatter: "boolean" },
            ],
          },
        ],
      },
    ],
  },
  actions: [
    {
      key: "create",
      label: "新建维度包",
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
      visibleWhen: [{ field: "isSystemPack", operator: "ne", value: 1 }],
      confirm: {
        title: "确认删除维度包？",
        description: "删除后，使用该维度包的审核配置将无法正常工作。此操作不可恢复。",
        confirmText: "确认删除",
        cancelText: "取消",
      },
    },
  ],
};
