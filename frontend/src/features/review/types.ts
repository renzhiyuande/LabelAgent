import type { AiInsight } from "@/components/workbench/shared/AiInsightPanel";
import type { AuditTimelineEntry } from "@/components/workbench/shared/AuditTimeline";
import type { FormSchema } from "@/low-code/schema/types";
import type { ReviewerReviewRecordResponse } from "./api/reviewer-workbench-api";

export type AiQueueStatus = "pending" | "passed" | "returned" | "manual" | "failed";

export type ManualReviewStatus = "pending" | "approved" | "rejected" | "returned";

/** 人工审核池左侧队列聚合维度 */
export type AuditPoolGroupBy = "task" | "labeler" | "item";

export interface AuditPoolScopeItem {
  id: string;
  label: string;
  subtitle?: string;
}

/** 侧栏多选后，工作台队列按所选分组 ID 服务端分页加载 */
export interface AuditPoolQueueScope {
  type: AuditPoolGroupBy;
  items: AuditPoolScopeItem[];
}

/** @deprecated 使用 AuditPoolQueueScope */
export type AuditPoolScope = AuditPoolScopeItem & { type: AuditPoolGroupBy };

export function auditPoolGroupKey(groupBy: string, scopeId: number | string): string {
  return `${groupBy}:${scopeId}`;
}

export function formatAuditPoolQueueScopeLabel(scope: AuditPoolQueueScope): string {
  if (scope.items.length === 0) {
    return "未选择范围";
  }
  if (scope.items.length === 1) {
    return scope.items[0].label;
  }
  const typeLabel = scope.type === "task" ? "任务" : scope.type === "labeler" ? "标注员" : "题目";
  return `${scope.items[0].label} 等 ${scope.items.length} 个${typeLabel}`;
}

export interface AiQueueRow {
  id: string;
  submissionCode: string;
  title: string;
  submitter: string;
  submittedAt: string;
  status: AiQueueStatus;
  aiInsight: AiInsight;
  hasRealAiReview: boolean;
}

export interface AiQueueDetail extends AiQueueRow {
  payload: Record<string, unknown>;
  payloadSchema: FormSchema;
  annotateData: Record<string, unknown>;
  annotateSchema: FormSchema;
  promptTemplate: string;
  rawResponseText?: string;
  timeline: AuditTimelineEntry[];
  agentVersion: string;
  ruleName: string;
  hasRealAiReview: boolean;
}

export interface ReviewStageInfo {
  key: string;
  label: string;
  stageNo: number;
  totalStages: number;
  isFinal: boolean;
  nextLevelKey?: string | null;
  nextLevelLabel?: string | null;
}

export interface ManualReviewRow {
  id: string;
  submissionCode: string;
  title: string;
  labeler: string;
  labelerId: string;
  taskId: string;
  taskName: string;
  itemId: string;
  itemSeqNo: number;
  submittedAt: string;
  status: ManualReviewStatus;
  aiScore?: number;
  currentReviewLevel?: string;
  reviewStageLabel?: string;
}

export interface SubmissionFieldDiffEntry {
  field: string;
  changeType: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface ManualReviewDetail extends ManualReviewRow {
  payload: Record<string, unknown>;
  payloadSchema: FormSchema;
  annotateData: Record<string, unknown>;
  annotateSchema: FormSchema;
  aiInsight: AiInsight;
  hasRealAiReview: boolean;
  promptTemplate?: string;
  rawResponseText?: string;
  lastReviewComment?: string;
  previousSubmitData?: Record<string, unknown>;
  submitDataDiff: SubmissionFieldDiffEntry[];
  timeline: AuditTimelineEntry[];
  reviewRecords?: ReviewerReviewRecordResponse[];
  reviewHistoryComments?: Array<{ reviewer: string; comment: string; at: string }>;
  reviewStage?: ReviewStageInfo | null;
  nextReviewLevel?: string | null;
  isFinalReviewLevel?: boolean;
}

export const AI_QUEUE_STATUS_META: Record<
  AiQueueStatus,
  { label: string; badge: "default" | "secondary" | "success" | "warning" | "destructive" }
> = {
  pending: { label: "待审核", badge: "warning" },
  passed: { label: "已通过", badge: "success" },
  returned: { label: "已打回", badge: "destructive" },
  manual: { label: "转人工", badge: "secondary" },
  failed: { label: "失败", badge: "destructive" },
};

export const MANUAL_REVIEW_STATUS_META: Record<
  ManualReviewStatus,
  { label: string; badge: "default" | "secondary" | "success" | "warning" | "destructive" }
> = {
  pending: { label: "待审核", badge: "warning" },
  approved: { label: "已通过", badge: "success" },
  rejected: { label: "已驳回", badge: "destructive" },
  returned: { label: "已打回", badge: "destructive" },
};
