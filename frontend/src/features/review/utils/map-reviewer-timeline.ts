import type { AuditTimelineEntry } from "@/components/workbench/shared/AuditTimeline";
import { formatFieldValue } from "@/low-code/utils/formatters";
import type { ReviewerTimelineEntryResponse } from "../api/reviewer-workbench-api";

export function mapReviewerTimeline(entries?: ReviewerTimelineEntryResponse[]): AuditTimelineEntry[] {
  if (!entries?.length) {
    return [];
  }
  return entries.map((entry) => ({
    id: entry.id,
    stage: entry.stage,
    label: entry.label,
    detail: entry.detail,
    timestamp: formatFieldValue({ type: "datetime" }, entry.timestamp),
    tone: entry.tone ?? "default",
  }));
}
