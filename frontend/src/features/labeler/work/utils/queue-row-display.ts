import type { LabelerMyWorkRow, LabelerWorkDetailResponse } from "../../api/labeler-work-api";

export function resolveQueueRowSeqNo(
  row: LabelerMyWorkRow,
  queueIndex: number,
  cachedWork?: LabelerWorkDetailResponse,
): number {
  const cachedSeq = cachedWork?.taskItem.seqNo;
  if (cachedSeq != null && cachedSeq > 0) {
    return cachedSeq;
  }
  if (row.seqNo != null && row.seqNo > 0) {
    return row.seqNo;
  }
  return queueIndex + 1;
}

export function formatQueueRowSeqNo(seqNo: number): string {
  return seqNo >= 100 ? String(seqNo) : String(seqNo).padStart(2, "0");
}

export function queueRowStatusLabel(row: LabelerMyWorkRow): string {
  if (row.assignmentStatus === "CLAIMED") {
    if (row.submissionStatus === "DRAFT") {
      return "草稿";
    }
    return "待作答";
  }
  if (row.submissionStatus === "NEEDS_REVISION") {
    return "需修改";
  }
  if (row.submissionStatus === "DRAFT") {
    return "草稿";
  }
  if (row.submissionStatus === "SUBMITTED") {
    return "已提交";
  }
  if (row.submissionStatus === "AI_REVIEWING") {
    return "AI 审核中";
  }
  if (row.submissionStatus === "AI_PASSED") {
    return "AI 通过";
  }
  if (row.submissionStatus === "AI_REJECTED") {
    return "AI 驳回";
  }
  if (row.submissionStatus === "HUMAN_REVIEWING") {
    return "人工审核中";
  }
  if (row.submissionStatus === "APPROVED") {
    return "已通过";
  }
  if (row.submissionStatus === "REJECTED") {
    return "已驳回";
  }
  if (row.submissionStatus) {
    return row.submissionStatus;
  }
  return row.assignmentStatus;
}

export function queueRowStatusShortLabel(row: LabelerMyWorkRow): string {
  if (row.assignmentStatus === "CLAIMED") {
    if (row.submissionStatus === "DRAFT") {
      return "草稿";
    }
    return "待答";
  }
  if (row.submissionStatus === "NEEDS_REVISION") {
    return "待改";
  }
  if (row.submissionStatus === "DRAFT") {
    return "草稿";
  }
  if (row.submissionStatus === "SUBMITTED") {
    return "已交";
  }
  if (row.submissionStatus === "AI_REVIEWING") {
    return "审核";
  }
  if (row.submissionStatus === "AI_PASSED") {
    return "AI过";
  }
  if (row.submissionStatus === "AI_REJECTED") {
    return "AI驳";
  }
  if (row.submissionStatus === "HUMAN_REVIEWING") {
    return "人审";
  }
  if (row.submissionStatus === "APPROVED") {
    return "通过";
  }
  if (row.submissionStatus === "REJECTED") {
    return "驳回";
  }
  if (row.submissionStatus) {
    return row.submissionStatus.slice(0, 2);
  }
  return "—";
}

export function queueRowStatusTone(row: LabelerMyWorkRow): "secondary" | "success" | "warning" | "destructive" {
  if (row.assignmentStatus === "CLAIMED") {
    return row.submissionStatus === "DRAFT" ? "secondary" : "warning";
  }
  if (row.submissionStatus === "NEEDS_REVISION" || row.submissionStatus === "REJECTED" || row.submissionStatus === "AI_REJECTED") {
    return "destructive";
  }
  if (row.submissionStatus === "APPROVED" || row.submissionStatus === "AI_PASSED") {
    return "success";
  }
  if (row.submissionStatus === "SUBMITTED" || row.submissionStatus === "AI_REVIEWING" || row.submissionStatus === "HUMAN_REVIEWING") {
    return "secondary";
  }
  return "secondary";
}

export function queueRowStatusTextClass(tone: ReturnType<typeof queueRowStatusTone>): string {
  switch (tone) {
    case "success":
      return "text-emerald-600 dark:text-emerald-300";
    case "warning":
      return "text-amber-600 dark:text-amber-300";
    case "destructive":
      return "text-rose-600 dark:text-rose-300";
    default:
      return "text-slate-500 dark:text-slate-400";
  }
}
