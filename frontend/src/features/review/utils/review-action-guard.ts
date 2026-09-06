import type { ManualReviewDetail } from "../types";

export function getReviewActionBlockReason(input: {
  detail: ManualReviewDetail | null | undefined;
  saving: boolean;
  comment: string;
}): string | null {
  if (!input.detail) {
    return "正在加载审核详情，请稍候";
  }
  if (input.saving) {
    return "正在提交审核结果，请稍候";
  }
  if (input.detail.status !== "pending") {
    return "当前条目不在待审核状态";
  }
  if (!input.comment.trim()) {
    return "请先填写审核意见";
  }
  return null;
}

export function isReviewActionBlocked(input: {
  detail: ManualReviewDetail | null | undefined;
  saving: boolean;
  comment: string;
}): boolean {
  return getReviewActionBlockReason(input) !== null;
}
