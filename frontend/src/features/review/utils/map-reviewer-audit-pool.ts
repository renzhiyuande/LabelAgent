import { createDisplayFormSchema } from "@/components/workbench/shared/schema-data/create-display-schema";
import { filterFormSchemaForReviewerDisplay } from "@/components/workbench/shared/schema-data/filter-reviewer-display-schema";
import { parseFormSchemaJson } from "@/low-code/utils/form-schema";
import type { ReviewerQueueRowResponse, ReviewerSubmissionDetailResponse } from "../api/reviewer-workbench-api";
import type { ManualReviewDetail, ManualReviewRow, ManualReviewStatus } from "../types";
import { buildPayloadSchema, mapAiReviewToInsight } from "./map-reviewer-ai-queue";
import { mapReviewStageFromDetail } from "./review-stage";
import {
  buildHistoryCommentsFromReviewRecords,
  mergeReviewerTimelines,
} from "./map-reviewer-review-records";
import type { ReviewerReviewRecordResponse } from "../api/reviewer-workbench-api";

function mapAuditPoolStatus(queueStatus: string, submissionStatus: string): ManualReviewStatus {
  const raw = (queueStatus || submissionStatus || "").toLowerCase();
  if (raw.includes("approve") || raw.includes("pass")) {
    return "approved";
  }
  if (raw.includes("reject")) {
    return "rejected";
  }
  if (raw.includes("return") || raw.includes("revision")) {
    return "returned";
  }
  return "pending";
}

export function mapReviewerQueueRowToManualReviewRow(row: ReviewerQueueRowResponse): ManualReviewRow {
  return {
    id: String(row.submissionId),
    submissionCode: row.submissionCode,
    title: row.title,
    labeler: row.labelerName,
    labelerId: String(row.labelerId ?? ""),
    taskId: String(row.taskId ?? ""),
    taskName: row.taskName ?? "未命名任务",
    itemId: String(row.itemId ?? ""),
    itemSeqNo: row.itemSeqNo ?? 0,
    submittedAt: row.submittedAt,
    status: mapAuditPoolStatus(row.queueStatus, row.submissionStatus),
    aiScore: row.overallScore ?? undefined,
    currentReviewLevel: row.currentReviewLevel ?? undefined,
    reviewStageLabel: row.reviewStageLabel ?? undefined,
  };
}

export function mapReviewerDetailToManualReviewDetail(
  detail: ReviewerSubmissionDetailResponse,
  row?: ManualReviewRow | null,
  reviewRecords?: ReviewerReviewRecordResponse[],
): ManualReviewDetail {
  const id = String(detail.submissionId);
  const itemPayload = detail.itemPayload ?? {};
  const submitData = detail.submitData ?? {};
  const annotateSchema = detail.templateSchemaJson
    ? filterFormSchemaForReviewerDisplay(parseFormSchemaJson(detail.templateSchemaJson))
    : createDisplayFormSchema("annotate", "标注结果", []);
  const hasRealAiReview = detail.aiReview?.totalScore != null;

  return {
    id,
    submissionCode: detail.submissionCode,
    title: detail.title,
    labeler: detail.labelerName,
    labelerId: row?.labelerId ?? "",
    taskId: String(detail.taskId ?? row?.taskId ?? ""),
    taskName: detail.taskName ?? row?.taskName ?? "未命名任务",
    itemId: String(detail.itemId ?? row?.itemId ?? ""),
    itemSeqNo: detail.itemSeqNo ?? row?.itemSeqNo ?? 0,
    submittedAt: detail.submittedAt,
    status: mapAuditPoolStatus(detail.queueStatus, detail.submissionStatus),
    aiScore: detail.aiReview?.totalScore ?? row?.aiScore,
    payload: itemPayload,
    payloadSchema: buildPayloadSchema(itemPayload),
    annotateData: submitData,
    annotateSchema,
    aiInsight: mapAiReviewToInsight(id, { ...itemPayload, ...submitData }, detail.aiReview),
    hasRealAiReview,
    promptTemplate: detail.aiReview?.promptTemplate ?? undefined,
    rawResponseText: detail.aiReview?.rawResponseText ?? undefined,
    lastReviewComment: detail.lastReviewComment ?? undefined,
    previousSubmitData: detail.previousSubmitData ?? undefined,
    submitDataDiff: detail.submitDataDiff ?? [],
    timeline: mergeReviewerTimelines(detail.timeline, reviewRecords),
    reviewRecords: reviewRecords ?? [],
    reviewHistoryComments: reviewRecords?.length
      ? buildHistoryCommentsFromReviewRecords(reviewRecords)
      : [],
    reviewStage: mapReviewStageFromDetail(detail),
    nextReviewLevel: detail.nextReviewLevel ?? null,
    isFinalReviewLevel: detail.isFinalReviewLevel ?? false,
  };
}
