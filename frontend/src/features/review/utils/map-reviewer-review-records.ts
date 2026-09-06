import type { AuditTimelineEntry } from "@/components/workbench/shared/AuditTimeline";
import { formatFieldValue } from "@/low-code/utils/formatters";
import type {
  ReviewerReviewRecordResponse,
  ReviewerTimelineEntryResponse,
} from "../api/reviewer-workbench-api";
import { mapReviewerTimeline } from "./map-reviewer-timeline";

export const REVIEW_ACTION_LABELS: Record<string, string> = {
  APPROVE: "通过",
  REJECT: "驳回",
  RETURN: "打回修改",
  AI_PASS: "AI 通过",
  AI_REJECT: "AI 驳回",
  AI_MANUAL: "转人工",
  ENTER_HUMAN: "进入人工审核",
};

export function formatReviewActionLabel(action?: string | null): string {
  if (!action) {
    return "审核";
  }
  return REVIEW_ACTION_LABELS[action.toUpperCase()] ?? action;
}

function reviewActionTone(action: string): AuditTimelineEntry["tone"] {
  const normalized = action.toUpperCase();
  if (normalized === "APPROVE" || normalized === "AI_PASS") {
    return "success";
  }
  if (normalized === "REJECT" || normalized === "AI_REJECT") {
    return "destructive";
  }
  if (normalized === "RETURN") {
    return "warning";
  }
  return "default";
}

function parseInstant(value: string | undefined): number {
  if (!value) {
    return 0;
  }
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

export function mapReviewRecordToTimelineEntry(record: ReviewerReviewRecordResponse): AuditTimelineEntry {
  const actionLabel = formatReviewActionLabel(record.action);
  const levelLabel = record.reviewLevelLabel || record.reviewLevel || "审核";
  const detailParts = [
    record.reviewerName,
    record.commentText,
    record.isFinalDecision ? "终审决议" : null,
    record.nextReviewLevel ? `下一级：${record.nextReviewLevel}` : null,
  ].filter(Boolean);

  return {
    id: `review-record-${record.id}`,
    stage: "人工审核",
    label: `${levelLabel} · ${actionLabel}`,
    detail: detailParts.join(" · "),
    timestamp: formatFieldValue({ type: "datetime" }, record.decidedAt),
    tone: reviewActionTone(record.action ?? ""),
  };
}

export function buildHistoryCommentsFromReviewRecords(records: ReviewerReviewRecordResponse[]) {
  return [...records]
    .sort((left, right) => parseInstant(right.decidedAt) - parseInstant(left.decidedAt))
    .map((record) => {
      const actionLabel = formatReviewActionLabel(record.action);
      const levelLabel = record.reviewLevelLabel || record.reviewLevel || "审核";
      return {
        reviewer: `${record.reviewerName ?? "审核员"} · ${levelLabel} · ${actionLabel}`,
        comment: record.commentText ?? "",
        at: formatFieldValue({ type: "datetime" }, record.decidedAt),
      };
    })
    .filter((item) => item.comment.trim().length > 0);
}

export function mergeReviewerTimelines(
  lifecycle?: ReviewerTimelineEntryResponse[],
  reviewRecords?: ReviewerReviewRecordResponse[],
): AuditTimelineEntry[] {
  const sorted: { at: number; entry: AuditTimelineEntry }[] = [];

  for (const item of lifecycle ?? []) {
    sorted.push({
      at: parseInstant(item.timestamp),
      entry: mapReviewerTimeline([item])[0],
    });
  }

  for (const record of reviewRecords ?? []) {
    sorted.push({
      at: parseInstant(record.decidedAt),
      entry: mapReviewRecordToTimelineEntry(record),
    });
  }

  sorted.sort((left, right) => left.at - right.at || left.entry.id.localeCompare(right.entry.id));
  return sorted.map((item) => item.entry);
}
