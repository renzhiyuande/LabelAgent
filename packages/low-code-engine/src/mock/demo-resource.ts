import type { ResourceMeta } from "../schema/types";

const statusOptions = [
  { label: "待处理", value: "PENDING" },
  { label: "进行中", value: "IN_PROGRESS" },
  { label: "已完成", value: "DONE" },
  { label: "已归档", value: "ARCHIVED" },
];

const priorityOptions = [
  { label: "P0", value: "P0" },
  { label: "P1", value: "P1" },
  { label: "P2", value: "P2" },
];

const sceneOptions = [
  { label: "审核工作台", value: "review" },
  { label: "数据接入", value: "ingest" },
  { label: "运营管理", value: "ops" },
];

const channelOptions = [
  { label: "邮件", value: "email" },
  { label: "飞书", value: "feishu" },
  { label: "Slack", value: "slack" },
];

const auditRuleOptions = [
  { label: "命中规则自动通过", value: "auto-pass" },
  { label: "高风险强制复审", value: "manual-review" },
  { label: "异常样本回流", value: "fallback-loop" },
];

export const demoOrdersResource: ResourceMeta = {
  resource: "demoOrders",
  label: "动态表单样例",
  idKey: "id",
  permissions: {
    page: "system:admin",
  },
  prepareValues: (values) => ({
    ...values,
    amount: Number(values.amount ?? 0),
    tags: Array.isArray(values.tags) ? values.tags : [],
    ownerIds: Array.isArray(values.ownerIds) ? values.ownerIds.map((item) => Number(item)) : [],
  }),
  api: {
    query: "/mock/demo-orders",
    detail: "/mock/demo-orders/{id}",
    create: "/mock/demo-orders",
    update: "/mock/demo-orders/{id}",
    actions: {
      approve: "/mock/demo-orders/{id}/approve",
      archive: "/mock/demo-orders/{id}/archive",
    },
    options: {
      owners: "/mock/options/owners",
      provinces: "/mock/options/provinces",
      cities: "/mock/options/cities",
      districts: "/mock/options/districts",
      reviewers: "/mock/options/reviewers",
    },
  },
  table: {
    pagination: true,
    selectable: true,
    defaultSort: { field: "updatedAt", order: "desc" },
    columns: [
      { key: "title", title: "标题", type: "text", sortable: true },
      { key: "status", title: "状态", type: "status", sortable: true },
      { key: "scene", title: "场景", type: "text", sortable: true },
      { key: "priority", title: "优先级", type: "text", sortable: true },
      { key: "ownerNames", title: "负责人", type: "tags" },
      { key: "tags", title: "标签", type: "tags" },
      { key: "updatedAt", title: "更新时间", type: "datetime", sortable: true },
    ],
  },
  filters: {
    primary: ["keyword", "status", "scene", "tags", "updatedAtRange", "priorityWindow"],
    fields: [
      {
        key: "keyword",
        label: "关键词",
        component: "text",
        field: "keyword",
        operator: "like",
        placeholder: "标题 / 说明",
      },
      {
        key: "status",
        label: "状态",
        component: "select",
        field: "status",
        operator: "eq",
        options: statusOptions,
      },
      {
        key: "scene",
        label: "场景",
        component: "select",
        field: "scene",
        operator: "eq",
        options: sceneOptions,
      },
      {
        key: "tags",
        label: "标签",
        component: "multiSelect",
        field: "tags",
        operator: "in",
        options: [
          { label: "自动化", value: "自动化" },
          { label: "审核", value: "审核" },
          { label: "数据接入", value: "数据接入" },
          { label: "体验优化", value: "体验优化" },
          { label: "级联", value: "级联" },
        ],
      },
      {
        key: "updatedAtRange",
        label: "更新时间",
        component: "dateTimeRange",
        field: "updatedAt",
        operator: "between",
      },
      {
        key: "priorityWindow",
        label: "优先级范围",
        component: "numberRange",
        field: "priorityRank",
        operator: "between",
      },
    ],
  },
  form: {
    width: "lg",
    title: "这个动态表单演示覆盖嵌套对象、级联选项、数组项、tags、多选、远程选项、显隐和禁用联动。",
    sections: [
      {
        key: "basic",
        title: "基础字段",
        description: "先看最常见的输入、枚举、tags、多选和状态切换。",
        fields: [
          {
            key: "title",
            label: "表单标题",
            component: "text",
            required: true,
            span: 24,
            rules: [
              { type: "minLength", value: 4, message: "表单标题至少 4 个字符" },
              { type: "maxLength", value: 30, message: "表单标题不能超过 30 个字符" },
            ],
          },
          { key: "scene", label: "业务场景", component: "select", required: true, span: 12, defaultValue: "review", options: sceneOptions },
          { key: "priority", label: "优先级", component: "select", required: true, span: 12, defaultValue: "P1", options: priorityOptions },
          { key: "status", label: "状态", component: "select", required: true, span: 12, defaultValue: "PENDING", options: statusOptions },
          { key: "enabled", label: "启用状态", component: "switch", span: 12, defaultValue: true },
          { key: "notifyChannel", label: "通知渠道", component: "radioGroup", span: 12, defaultValue: "feishu", options: channelOptions },
          { key: "auditRules", label: "审核规则", component: "checkboxGroup", span: 12, defaultValue: ["manual-review"], options: auditRuleOptions },
          { key: "tags", label: "标签", component: "tags", span: 24, options: [{ label: "自动化", value: "自动化" }, { label: "审核", value: "审核" }, { label: "数据接入", value: "数据接入" }, { label: "体验优化", value: "体验优化" }, { label: "级联", value: "级联" }] },
          {
            key: "description",
            label: "说明",
            component: "textarea",
            span: 24,
            placeholder: "填写这套表单要验证的能力点",
            rules: [{ type: "maxLength", value: 200, message: "说明不能超过 200 个字符" }],
          },
        ],
      },
      {
        key: "cascade",
        title: "级联与联动",
        description: "省市区级联、场景切换联动、显隐和禁用都在这一组验证。",
        fields: [
          { key: "province", label: "省份", component: "remoteSelect", span: 12, remote: { source: "provinces" }, defaultValue: "zhejiang" },
          { key: "city", label: "城市", component: "remoteSelect", span: 12, remote: { source: "cities", params: { keyword: { from: "province" } } }, defaultValue: "hangzhou" },
          { key: "district", label: "区域", component: "remoteSelect", span: 12, remote: { source: "districts", params: { keyword: { from: "city" } } }, defaultValue: "xihu" },
          {
            key: "reviewMode",
            label: "审核模式",
            component: "select",
            span: 12,
            dependsOn: "scene",
            optionMap: {
              review: [{ label: "人工优先", value: "manual" }, { label: "规则辅助", value: "hybrid" }],
              ingest: [{ label: "增量同步", value: "incremental" }, { label: "全量覆盖", value: "full" }],
              ops: [{ label: "标准运营", value: "standard" }, { label: "紧急处理", value: "urgent" }],
            },
            defaultValue: "manual",
          },
          {
            key: "reviewers",
            label: "审核人",
            component: "remoteSelect",
            span: 24,
            remote: { source: "reviewers", params: { keyword: { from: "scene" } } },
            visibleWhen: [{ field: "scene", operator: "eq", value: "review" }],
            description: "当场景切到审核工作台时显示。",
          },
          {
            key: "opsUrgency",
            label: "紧急等级",
            component: "select",
            span: 24,
            options: [{ label: "普通", value: "normal" }, { label: "高", value: "high" }, { label: "阻塞", value: "critical" }],
            visibleWhen: [{ field: "scene", operator: "eq", value: "ops" }],
          },
          {
            key: "approvalNote",
            label: "审批备注",
            component: "textarea",
            span: 24,
            disabledWhen: [{ field: "enabled", operator: "eq", value: false }],
            description: "当启用状态关闭时，这个字段会进入 disabled。",
          },
          {
            key: "livePreview",
            label: "动态显示说明",
            component: "text",
            span: 24,
            visibleWhen: [{ field: "scene", operator: "eq", value: "review" }],
            description: "只有在审核工作台场景下才显示，用来验证 visibleWhen。",
          },
          {
            key: "opsOnlyBudget",
            label: "运营预算锁定",
            component: "number",
            span: 24,
            disabledWhen: [{ field: "scene", operator: "ne", value: "ops" }],
            description: "只有切到运营管理场景才可编辑，用来验证 disabledWhen。",
          },
        ],
      },
      {
        key: "nested",
        title: "嵌套对象",
        description: "用 path 写入对象路径，验证 details/config 这样的结构。",
        fields: [
          { key: "ownerName", path: "contact.owner.name", label: "负责人姓名", component: "text", span: 12, defaultValue: "林岚" },
          {
            key: "ownerEmail",
            path: "contact.owner.email",
            label: "负责人邮箱",
            component: "text",
            span: 12,
            defaultValue: "linlan@labelhub.dev",
            rules: [{ type: "email", message: "请输入正确的邮箱格式" }],
          },
          { key: "slackChannel", path: "contact.channel.slack", label: "Slack 频道", component: "text", span: 12, defaultValue: "#ops-review" },
          { key: "feishuGroup", path: "contact.channel.feishu", label: "飞书群", component: "text", span: 12, defaultValue: "审核自动化项目组" },
          {
            key: "configJson",
            path: "settings.runtime.configJson",
            label: "运行配置 JSON",
            component: "jsonEditor",
            span: 24,
            defaultValue: "{\"autoApprove\": false, \"threshold\": 0.82}",
            rules: [{ type: "pattern", value: "^[\\s\\S]*\\}$", message: "运行配置 JSON 需要是完整 JSON 文本" }],
          },
          { key: "script", path: "settings.runtime.script", label: "处理脚本", component: "codeEditor", span: 24, defaultValue: "return payload.items.filter((item) => item.score > 0.8);" },
        ],
      },
      {
        key: "array",
        title: "数组解析",
        description: "这一段验证数组项的增删、嵌套路径和每项内部联动。",
        fields: [
          {
            key: "steps",
            label: "处理步骤",
            component: "array",
            span: 24,
            fields: [
              {
                key: "stepName",
                path: "name",
                label: "步骤名",
                component: "text",
                span: 12,
                defaultValue: "步骤",
                rules: [{ type: "minLength", value: 2, message: "步骤名至少 2 个字符" }],
              },
              { key: "stepType", path: "type", label: "步骤类型", component: "select", span: 12, defaultValue: "manual", options: [{ label: "人工", value: "manual" }, { label: "自动", value: "auto" }, { label: "回调", value: "webhook" }] },
              { key: "executor", path: "executor", label: "执行人", component: "remoteSelect", span: 12, remote: { source: "owners" } },
              { key: "stepEnabled", path: "enabled", label: "启用", component: "switch", span: 12, defaultValue: true },
              { key: "stepNote", path: "note", label: "步骤说明", component: "textarea", span: 24, visibleWhen: [{ field: "type", operator: "ne", value: "webhook" }] },
              {
                key: "callbackUrl",
                path: "callbackUrl",
                label: "回调地址",
                component: "text",
                span: 24,
                visibleWhen: [{ field: "type", operator: "eq", value: "webhook" }],
                rules: [{ type: "pattern", value: "^https?://", message: "回调地址需要以 http:// 或 https:// 开头" }],
              },
            ],
          },
        ],
      },
    ],
    actions: [
      { key: "cancel", label: "取消", kind: "secondary" },
      { key: "submit", label: "保存动态表单", kind: "submit" },
    ],
  },
  detail: {
    width: "lg",
    sections: [
      {
        key: "overview",
        title: "详情概览",
        fields: [
          { key: "title", label: "标题", type: "text" },
          { key: "scene", label: "场景", type: "text" },
          { key: "status", label: "状态", type: "text" },
          { key: "priority", label: "优先级", type: "text" },
          { key: "ownerNames", label: "负责人", type: "tags" },
          { key: "tags", label: "标签", type: "tags" },
          { key: "districtLabel", label: "级联地址", type: "text" },
          { key: "reviewMode", label: "审核模式", type: "text" },
          { key: "reviewers", label: "审核人", type: "tags" },
          { key: "notifyChannel", label: "通知渠道", type: "text" },
          { key: "auditRules", label: "审核规则", type: "tags" },
          { key: "updatedAt", label: "更新时间", type: "datetime" },
          { key: "contactOwner", path: "contact.owner.name", label: "负责人姓名", type: "text" },
          { key: "contactEmail", path: "contact.owner.email", label: "负责人邮箱", type: "text" },
          { key: "runtimeConfig", path: "settings.runtime.configJson", label: "运行配置", type: "json" },
          { key: "steps", label: "步骤数组", type: "json" },
        ],
      },
    ],
  },
  actions: [
    { key: "create", label: "新建", kind: "drawer", permission: "system:admin" },
    { key: "approve", label: "通过", kind: "request", permission: "system:admin", visibleWhen: [{ field: "status", operator: "ne", value: "DONE" }] },
    { key: "archive", label: "归档", kind: "danger", permission: "system:admin", visibleWhen: [{ field: "status", operator: "ne", value: "ARCHIVED" }] },
  ],
  headerActions: [
    { key: "create", label: "添加样例", kind: "drawer", permission: "system:admin" },
    { key: "export", label: "导出", kind: "button", permission: "system:admin", actionCode: "exportDemo" },
  ],
};
