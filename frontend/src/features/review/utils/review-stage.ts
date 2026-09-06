import type { ReviewerSubmissionDetailResponse } from "../api/reviewer-workbench-api";
import type { ManualReviewDetail, ManualReviewRow, ReviewStageInfo } from "../types";

export function mapReviewStageFromDetail(
  detail: ReviewerSubmissionDetailResponse | ManualReviewDetail,
): ReviewStageInfo | null {
  const key = detail.currentReviewLevel;
  if (!key) {
    return null;
  }
  const levels = "reviewWorkflowLevels" in detail ? detail.reviewWorkflowLevels : undefined;
  const stageNo = "reviewStageNo" in detail ? (detail.reviewStageNo ?? 1) : 1;
  const totalStages = levels?.length ?? stageNo;
  return {
    key,
    label: detail.reviewStageLabel ?? key,
    stageNo,
    totalStages: Math.max(totalStages, stageNo),
    isFinal: detail.isFinalReviewLevel ?? false,
    nextLevelKey: detail.nextReviewLevel ?? null,
    nextLevelLabel: detail.nextReviewLevel
      ? levels?.find((level) => level.key === detail.nextReviewLevel)?.label ?? detail.nextReviewLevel
      : null,
  };
}

export function mapReviewStageFromRow(row: ManualReviewRow): ReviewStageInfo | null {
  if (!row.currentReviewLevel) {
    return null;
  }
  return {
    key: row.currentReviewLevel,
    label: row.reviewStageLabel ?? row.currentReviewLevel,
    stageNo: 1,
    totalStages: 1,
    isFinal: false,
  };
}

export function formatReviewStageHeadline(stage: ReviewStageInfo): string {
  if (stage.totalStages > 1) {
    return `本轮：${stage.label}（${stage.stageNo}/${stage.totalStages}）`;
  }
  return `本轮：${stage.label}`;
}

export function formatApproveActionLabel(isFinal: boolean): string {
  return isFinal ? "通过并结案" : "通过并进入下一审";
}
