import type { ResourceMeta } from "@/low-code/schema/types";


export const templateVersionsResource: ResourceMeta = {
  resource: "templateVersions",
  label: "模板版本",
  idKey: "id",
  permissions: {
    page: ["system:admin", "business:template:read","business:template:manage"],
    create: ["system:admin", "business:template:create","business:template:manage"],
    edit: ["system:admin", "business:template:update","business:template:manage"],
  },
  capabilities: {
    query: true,
    detail: true,
    create: true,
    edit: true,
  },
  normalizeRecord: (record) => ({
    ...record,
    isCurrent: record.isCurrent === 1 || record.isCurrent === true,
    status: record.status != null ? String(record.status) : undefined,
    marketAuditStatus: record.marketAuditStatus != null ? String(record.marketAuditStatus) : undefined,
  }),
  prepareValues: (values) => ({
    templateId: values.templateId,
    versionNo: values.versionNo,
    descriptionText: values.descriptionText || null,
    schemaJson: values.schemaJson || null,
  }),
  api: {
    query: "/api/v1/owner/template-versions",
    detail: "/api/v1/owner/template-versions/{id}",
    create: "/api/v1/owner/template-versions",
    update: "/api/v1/owner/template-versions/{id}",
    actions: {
      publish: "/api/v1/owner/template-versions/{id}/publish",
      rollback: "/api/v1/owner/template-versions/{id}/activate",
      publishToMarket: "/api/v1/owner/template-versions/{id}/publish-to-market",
    },
  },
  table: {
    pagination: true,
    selectable: false,
    defaultSort: { field: "createdAt", order: "desc" },
    columns: [
      { key: "versionNo", title: "版本号", type: "text", sortable: true },
      {
        key: "isCurrent",
        title: "当前",
        type: "status",
        enum: [
          { value: true, label: "当前", tone: "success" },
          { value: 1, label: "当前", tone: "success" },
          { value: false, label: "—", tone: "muted" },
          { value: 0, label: "—", tone: "muted" },
        ],
      },
      { key: "descriptionText", title: "版本说明", type: "text" },
      { key: "status", title: "状态", type: "status", sortable: true, dict: "template_version_status" },
      { key: "marketAuditStatus", title: "模板市场状态", type: "status", dict: "template_market_status" },
      { key: "authorName", title: "创建人", type: "user", user: { idField: "authorId", nameField: "authorName", role: "OWNER" } },
      { key: "publishedAt", title: "发布时间", type: "datetime", sortable: true },
      { key: "createdAt", title: "创建时间", type: "datetime", sortable: true },
    ],
  },
  filters: {
    fields: [
      {
        key: "templateId",
        label: "模板",
        component: "remoteSelect",
        field: "templateId",
        operator: "eq",
        remote: { source: "templates" },
      },
      {
        key: "status",
        label: "状态",
        component: "select",
        field: "status",
        operator: "eq",
        dict: "template_version_status",
      },
    ],
  },
  form: {
    width: "lg",
    sections: [
      {
        key: "basic",
        title: "版本信息",
        fields: [
          { key: "versionNo", label: "版本号", component: "text", required: true },
          { key: "descriptionText", label: "版本说明", component: "textarea", rules: [{ type: "maxLength", value: 512, message: "版本说明不能超过 512 字符" }] },
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
        title: "版本信息",
        fields: [
          { key: "versionNo", label: "版本号", type: "text" },
          { key: "descriptionText", label: "版本说明", type: "text" },
          { key: "status", label: "状态", type: "text" },
          { key: "marketAuditStatus", label: "模板市场状态", type: "text" },
          { key: "authorName", label: "创建人", type: "user", user: { idField: "authorId", nameField: "authorName", role: "OWNER" } },
          { key: "publishedAt", label: "发布时间", type: "datetime" },
          { key: "createdAt", label: "创建时间", type: "datetime" },
        ],
      },
    ],
  },
  actions: [
    {
      key: "openDesigner",
      label: "查看版本",
      kind: "link",
      href: "/system/template-designer?templateId={templateId}&versionId={id}",
      permission: ["system:admin", "business:template:manage","business:template:read"],
    },
    {
      key: "edit",
      label: "编辑版本",
      kind: "link",
      href: "/system/template-designer?templateId={templateId}&versionId={id}",
      permission: ["system:admin", "business:template:manage","business:template:update"],
      visibleWhen: [{ field: "status", operator: "eq", value: "DRAFT" }],
    },
    { key: "publish", label: "发布版本", kind: "request", permission: ["system:admin", "business:template:manage","business:template:update"], visibleWhen: [{ field: "status", operator: "eq", value: "DRAFT" }] },
    {
      key: "publishToMarket",
      label: "发布到模板市场",
      kind: "request",
      permission: ["system:admin", "business:template:manage", "template:market:publish"],
      visibleWhen: [{ field: "status", operator: "eq", value: "PUBLISHED" },{field: "marketAuditStatus", operator: "ne", value: "PENDING" },{field: "marketAuditStatus", operator: "ne", value: "APPROVED"  }],
      requestBody: {
        description: "$record.description",
      },
      prompt: {
        title: "发布到模板市场",
        description: "填写模板市场展示描述，提交后进入待审核状态。",
        confirmLabel: "提交发布",
        fields: [
          {
            key: "description",
            label: "发布描述",
            component: "text",
            required: true,
            placeholder: "请输入模板市场展示描述",
          },
        ],
      },
      // confirm: {
      //   title: "确认提交到模板市场？",
      //   description: "提交后模板将进入市场审核流程。",
      //   confirmText: "确认提交",
      //   cancelText: "取消",
      // },
    },
    { key: "rollback", label: "回滚到此版本", kind: "request", permission: ["system:admin", "business:template:manage","business:template:update"], visibleWhen: [{ field: "status", operator: "eq", value: "PUBLISHED" }] },
  ],
};

export const templateFieldsResource: ResourceMeta = {
  resource: "templateFields",
  label: "模板字段",
  idKey: "id",
  permissions: {
    page: ["system:admin", "business:template:read"],
  },
  capabilities: {
    query: true,
    detail: true,
  },
  api: {
    query: "/api/v1/owner/template-fields",
    detail: "/api/v1/owner/template-fields/{id}",
    create: "/api/v1/owner/template-fields",
    update: "/api/v1/owner/template-fields/{id}",
  },
  table: {
    pagination: true,
    columns: [
      { key: "fieldKey", title: "字段标识", type: "text" },
      { key: "fieldLabel", title: "字段名称", type: "text" },
      { key: "componentType", title: "组件类型", type: "text" },
      { key: "required", title: "是否必填", type: "text" },
      { key: "sortOrder", title: "排序", type: "number" },
    ],
  },
  filters: {
    fields: [
      {
        key: "templateVersionId",
        label: "模板版本ID",
        component: "text",
        field: "templateVersionId",
        operator: "eq",
      },
    ],
  },
  form: {
    sections: [],
    actions: [],
  },
  detail: {
    sections: [],
  },
  actions: [],
};

export const templateLayoutsResource: ResourceMeta = {
  resource: "templateLayouts",
  label: "模板布局",
  idKey: "id",
  permissions: {
    page: ["system:admin", "business:template:read"],
  },
  capabilities: {
    query: true,
    detail: true,
  },
  api: {
    query: "/api/v1/owner/template-layouts",
    detail: "/api/v1/owner/template-layouts/{id}",
    create: "/api/v1/owner/template-layouts",
    update: "/api/v1/owner/template-layouts/{id}",
  },
  table: {
    pagination: true,
    columns: [
      { key: "sectionKey", title: "区块标识", type: "text" },
      { key: "sectionTitle", title: "区块标题", type: "text" },
      { key: "sortOrder", title: "排序", type: "number" },
    ],
  },
  filters: {
    fields: [
      {
        key: "templateVersionId",
        label: "模板版本ID",
        component: "text",
        field: "templateVersionId",
        operator: "eq",
      },
    ],
  },
  form: {
    sections: [],
    actions: [],
  },
  detail: {
    sections: [],
  },
  actions: [],
};
