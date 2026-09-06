import type { LabelerMyWorkRow, LabelerWorkDetailResponse } from "../../api/labeler-work-api";

const REVISABLE_SUBMISSION_STATUSES = new Set([
  "DRAFT",
  "NEEDS_REVISION",
  "AI_REJECTED",
  "APPEAL_APPROVED_SKIP_AI",
  "APPEAL_APPROVED_SKIP_HUMAN",
]);

function isRevisableSubmissionStatus(status?: string | null): boolean {
  return status != null && REVISABLE_SUBMISSION_STATUSES.has(status);
}

function isActionableAssignment(row: LabelerMyWorkRow): boolean {
  if (row.assignmentStatus === "CLAIMED") {
    return true;
  }
  return row.assignmentStatus === "SUBMITTED" && isRevisableSubmissionStatus(row.submissionStatus);
}

export function isOpenAssignment(row: LabelerMyWorkRow): boolean {
  return isActionableAssignment(row);
}

export function hasOpenAssignments(rows: LabelerMyWorkRow[]): boolean {
  return rows.some(isOpenAssignment);
}

export function findNextOpenAssignment(rows: LabelerMyWorkRow[]): LabelerMyWorkRow | undefined {
  return rows.find(isOpenAssignment);
}

export function canSubmitWork(work: LabelerWorkDetailResponse | null | undefined): boolean {
  if (!work) {
    return false;
  }
  if (work.assignment.status === "CLAIMED") {
    return true;
  }
  return work.assignment.status === "SUBMITTED"
    && isRevisableSubmissionStatus(work.submission.currentStatus);
}

/** 草稿 / 待修改 / 申诉通过后可保存草稿 */
export function canSaveDraft(work: LabelerWorkDetailResponse | null | undefined): boolean {
  if (!work) {
    return false;
  }
  const status = work.submission.currentStatus;
  if (!isRevisableSubmissionStatus(status)) {
    return false;
  }
  return work.assignment.status === "CLAIMED" || work.assignment.status === "SUBMITTED";
}

export function canSaveDraftForQueueRow(row: LabelerMyWorkRow): boolean {
  if (!isActionableAssignment(row)) {
    return false;
  }
  if (!row.submissionStatus || row.submissionStatus === "DRAFT") {
    return true;
  }
  return isRevisableSubmissionStatus(row.submissionStatus);
}

export function isTaskQueueComplete(rows: LabelerMyWorkRow[], queueTotal: number): boolean {
  if (queueTotal <= 0 && rows.length === 0) {
    return false;
  }
  if (rows.length < queueTotal) {
    return false;
  }
  return !hasOpenAssignments(rows);
}
