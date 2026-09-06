import { normalizeSnowflakeId } from "@/low-code/lib/id-utils";
import type { ResourceMeta } from "@/low-code/schema/types";
import { ownerTaskLifecycleSection } from "./labeler-submission-display.shared";

export const tasksResource: ResourceMeta = {
  resource: "tasks",
  label: "标注任务",
  idKey: "id",
  permissions: {
    page: ["system:admin", "business:task:read"],
    create: ["system:admin", "business:task:create"],
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
  normalizeRecord: (record) => {
    const templateReady = record.templateReady === true || record.templateReady === 1;
    const publishReady = record.publishReady === true || record.publishReady === 1;
    const blockReason =
      record.publishBlockReason != null ? String(record.publishBlockReason).trim() : "";

    let readiness = "待模板";
    if (publishReady) {
      readiness = "可发布";
    } else if (templateReady) {
      readiness = blockReason ? `待检查 · ${blockReason}` : "待检查";
    } else if (blockReason) {
      readiness = blockReason;
    }

    const templateVersionId =
      normalizeSnowflakeId(record.templateVersionId) ??
      normalizeSnowflakeId(record.currentTemplateVersionId);

    return {
      ...record,
      id: normalizeSnowflakeId(record.id) ?? record.id,
      templateId: normalizeSnowflakeId(record.templateId) ?? record.templateId,
      currentTemplateVersionId:
        normalizeSnowflakeId(record.currentTemplateVersionId) ?? record.currentTemplateVersionId,
      templateVersionId,
      readiness,
      templateReady: templateReady ? "是" : "否",
      publishReady: publishReady ? "是" : "否",
      publishBlockReason: blockReason || "—",
    };
  },
  prepareValues: (values) => {
    const rawTemplateVersionId = values.templateVersionId;
    const templateVersionId =
      rawTemplateVersionId == null ||
      rawTemplateVersionId === "" ||
      rawTemplateVersionId === 0 ||
      rawTemplateVersionId === "0" ||
      String(rawTemplateVersionId).startsWith("tpl:")
        ? null
        : normalizeSnowflakeId(rawTemplateVersionId) ?? null;
    return {
      taskCode: values.taskCode,
      title: values.title,
      descriptionText: values.descriptionText || null,
      sceneCode: values.sceneCode,
      distributeStrategy: values.distributeStrategy || null,
      maxClaimPerUser: values.maxClaimPerUser ? Number(values.maxClaimPerUser) : 1,
      deadlineAt: values.deadlineAt || null,
      templateVersionId,
    };
  },
  api: {
    query: "/api/v1/owner/tasks",
    detail: "/api/v1/owner/tasks/{id}",
    create: "/api/v1/owner/tasks",
    update: "/api/v1/owner/tasks/{id}",
    delete: "/api/v1/owner/tasks/{id}",
    actions: {
      publish: "/api/v1/owner/tasks/{id}/publish",
    },
  },
  table: {
    pagination: true,
    selectable: false,
    defaultSort: { field: "updatedAt", order: "desc" },
    columns: [
      { key: "taskCode", title: "编码", type: "text", sortable: true },
      { key: "title", title: "任务名称", type: "text", sortable: true },
      { key: "status", title: "状态", type: "status", sortable: true, dict: "task_status" },
      { key: "quota", title: "数据量", type: "number", sortable: true },
      { key: "readiness", title: "发布就绪", type: "text" },
      { key: "deadlineAt", title: "截止时间", type: "datetime", sortable: true },
      { key: "updatedAt", title: "更新时间", type: "datetime", sortable: true },
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
        placeholder: "任务名称 / 描述",
      },
      {
        key: "status",
        label: "任务状态",
        component: "select",
        field: "status",
        operator: "eq",
        dict: "task_status",
      },
      {
        key: "taskCode",
        label: "任务编码",
        component: "text",
        field: "taskCode",
        operator: "like",
        placeholder: "精确搜索",
      },
      {
        key: "sceneCode",
        label: "标注场景",
        component: "text",
        field: "sceneCode",
        operator: "eq",
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
          { key: "taskCode", label: "任务编码", component: "text", required: true, rules: [{ type: "maxLength", value: 64, message: "任务编码不能超过 64 字符" }] },
          { key: "title", label: "任务名称", component: "text", required: true, rules: [{ type: "maxLength", value: 128, message: "任务名称不能超过 128 字符" }] },
          { key: "descriptionText", label: "任务描述", component: "textarea", rules: [{ type: "maxLength", value: 2048, message: "任务描述不能超过 2048 字符" }] },
          { key: "sceneCode", label: "标注场景", component: "text", required: true },
          {
            key: "templateVersionId",
            label: "标注模板版本",
            component: "remoteTreeSelect",
            remote: { source: "templateVersionTree", variant: "tree" },
            disabledIn: ["edit"],
            description:
              "可选，仅新建时可绑定。选择后将克隆模板到新任务；导入数据须符合模板字段要求。不选则首次导入时自动生成模板。",
          },
          {
            key: "distributeStrategy",
            label: "分发策略",
            component: "remoteSelect",
            required: true,
            defaultValue: "FIRST_COME",
            remote: { source: "distributeStrategies" },
            description: "支持后端 SPI 扩展，默认先到先得。",
          },
          { key: "maxClaimPerUser", label: "单人最大领取数量", component: "number", required: true },
          {
            key: "rewardRuleMode",
            label: "奖励规则",
            component: "remoteSelect",
            required: true,
            defaultValue: "PER_APPROVED",
            remote: { source: "rewardRules" },
            description: "选择任务采用的奖励结算规则。",
          },
          {
            key: "rewardRuleConfig",
            label: "规则配置",
            component: "remoteSchema",
            description: "根据所选奖励规则填写对应配置项。",
            remoteSchema: {
              api: "/api/v1/owner/remote-schemas/rewardRules/{rewardRuleMode}/form-schema",
              dependsOn: "rewardRuleMode",
              binding: {
                payloadField: "rewardRuleJson",
                discriminatorKey: "mode",
              },
            },
          },
          { key: "deadlineAt", label: "截止时间", component: "datetime" },
        ],
      },
      {
        key: "taskSettings",
        title: "任务设置",
        fields: [
          {
            key: "taskSettingsConfig",
            label: "任务设置",
            component: "remoteSchema",
            description: "由后端 schema 驱动，与详情展示字段保持一致。",
            remoteSchema: {
              api: "/api/v1/owner/remote-schemas/taskSettings/default/form-schema",
              binding: {
                payloadField: "settingsJson",
                stripSourceFields: false,
              },
            },
          },
        ],
      },
      {
        key: "reviewWorkflow",
        title: "人工审核",
        fields: [
          {
            key: "reviewWorkflowConfig",
            label: "人工审核流程",
            component: "remoteSchema",
            description: "配置初审/复审/终审等级与每级可用操作。",
            remoteSchema: {
              api: "/api/v1/owner/remote-schemas/reviewWorkflow/default/form-schema",
              binding: {
                payloadField: "reviewWorkflowJson",
                stripSourceFields: false,
              },
            },
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
    width: "lg",
    layout: "tabs",
    sections: [
      {
        key: "basic",
        title: "基础信息",
        fields: [
          { key: "taskCode", label: "任务编码", type: "text" },
          { key: "title", label: "任务名称", type: "text" },
          { key: "descriptionText", label: "任务描述", type: "text" },
          { key: "sceneCode", label: "标注场景", type: "text" },
          { key: "status", label: "任务状态", type: "text" },
          { key: "readiness", label: "发布就绪摘要", type: "text" },
          { key: "templateReady", label: "模板就绪", type: "text" },
          { key: "publishReady", label: "可发布", type: "text" },
          { key: "publishBlockReason", label: "发布阻塞原因", type: "text" },
          {
            key: "currentTemplateVersionId",
            label: "当前模板版本 ID",
            type: "link",
            link: {
              href: "/system/template-designer?templateId={templateId}&versionId={currentTemplateVersionId}",
            },
          },
          { key: "distributeStrategy", label: "分发策略", type: "text" },
          { key: "quota", label: "数据总量", type: "number" },
          { key: "maxClaimPerUser", label: "单人最大领取数量", type: "number" },
          { key: "rewardRuleJson", label: "奖励规则", type: "remoteSchema" },
          { key: "reviewWorkflowJson", label: "人工审核流程", type: "remoteSchema" },
          { key: "settingsJson", label: "任务设置", type: "remoteSchema" },
          { key: "deadlineAt", label: "截止时间", type: "datetime" },
          { key: "publishedAt", label: "发布时间", type: "datetime" },
          { key: "createdAt", label: "创建时间", type: "datetime" },
          { key: "updatedAt", label: "更新时间", type: "datetime" },
        ],
      },
      ownerTaskLifecycleSection,
    ],
  },
  actions: [
    { key: "create", label: "新建任务", kind: "drawer", permission: ["system:admin", "business:task:create"] },
    { key: "edit", label: "编辑任务", kind: "drawer", permission: ["system:admin", "business:task:update"], visibleWhen: [{ field: "status", operator: "eq", value: "DRAFT" }] },
    {
      key: "importItems",
      label: "导入标注数据",
      kind: "request",
      hiddenInList: true,
      permission: ["system:admin", "business:task:import"],
      // visibleWhen: [{ field: "status", operator: "eq", value: "DRAFT" }],
      sidePanel: {
        resourceKey: "taskItems",
        scope: {
          field: "taskId",
          from: "id",
        },
        width: "xl",
        hideFilters: ["taskId"],
        title: "{title} · 数据管理",
        description: "查看任务数据项并执行导入。",
      },
    },
    {
      key: "manageTemplates",
      label: "模板管理",
      kind: "workflow",
      hiddenInList: true,
      permission: ["system:admin", "business:task:read", "business:template:read"],
      workflow: {
        rendererCode: "task.manageTemplate",
        title: "{title} · 标注模板",
        description: "每个任务对应 1 个模板主表，在此查看模板信息、版本历史并打开设计器。",
        width: "md",
        placement: "right",
      },
    },
    {
      key: "editTemplate",
      label: "编辑模板",
      kind: "workflow",
      hiddenInList: true,
      permission: ["system:admin", "business:template:update"],
      workflow: {
        rendererCode: "task.openDesigner",
        title: "打开模板设计器",
        description: "进入当前任务关联模板的最新草稿或当前版本。",
        width: "sm",
        placement: "right",
      },
    },
    {
      key: "assignments",
      label: "任务分配管理",
      kind: "request",
      hiddenInList: true,
      permission: ["system:admin", "business:assignment:read"],
      sidePanel: {
        resourceKey: "taskAssignmentBoard",
        scope: {
          field: "taskId",
          from: "id",
        },
        width: "xl",
        hideFilters: ["taskId"],
        title: "{title} · 分配管理",
        description: "按题目查看指派状态；未指派的题目请使用「批量指派」分配给标注员。",
      },
    },
    {
      key: "manageReviewers",
      label: "审核员管理",
      kind: "request",
      hiddenInList: true,
      permission: ["system:admin", "business:task:update"],
      sidePanel: {
        resourceKey: "taskMembers",
        scope: {
          field: "taskId",
          from: "id",
        },
        width: "xl",
        hideFilters: ["taskId", "memberRole"],
        listFilters: [{ field: "memberRole", op: "eq", value: "REVIEWER" }],
        createDefaults: { memberRole: "REVIEWER" },
        hideFormFields: ["taskId", "memberRole"],
        title: "{title} · 审核员管理",
        description:
          "仅管理本任务的审核员成员。添加后对方才能在审核工作台看到该任务待审池。标注员请使用「任务分配管理」指派题目。",
      },
    },
    {
      key: "submissions",
      label: "提交记录管理",
      kind: "request",
      hiddenInList: true,
      permission: ["system:admin", "business:submission:read", "business:assignment:read"],
      sidePanel: {
        resourceKey: "submissions",
        scope: {
          field: "taskId",
          from: "id",
        },
        width: "xl",
        hideFilters: ["taskId"],
        title: "{title} · 提交记录",
        description: "查看任务下的草稿与提交记录。",
      },
    },
    {
      key: "appeals",
      label: "申诉记录",
      kind: "request",
      hiddenInList: true,
      permission: ["system:admin", "business:task:read"],
      sidePanel: {
        resourceKey: "ownerAppeals",
        scope: {
          field: "taskId",
          from: "id",
        },
        width: "xl",
        hideFilters: ["taskId"],
        title: "{title} · 申诉记录",
        description: "查看并裁决该任务下的申诉。",
      },
    },
    {
      key: "publish",
      label: "发布任务",
      kind: "workflow",
      permission: ["system:admin", "business:task:publish"],
      visibleWhen: [{ field: "status", operator: "eq", value: "DRAFT" }],
      workflow: {
        rendererCode: "task.publishPreparation",
        title: "发布任务",
        description: "先确认模板版本与发布状态，再执行任务发布。",
        width: "lg",
        placement: "right",
      },
    },
    {
      key: "pause",
      label: "暂停任务",
      kind: "request",
      permission: ["system:admin", "business:task:update"],
      visibleWhen: [{ field: "status", operator: "eq", value: "PUBLISHED" }],
      confirm: {
        title: "确认暂停任务？",
        description: "暂停后任务将停止继续领取，后续可恢复发布。",
      },
      api: "/api/v1/owner/tasks/{id}/pause",
    },
    {
      key: "resume",
      label: "恢复任务",
      kind: "request",
      permission: ["system:admin", "business:task:publish"],
      visibleWhen: [{ field: "status", operator: "eq", value: "PAUSED" }],
      confirm: {
        title: "确认恢复任务？",
        description: "恢复后任务会回到已发布状态。",
      },
      api: "/api/v1/owner/tasks/{id}/publish",
    },
    {
      key: "delete",
      label: "删除任务",
      kind: "danger",
      permission: ["system:admin", "business:task:update"],
      visibleWhen: [{ field: "status", operator: "in", value: ["DRAFT", "PAUSED"] }],
    },
  ],
};
