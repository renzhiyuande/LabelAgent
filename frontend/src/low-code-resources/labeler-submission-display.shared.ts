import { normalizeSnowflakeId } from "@/low-code/lib/id-utils";
import type { DetailSectionSchema, TableColumnSchema } from "@/low-code/schema/types";

export function normalizeLabelerSubmissionRecord(record: Record<string, unknown>) {
  return {
    ...record,
    id: normalizeSnowflakeId(record.id) ?? record.id,
    assignmentId: normalizeSnowflakeId(record.assignmentId) ?? record.assignmentId,
    taskId: normalizeSnowflakeId(record.taskId) ?? record.taskId,
    itemId: normalizeSnowflakeId(record.itemId) ?? record.itemId,
    labelerId: normalizeSnowflakeId(record.labelerId) ?? record.labelerId,
    ownerId: normalizeSnowflakeId(record.ownerId) ?? record.ownerId,
    reviewerId: normalizeSnowflakeId(record.reviewerId) ?? record.reviewerId,
    status: record.status ?? record.currentStatus,
  };
}

const coreTableColumns: TableColumnSchema[] = [
  {
    key: "taskTitle",
    title: "任务",
    type: "link",
    minWidth: 120,
    ellipsis: 1,
    link: {
      labelField: "taskTitle",
      action: "openRelated",
      resourceKey: "labelerMyTasks",
      idField: "taskId",
    },
  },
  {
    key: "sourceItemKey",
    title: "题目",
    type: "link",
    minWidth: 100,
    ellipsis: 1,
    link: {
      labelField: "sourceItemKey",
      action: "openRelated",
      resourceKey: "labelerTaskItems",
      idField: "assignmentId",
    },
  },
  { key: "itemSeqNo", title: "序号", type: "number", width: 64, minWidth: 56 },
  {
    key: "payloadPreview",
    title: "题目摘要",
    type: "text",
    formatter: "payloadPreview",
    width: 200,
    minWidth: 160,
    maxWidth: 280,
  },
  {
    key: "draftPreviewText",
    title: "标注摘要",
    type: "text",
    minWidth: 160,
    maxWidth: 320,
    ellipsis: 2,
  },
  {
    key: "ownerName",
    title: "任务 Owner",
    type: "user",
    user: { idField: "ownerId", nameField: "ownerName", role: "OWNER" },
  },
  { key: "assignmentStatus", title: "分配状态", type: "status", dict: "assignment_status", minWidth: 96 },
  { key: "assignmentAssignType", title: "分配类型", type: "text", dict: "assignment_type", minWidth: 88 },
  { key: "assignmentSlotNo", title: "槽位", type: "number", width: 56, minWidth: 48 },
  { key: "assignmentClaimedAt", title: "认领时间", type: "datetime", minWidth: 128 },
  { key: "assignmentDeadlineAt", title: "分配截止", type: "datetime", minWidth: 128 },
  {
    key: "labelerName",
    title: "标注员",
    type: "user",
    user: { idField: "labelerId", nameField: "labelerName", role: "LABELER" },
  },
  { key: "currentRoundNo", title: "轮次", type: "number", width: 56, minWidth: 48 },
  {
    key: "reviewerName",
    title: "最近审核人",
    type: "user",
    user: { idField: "reviewerId", nameField: "reviewerName", role: "REVIEWER" },
    visibleWhen: [{ field: "reviewerId", operator: "ne", value: null }],
  },
  { key: "createdAt", title: "创建时间", type: "datetime", minWidth: 128 },
];

export const labelerSubmissionDraftTableColumns: TableColumnSchema[] = [
  ...coreTableColumns.slice(0, 6),
  ...coreTableColumns.slice(6, 12),
  { key: "status", title: "草稿状态", type: "status", dict: "submission_status", minWidth: 96 },
  coreTableColumns[12],
  { key: "draftSavedAt", title: "草稿保存时间", type: "datetime", sortable: true, minWidth: 128 },
  ...coreTableColumns.slice(13),
];

export const labelerSubmissionHistoryTableColumns: TableColumnSchema[] = [
  ...coreTableColumns.slice(0, 6),
  ...coreTableColumns.slice(6, 12),
  { key: "status", title: "提交状态", type: "status", dict: "submission_status", minWidth: 120 },
  coreTableColumns[12],
  { key: "lastSubmittedAt", title: "提交时间", type: "datetime", sortable: true, minWidth: 128 },
  ...coreTableColumns.slice(13),
];

export const labelerSubmissionTaskDetailSection: DetailSectionSchema = {
  key: "task",
  title: "任务信息",
  fields: [
    { key: "taskTitle", label: "任务名称", type: "text" },
    { key: "taskCode", label: "任务编码", type: "text" },
    { key: "taskId", label: "任务ID", type: "text" },
    {
      key: "ownerName",
      label: "任务 Owner",
      type: "user",
      user: { idField: "ownerId", nameField: "ownerName", role: "OWNER" },
    },
  ],
};

export const labelerSubmissionAssignmentDetailSection: DetailSectionSchema = {
  key: "assignment",
  title: "分配信息",
  fields: [
    { key: "assignmentId", label: "分配ID", type: "text" },
    { key: "assignmentStatus", label: "分配状态", type: "status", dict: "assignment_status" },
    { key: "assignmentAssignType", label: "分配类型", type: "text", dict: "assignment_type" },
    { key: "assignmentSlotNo", label: "槽位", type: "number" },
    { key: "assignmentClaimedAt", label: "认领时间", type: "datetime" },
    { key: "assignmentDeadlineAt", label: "截止时间", type: "datetime" },
    { key: "sourceItemKey", label: "源数据标识", type: "text" },
    { key: "itemSeqNo", label: "题目序号", type: "number" },
    { key: "payloadPreview", label: "题目摘要", type: "json", formatter: "payloadPreview" },
  ],
};

