import type { AuditTimelineEntry } from "@/components/workbench/shared/AuditTimeline";

const REVIEW_ACTION_PATTERN = /打回|驳回|RETURN|REJECT|需修改/i;

function extractCommentFromDetail(detail: string): string | null {
  const trimmed = detail.trim();
  if (!trimmed) {
    return null;
  }
  const parts = trimmed.split(" · ").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) {
    return null;
  }
  const last = parts[parts.length - 1];
  if (last.includes("→")) {
    return null;
  }
  if (parts.length >= 3) {
    return parts.slice(2).join(" · ");
  }
  return last;
}

export function extractReviewCommentFromTimeline(entries: AuditTimelineEntry[]): string | null {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (!REVIEW_ACTION_PATTERN.test(`${entry.stage} ${entry.label}`)) {
      continue;
    }
    const comment = entry.detail ? extractCommentFromDetail(entry.detail) : null;
    if (comment) {
      return comment;
    }
  }
  return null;
}

export function resolveLabelerReviewComment(
  lastReviewComment: string | null | undefined,
  timelineEntries: AuditTimelineEntry[],
): string | null {
  const direct = lastReviewComment?.trim();
  if (direct) {
    return direct;
  }
  return extractReviewCommentFromTimeline(timelineEntries);
}

export function needsReviewCommentHint(status: string): boolean {
  return status === "NEEDS_REVISION" || status === "REJECTED" || status === "AI_REJECTED";
}
