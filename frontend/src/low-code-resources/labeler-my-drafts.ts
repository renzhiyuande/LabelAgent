import type { ResourceMeta } from "@/low-code/schema/types";
import {
  labelerSubmissionAssignmentDetailSection,
  labelerSubmissionDraftContentSection,
  labelerSubmissionDraftInfoSection,
  labelerSubmissionDraftTableColumns,
  labelerSubmissionPeopleDetailSection,
  labelerSubmissionTaskDetailSection,
  normalizeLabelerSubmissionRecord,
} from "./labeler-submission-display.shared";

export const labelerMyDraftsResource: ResourceMeta = {
  resource: "labelerMyDrafts",
  label: "我的草稿",
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
  normalizeRecord: (record) => normalizeLabelerSubmissionRecord(record as Record<string, unknown>),
  api: {
    query: "/api/v1/labeler/submissions/drafts",
    detail: "/api/v1/labeler/submissions/drafts/{id}",
    create: "/api/v1/labeler/submissions/drafts",
    update: "/api/v1/labeler/submissions/drafts/{id}",
    actions: {
      continue: "/api/v1/labeler/submissions/drafts/{id}",
    },
  },
  table: {
    pagination: true,
    selectable: false,
    defaultSort: { field: "draftSavedAt", order: "desc" },
    columns: labelerSubmissionDraftTableColumns,
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
      labelerSubmissionDraftInfoSection,
      labelerSubmissionDraftContentSection,
      labelerSubmissionTaskDetailSection,
      labelerSubmissionAssignmentDetailSection,
      labelerSubmissionPeopleDetailSection,
    ],
  },
  actions: [
    {
      key: "continue",
      label: "继续作答",
      kind: "link",
      href: "/labeler/work/{assignmentId}",
    },
  ],
};
