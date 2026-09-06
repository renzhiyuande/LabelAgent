import type { ResourceMeta } from "@/low-code/schema/types";
import {
  normalizeOwnerAppealRecord,
  ownerAppealDetailSections,
  ownerAppealTableColumns,
} from "./owner-appeal-display.shared";

export const ownerAppealsResource: ResourceMeta = {
  resource: "ownerAppeals",
  label: "申诉记录",
  idKey: "id",
  permissions: {
    page: ["system:admin", "business:task:read"],
  },
  capabilities: {
    query: false,
    detail: true,
    create: false,
    edit: false,
    delete: false,
  },
  normalizeRecord: (record) => normalizeOwnerAppealRecord(record as Record<string, unknown>),
  api: {
    query: "/api/v1/owner/appeals",
    detail: "/api/v1/owner/appeals/{id}",
    create: "/api/v1/owner/appeals",
    update: "/api/v1/owner/appeals/{id}",
  },
  table: {
    pagination: true,
    selectable: true,
    defaultSort: { field: "createdAt", order: "desc" },
    columns: ownerAppealTableColumns,
    bulkActions: [
      {
        key: "batchApprove",
        label: "批量通过",
        kind: "request",
        bulkApi: "/api/v1/owner/appeals/decision/batch",
        requestBody: { decision: "APPROVE" },
        prompt: {
          title: "批量通过申诉",
          description: "可选填写统一裁决说明。",
          fields: [
            {
              key: "decisionReasonText",
              label: "裁决说明",
              component: "textarea",
              rules: [{ type: "maxLength", value: 1000, message: "裁决说明不能超过 1000 字符" }],
            },
          ],
        },
      },
      {
        key: "batchReject",
        label: "批量驳回",
        kind: "request",
        bulkApi: "/api/v1/owner/appeals/decision/batch",
        requestBody: { decision: "REJECT" },
        prompt: {
          title: "批量驳回申诉",
          description: "建议填写驳回原因。",
          fields: [
            {
              key: "decisionReasonText",
              label: "裁决说明",
              component: "textarea",
              required: true,
              rules: [{ type: "maxLength", value: 1000, message: "裁决说明不能超过 1000 字符" }],
            },
          ],
        },
      },
    ],
  },
  filters: {
    fields: [
      { key: "keyword", label: "关键词", component: "text", field: "keyword", operator: "like" },
      { key: "status", label: "申诉状态", component: "text", field: "status", operator: "eq" },
    ],
  },
  form: { sections: [], actions: [] },
  detail: {
    width: "lg",
    layout: "tabs",
    sections: ownerAppealDetailSections,
  },
  actions: [
    {
      key: "approve",
      label: "通过申诉",
      kind: "request",
      api: "/api/v1/owner/appeals/{id}/decision",
      requestBody: { decision: "APPROVE", decisionReasonText: "$record.decisionReasonText" },
      visibleWhen: [{ field: "status", operator: "eq", value: "PENDING" }],
      prompt: {
        title: "通过申诉",
        description: "可选填写裁决说明。",
        fields: [
          {
            key: "decisionReasonText",
            label: "裁决说明",
            component: "text",
            rules: [{ type: "maxLength", value: 1000, message: "裁决说明不能超过 1000 字符" }],
          },
        ],
      },
    },
    {
      key: "reject",
      label: "驳回申诉",
      kind: "request",
      api: "/api/v1/owner/appeals/{id}/decision",
      requestBody: { decision: "REJECT", decisionReasonText: "$record.decisionReasonText" },
      visibleWhen: [{ field: "status", operator: "eq", value: "PENDING" }],
      prompt: {
        title: "驳回申诉",
        description: "请填写驳回原因。",
        fields: [
          {
            key: "decisionReasonText",
            label: "裁决说明",
            component: "text",
            required: true,
            rules: [{ type: "maxLength", value: 1000, message: "裁决说明不能超过 1000 字符" }],
          },
        ],
      },
    },
  ],
};
