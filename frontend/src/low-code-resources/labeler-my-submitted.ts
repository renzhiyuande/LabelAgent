import type { ResourceMeta } from "@/low-code/schema/types";
import {
  labelerSubmissionAssignmentDetailSection,
  labelerSubmissionHistoryContentSection,
  labelerSubmissionHistoryInfoSection,
  labelerSubmissionHistoryTableColumns,
  labelerSubmissionLifecycleSection,
  labelerSubmissionPeopleDetailSection,
  labelerSubmissionSubmitHistorySection,
  labelerSubmissionTaskDetailSection,
  normalizeLabelerSubmissionRecord,
} from "./labeler-submission-display.shared";

export const labelerMySubmittedResource: ResourceMeta = {
  resource: "labelerMySubmitted",
  label: "已提交历史",
  idKey: "id",
  permissions: {
    page: ["business:labeler:workbench"],
  },
  capabilities: {
    query: false,
    detail: true,
    create: false,
    edit: false,
    delete: false,
  },
  normalizeRecord: (record) => {
    const normalized = normalizeLabelerSubmissionRecord(record as Record<string, unknown>);
    const status = String(normalized.status ?? "");
    return {
      ...normalized,
      canRevise:
        status === "NEEDS_REVISION"
        || status === "AI_REJECTED"
        || status === "APPEAL_APPROVED_SKIP_AI"
        || status === "APPEAL_APPROVED_SKIP_HUMAN",
    };
  },
  api: {
    query: "/api/v1/labeler/submissions/history",
    detail: "/api/v1/labeler/submissions/history/{id}",
    create: "/api/v1/labeler/submissions/history",
    update: "/api/v1/labeler/submissions/history/{id}",
  },
  table: {
    pagination: true,
    selectable: true,
    defaultSort: { field: "lastSubmittedAt", order: "desc" },
    columns: labelerSubmissionHistoryTableColumns,
    rowActionKeys: ["withdraw", "appeal", "revise"],
    bulkActions: [
      {
        key: "batchAppeal",
        label: "批量申诉",
        kind: "request",
        bulkApi: "/api/v1/labeler/submissions/appeals/batch",
        prompt: {
          title: "批量申诉",
          description: "为所选提交填写统一申诉理由。",
          fields: [
            {
              key: "reasonText",
              label: "申诉理由",
              component: "text",
              required: true,
              rules: [{ type: "maxLength", value: 1000, message: "申诉理由不能超过 1000 字符" }],
            },
          ],
        },
        confirm: {
          title: "确认批量申诉？",
          description: "系统会为当前勾选的提交异步发起申诉。",
        },
      },
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
        placeholder: "任务名称 / 编码 / 题目标识",
      },
    ],
  },
  form: { sections: [], actions: [] },
  detail: {
    width: "lg",
    layout: "tabs",
    sections: [
      labelerSubmissionHistoryInfoSection,
      labelerSubmissionHistoryContentSection,
      labelerSubmissionSubmitHistorySection,
      labelerSubmissionLifecycleSection,
      labelerSubmissionTaskDetailSection,
      labelerSubmissionAssignmentDetailSection,
      labelerSubmissionPeopleDetailSection,
    ],
  },
  actions: [
    {
      key: "withdraw",
      label: "撤回继续标注",
      kind: "request",
      api: "/api/v1/labeler/submissions/{id}/withdraw",
      visibleWhen: [{ field: "canWithdraw", operator: "eq", value: true }],
      confirm: {
        title: "确认撤回该提交？",
        description: "撤回后会回到可编辑草稿状态。",
      },
    },
    {
      key: "appeal",
      label: "提交申诉",
      kind: "request",
      api: "/api/v1/labeler/submissions/{id}/appeal",
      requestBody: { reasonText: "$record.reasonText" },
      visibleWhen: [{ field: "canAppeal", operator: "eq", value: true }],
      prompt: {
        title: "提交申诉",
        description: "请填写本次申诉的理由。",
        fields: [
          {
            key: "reasonText",
            label: "申诉理由",
            component: "text",
            required: true,
            rules: [{ type: "maxLength", value: 1000, message: "申诉理由不能超过 1000 字符" }],
          },
        ],
      },
    },
    {
      key: "revise",
      label: "查看/修改",
      kind: "link",
      href: "/labeler/work/{assignmentId}",
      visibleWhen: [{ field: "canRevise", operator: "eq", value: true }],
    },
  ],
};
