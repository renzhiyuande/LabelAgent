import type { LabelerMyWorkRow } from "../../api/labeler-work-api";
import { isOpenAssignment } from "./work-queue-status";

export type LabelerQueueFilter = "all" | "open" | "submitted" | "needs_revision" | "approved" | "rejected";

const SUBMITTED_STATUSES = new Set([
  "SUBMITTED",
  "AI_REVIEWING",
  "AI_PASSED",
  "AI_REJECTED",
  "HUMAN_REVIEWING",
]);

export const LABELER_QUEUE_FILTER_META: Record<LabelerQueueFilter, string> = {
  all: "全部",
  open: "待作答",
  submitted: "已提交",
  needs_revision: "需修改",
  approved: "已通过",
  rejected: "已驳回",
};

export function resolveLabelerQueueBucket(row: LabelerMyWorkRow): LabelerQueueFilter | null {
  if (isOpenAssignment(row)) {
    return "open";
  }
  const status = row.submissionStatus;
  if (!status) {
    return null;
  }
  if (status === "NEEDS_REVISION") {
    return "needs_revision";
  }
  if (status === "APPROVED") {
    return "approved";
  }
  if (status === "REJECTED" || status === "AI_REJECTED") {
    return "rejected";
  }
  if (SUBMITTED_STATUSES.has(status)) {
    return "submitted";
  }
  return null;
}

export function filterLabelerQueueRows(rows: LabelerMyWorkRow[], filter: LabelerQueueFilter): LabelerMyWorkRow[] {
  if (filter === "all") {
    return rows;
  }
  return rows.filter((row) => resolveLabelerQueueBucket(row) === filter);
}

export function countLabelerQueueFilters(rows: LabelerMyWorkRow[]): Record<LabelerQueueFilter, number> {
  const counts: Record<LabelerQueueFilter, number> = {
    all: rows.length,
    open: 0,
    submitted: 0,
    needs_revision: 0,
    approved: 0,
    rejected: 0,
  };
  for (const row of rows) {
    const bucket = resolveLabelerQueueBucket(row);
    if (bucket && bucket !== "all") {
      counts[bucket] += 1;
    }
  }
  return counts;
}
