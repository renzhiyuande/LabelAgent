import type { LabelerWorkDetailResponse } from "../../api/labeler-work-api";
import { queueRowStatusLabel, queueRowStatusTone } from "../../work/utils/queue-row-display";

export function isFirstAnnotation(work: LabelerWorkDetailResponse): boolean {
  const status = work.submission.currentStatus;
  return work.assignment.status === "CLAIMED" && (status === "DRAFT" || !status);
}

export function shouldShowReviewPanel(work: LabelerWorkDetailResponse): boolean {
  return !isFirstAnnotation(work);
}

export const LABELER_SUBMISSION_STATUS_META: Record<
  string,
  { label: string; badge: "default" | "secondary" | "success" | "warning" | "destructive"; hint?: string }
> = {
  DRAFT: { label: "草稿", badge: "secondary", hint: "尚未提交，保存后可继续作答。" },
  SUBMITTED: { label: "已提交", badge: "secondary", hint: "已提交，等待 AI 或人工审核。" },
  AI_REVIEWING: { label: "AI 审核中", badge: "warning", hint: "AI 正在预审本题。" },
  AI_PASSED: { label: "AI 通过", badge: "success", hint: "AI 预审通过，可能进入人工复核。" },
  AI_REJECTED: { label: "AI 驳回", badge: "destructive", hint: "AI 预审未通过，请关注打回意见。" },
  HUMAN_REVIEWING: { label: "人工审核中", badge: "warning", hint: "已进入人工审核队列。" },
  NEEDS_REVISION: { label: "需修改", badge: "destructive", hint: "审核打回，请根据意见修改后重新提交。" },
  APPROVED: { label: "已通过", badge: "success", hint: "本题审核已通过。" },
  REJECTED: { label: "已驳回", badge: "destructive", hint: "本题已被驳回。" },
  APPEAL_APPROVED_SKIP_AI: { label: "申诉通过", badge: "success" },
  APPEAL_APPROVED_SKIP_HUMAN: { label: "申诉通过", badge: "success" },
};

export function resolveSubmissionStatusMeta(status: string) {
  return (
    LABELER_SUBMISSION_STATUS_META[status] ?? {
      label: queueRowStatusLabel({
        assignmentId: 0,
        taskId: 0,
        itemId: 0,
        assignmentStatus: "SUBMITTED",
        submissionStatus: status,
      }),
      badge: queueRowStatusTone({
        assignmentId: 0,
        taskId: 0,
        itemId: 0,
        assignmentStatus: "SUBMITTED",
        submissionStatus: status,
      }),
    }
  );
}

export function resolveSubmissionStatusLabel(status: string): string {
  return resolveSubmissionStatusMeta(status).label;
}