export const labelerSubmissionPeopleDetailSection: DetailSectionSchema = {
  key: "people",
  title: "协作人",
  fields: [
    {
      key: "labelerName",
      label: "标注员",
      type: "user",
      user: { idField: "labelerId", nameField: "labelerName", role: "LABELER" },
    },
    {
      key: "reviewerName",
      label: "最近审核人",
      type: "user",
      user: { idField: "reviewerId", nameField: "reviewerName", role: "REVIEWER" },
    },
  ],
};

export const labelerSubmissionDraftInfoSection: DetailSectionSchema = {
  key: "draft",
  title: "草稿信息",
  fields: [
    { key: "id", label: "提交ID", type: "text" },
    { key: "status", label: "草稿状态", type: "status", dict: "submission_status" },
    { key: "currentRoundNo", label: "轮次", type: "number" },
    { key: "draftPreviewText", label: "标注摘要", type: "text" },
    { key: "draftSavedAt", label: "草稿保存时间", type: "datetime" },
    { key: "createdAt", label: "创建时间", type: "datetime" },
  ],
};

export const labelerSubmissionDraftContentSection: DetailSectionSchema = {
  key: "draftContent",
  title: "草稿内容",
  fields: [
    {
      key: "draftForm",
      label: "",
      type: "templateForm",
      templateForm: { role: "input", dataField: "draftData" },
    },
  ],
};

export const labelerSubmissionHistoryInfoSection: DetailSectionSchema = {
  key: "submission",
  title: "提交信息",
  fields: [
    { key: "id", label: "提交ID", type: "text" },
    { key: "status", label: "提交状态", type: "status", dict: "submission_status" },
    { key: "currentRoundNo", label: "轮次", type: "number" },
    { key: "submitCount", label: "提交次数", type: "number" },
    { key: "draftPreviewText", label: "标注摘要", type: "text" },
    { key: "lastSubmittedAt", label: "最近提交时间", type: "datetime" },
    { key: "draftSavedAt", label: "最近保存时间", type: "datetime" },
    { key: "createdAt", label: "创建时间", type: "datetime" },
  ],
};

export const labelerSubmissionHistoryContentSection: DetailSectionSchema = {
  key: "submitContent",
  title: "提交内容",
  fields: [
    {
      key: "submitForm",
      label: "",
      type: "templateForm",
      templateForm: { role: "input", dataField: "draftData" },
    },
  ],
};

export const labelerSubmissionSubmitHistorySection: DetailSectionSchema = {
  key: "submitHistory",
  title: "提交历史",
  fields: [{ key: "submitHistory", label: "", type: "timeline" }],
};

export const labelerSubmissionLifecycleSection: DetailSectionSchema = {
  key: "lifecycle",
  title: "生命周期",
  fields: [{ key: "lifecycleTimeline", label: "", type: "timeline" }],
};

export const labelerMyTaskProgressSection: DetailSectionSchema = {
  key: "progress",
  title: "任务进度",
  fields: [
    { key: "taskName", label: "任务名称", type: "text" },
    { key: "sceneCode", label: "场景", type: "text" },
    { key: "totalCount", label: "我领取数", type: "number" },
    { key: "openCount", label: "待作答", type: "number" },
    { key: "submittedCount", label: "待审核", type: "number" },
    { key: "submittedEverCount", label: "已提交", type: "number" },
    { key: "approvedCount", label: "已通过", type: "number" },
    { key: "rejectedCount", label: "已驳回", type: "number" },
    { key: "needsRevisionCount", label: "需修改", type: "number" },
    { key: "lastClaimedAt", label: "最近领取时间", type: "datetime" },
    { key: "lastActivityAt", label: "最近活动", type: "datetime" },
    { key: "deadlineAt", label: "任务截止", type: "datetime" },
  ],
};

export const labelerMyTaskInfoSection: DetailSectionSchema = {
  key: "task",
  title: "任务信息",
  fields: [
    { key: "taskName", label: "任务名称", type: "text" },
    { key: "taskCode", label: "任务编码", type: "text" },
    { key: "taskId", label: "任务ID", type: "text" },
    { key: "sceneCode", label: "场景", type: "text" },
    { key: "descriptionText", label: "任务说明", type: "text" },
    {
      key: "ownerName",
      label: "任务 Owner",
      type: "user",
      user: { idField: "ownerId", nameField: "ownerName", role: "OWNER" },
    },
    { key: "deadlineAt", label: "任务截止", type: "datetime" },
  ],
};

export const labelerMyTaskSubmitHistorySection: DetailSectionSchema = {
  key: "submitHistory",
  title: "提交历史",
  fields: [{ key: "recordSubmitHistories", label: "", type: "timelineGroup" }],
};

export const ownerTaskLifecycleSection: DetailSectionSchema = {
  key: "lifecycle",
  title: "任务生命周期",
  fields: [{ key: "lifecycleTimeline", label: "", type: "timeline" }],
};

export const assignmentLifecycleSection: DetailSectionSchema = {
  key: "lifecycle",
  title: "分配记录生命周期",
  fields: [{ key: "lifecycleTimeline", label: "", type: "timeline" }],
};
