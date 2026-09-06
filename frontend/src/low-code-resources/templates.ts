import type { ResourceMeta } from "@/low-code/schema/types";

export const templatesResource: ResourceMeta = {
  resource: "templates",
  label: "模板主表",
  idKey: "id",
  permissions: {
    page: ["system:admin", "business:task:read", "business:template:read"],
    create: ["system:admin", "business:task:create", "business:template:create"],
    edit: ["system:admin", "business:task:update"],
    delete: ["system:admin", "business:task:update"],
  },
  capabilities: {
    query: true,
    detail: true,
    create: true,
    edit: true,
    delete: true,
  },
  normalizeRecord: (record) => ({
    ...record,
  }),
  prepareValues: (values) => ({
    taskId: values.taskId ? values.taskId : null,
    templateCode: values.templateCode,
    templateName: values.templateName,
    sceneCode: values.sceneCode,
    descriptionText: values.descriptionText || null,
  }),
  api: {
    query: "/api/v1/owner/tasks/{taskId}/templates",
    detail: "/api/v1/owner/templates/{id}",
    create: "/api/v1/owner/templates",
    update: "/api/v1/owner/templates/{id}",
    delete: "/api/v1/owner/templates/{id}",
    actions: {
      viewVersionHistory: "/api/v1/owner/templates/{id}/versions",
    },
  },
  table: {
    pagination: true,
    selectable: false,
    defaultSort: { field: "createdAt", order: "desc" },
    columns: [
      { key: "templateCode", title: "模板编码", type: "text", sortable: true },
      { key: "templateName", title: "模板名称", type: "text", sortable: true },
      { key: "sceneCode", title: "标注场景", type: "text" },
      {
        key: "latestVersionNo",
        title: "最新版本号",
        type: "text",
        sortable: true,
        formatter: "versionNo",
      },
      {
        key: "status",
        title: "状态",
        type: "status",
        sortable: true,
        enum: [
          { value: "DRAFT", label: "草稿", tone: "neutral" },
          { value: "ACTIVE", label: "可用", tone: "success" },
          { value: "PUBLISHED", label: "已发布", tone: "success" },
        ],
      },
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
        placeholder: "模板名称 / 编码",
      },
      {
        key: "sceneCode",
        label: "标注场景",
        component: "text",
        field: "sceneCode",
        operator: "eq",
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
    createButtonLabel: "新建模板",
    width: "lg",
    sections: [
      {
        key: "basic",
        title: "基础信息",
        fields: [
          { key: "templateCode", label: "模板编码", component: "text", required: true, rules: [{ type: "maxLength", value: 64, message: "模板编码不能超过 64 字符" }] },
          { key: "templateName", label: "模板名称", component: "text", required: true, rules: [{ type: "maxLength", value: 128, message: "模板名称不能超过 128 字符" }] },
          { key: "sceneCode", label: "标注场景", component: "text", required: true },
          { key: "descriptionText", label: "模板描述", component: "textarea", rules: [{ type: "maxLength", value: 2048, message: "模板描述不能超过 2048 字符" }] },
          {
            key: "taskId",
            label: "关联任务（可选）",
            component: "remoteSelect",
            remote: { source: "tasks" },
            description: "不选择则作为独立通用模板",
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
          { key: "taskId", label: "关联任务ID", type: "text" },
          { key: "templateCode", label: "模板编码", type: "text" },
          { key: "templateName", label: "模板名称", type: "text" },
          { key: "sceneCode", label: "标注场景", type: "text" },
          { key: "descriptionText", label: "模板描述", type: "text" },
          { key: "currentTemplateVersionId", label: "当前版本ID", type: "number" },
          { key: "latestVersionNo", label: "最新版本号", type: "number" },
          { key: "status", label: "状态", type: "text" },
          { key: "createdAt", label: "创建时间", type: "datetime" },
        ],
      },
    ],
  },
  headerActions: [
    { key: "create", label: "新建模板", kind: "drawer", permission: ["system:admin", "business:task:create", "business:template:create"] },
  ],
  actions: [
    { key: "create", label: "新建模板", kind: "drawer", permission: ["system:admin", "business:task:create", "business:template:create"] },
    { key: "edit", label: "编辑模板", kind: "drawer", permission: ["system:admin", "business:task:update"] },
    {
      key: "openDesigner",
      label: "打开设计器",
      kind: "link",
      href: "/system/template-designer?templateId={id}&versionId={currentTemplateVersionId}",
      permission: ["system:admin", "business:template:manage", "business:template:update"],
    },
    {
      key: "viewVersionHistory",
      label: "模板版本管理",
      kind: "request",
      permission: ["system:admin", "business:task:read", "business:template:manage"],
      sidePanel: {
        resourceKey: "templateVersions",
        scope: {
          field: "templateId",
          from: "id",
        },
        width: "xl",
        hideFilters: ["templateId"],
        title: "{templateName} · 版本历史",
        description: "管理当前模板下的版本，支持发布与回滚。",
      },
    },
    {
      key: "delete",
      label: "删除模板",
      kind: "danger",
      permission: ["system:admin", "business:template:manage"],
      confirm: {
        title: "确认删除模板",
        description: "删除后数据不可恢复，请确认",
        confirmText: "确认删除",
        cancelText: "取消",
      }
    }
  ],
};
