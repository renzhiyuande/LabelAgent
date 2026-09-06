import { buildUnavailableAiInsight } from "@/components/workbench/shared/AiInsightPanel";
import { createDisplayFormSchema } from "@/components/workbench/shared/schema-data/create-display-schema";
import { filterFormSchemaForReviewerDisplay } from "@/components/workbench/shared/schema-data/filter-reviewer-display-schema";
import { parseFormSchemaJson } from "@/low-code/utils/form-schema";
import type {
  ReviewerAiReviewSnapshotResponse,
  ReviewerQueueRowResponse,
  ReviewerSubmissionDetailResponse,
} from "../api/reviewer-workbench-api";
import { mapReviewerTimeline } from "./map-reviewer-timeline";
import type { AiInsight } from "@/components/workbench/shared/AiInsightPanel";
import type { AiQueueDetail, AiQueueRow, AiQueueStatus } from "../types";

function inferPayloadFieldComponent(value: unknown): "text" | "textarea" | "tags" | "number" {
  if (typeof value === "number") {
    return "number";
  }
  if (Array.isArray(value)) {
    return "tags";
  }
  if (typeof value === "string" && value.length > 120) {
    return "textarea";
  }
  return "text";
}

export function buildPayloadSchema(payload: Record<string, unknown>) {
  const fields = Object.keys(payload).map((key) => ({
    key,
    label: key,
    component: inferPayloadFieldComponent(payload[key]),
  }));
  if (fields.length === 0) {
    return createDisplayFormSchema("payload", "题目导入字段", [
      { key: "empty", label: "暂无数据", component: "text" },
    ]);
  }
  return createDisplayFormSchema("payload", "题目导入字段", fields);
}

function mapAiVerdictToInsightStatus(
  verdict?: string | null,
): AiInsight["status"] {
  switch ((verdict ?? "").toUpperCase()) {
    case "PASS":
      return "suggest_pass";
    case "REJECT":
      return "suggest_reject";
    default:
      return "manual_review";
  }
}

export function mapAiReviewToInsight(
  submissionId: string,
  _payload: Record<string, unknown>,
  aiReview?: ReviewerAiReviewSnapshotResponse | null,
): AiInsight {
  if (!aiReview || aiReview.totalScore == null) {
    return buildUnavailableAiInsight({
      analyzedAt: new Date().toISOString(),
      summary: "当前提交尚未产出可展示的 AI 预审评分。",
      modelName: "AI 结果待产出",
    });
  }
  const dimensions =
    aiReview.dimensions?.map((item) => ({
      key: item.dimensionKey,
      label: item.dimensionName,
      score: Math.round(item.score),
      maxScore: item.maxScore ?? 100,
      comment: item.comment?.trim() || undefined,
    })) ?? [];
  const scoreCalibrations =
    aiReview.scoreCalibrations?.map((item) => ({
      dimensionKey: item.dimensionKey,
      dimensionName: item.dimensionName,
      rawScore: item.rawScore,
      calibratedScore: item.calibratedScore,
      anchor: item.anchor,
      tolerance: item.tolerance,
    })) ?? [];
  return {
    status: mapAiVerdictToInsightStatus(aiReview.verdict),
    overallScore: Math.round(aiReview.totalScore),
    dimensions,
    summary: aiReview.summary ?? "",
    modelName: aiReview.modelId ?? "unknown",
    analyzedAt: aiReview.analyzedAt ?? new Date().toISOString(),
    ...(scoreCalibrations.length > 0 ? { scoreCalibrations } : {}),
  };
}

function normalizeQueueStatus(status: string): AiQueueStatus {
  if (status === "pending" || status === "passed" || status === "returned" || status === "manual" || status === "failed") {
    return status;
  }
  return "pending";
}

export function mapReviewerQueueRowToAiQueueRow(row: ReviewerQueueRowResponse): AiQueueRow {
  const id = String(row.submissionId);
  const hasRealAiReview = row.overallScore != null;
  const aiInsight = hasRealAiReview
    ? {
        status: mapAiVerdictToInsightStatus(row.aiVerdict),
        overallScore: Math.round(row.overallScore ?? 0),
        dimensions: [],
        summary: row.aiVerdict ? `AI 预审结论：${row.aiVerdict}` : "AI 预审已完成。",
        modelName: "AI 预审已完成",
        analyzedAt: row.submittedAt,
      }
    : buildUnavailableAiInsight({
        analyzedAt: row.submittedAt,
        summary:
          row.queueStatus === "failed"
            ? "AI 预审执行失败，请在右侧明细中重试。"
            : "AI 预审结果尚未生成，当前仅展示队列基础信息。",
      });

  return {
    id,
    submissionCode: row.submissionCode,
    title: row.title,
    submitter: row.labelerName,
    submittedAt: row.submittedAt,
    status: normalizeQueueStatus(row.queueStatus),
    aiInsight,
    hasRealAiReview,
  };
}

export function mapReviewerDetailToAiQueueDetail(
  detail: ReviewerSubmissionDetailResponse,
  row?: AiQueueRow | null,
): AiQueueDetail {
  const id = String(detail.submissionId);
  const itemPayload = detail.itemPayload ?? {};
  const submitData = detail.submitData ?? {};
  const annotateSchema = detail.templateSchemaJson
    ? filterFormSchemaForReviewerDisplay(parseFormSchemaJson(detail.templateSchemaJson))
    : createDisplayFormSchema("annotate", "标注结果", []);
  const aiReview = detail.aiReview;
  const aiInsight = mapAiReviewToInsight(id, { ...itemPayload, ...submitData }, aiReview);
  const hasRealAiReview = aiReview?.totalScore != null;

  return {
    id,
    submissionCode: detail.submissionCode,
    title: detail.title,
    submitter: detail.labelerName,
    submittedAt: detail.submittedAt,
    status: normalizeQueueStatus(detail.queueStatus),
    aiInsight: hasRealAiReview ? aiInsight : row?.aiInsight ?? aiInsight,
    payload: itemPayload,
    payloadSchema: buildPayloadSchema(itemPayload),
    annotateData: submitData,
    annotateSchema,
    promptTemplate: aiReview?.promptTemplate ?? "",
    rawResponseText: aiReview?.rawResponseText ?? undefined,
    timeline: mapReviewerTimeline(detail.timeline),
    agentVersion: aiReview?.modelId ? `Agent · ${aiReview.modelId}` : "Agent",
    ruleName: detail.taskName,
    hasRealAiReview,
  };
}
