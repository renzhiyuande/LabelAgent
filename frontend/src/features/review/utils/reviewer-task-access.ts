/** 与后端 ReviewerTaskMemberAccess / TASK_MEMBER 数据范围一致 */
export const REVIEWER_TASK_MEMBER_HINT =
  "仅可审核已加入为「审核员（REVIEWER）」成员的任务；请联系任务 Owner 在「任务管理 → 审核员管理」中为您授权。";

export const REVIEWER_TASK_ACCESS_HINT_STORAGE_KEY = "labelhub.review.task-access-hint.dismissed";

export const REVIEWER_AUDIT_POOL_EMPTY_GROUPS_HINT =
  "当前没有已授权任务下的待审分组。请确认 Owner 已将您添加为该任务的审核员成员。";

function readErrorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return undefined;
  }
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

function readErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : undefined;
  }
  return undefined;
}

export function formatReviewAccessError(error: unknown, fallback = "操作失败"): string {
  const status = readErrorStatus(error);
  const message = readErrorMessage(error);
  if (status === 403) {
    return message?.trim() ? `${message}（${REVIEWER_TASK_MEMBER_HINT}）` : REVIEWER_TASK_MEMBER_HINT;
  }
  return message?.trim() || fallback;
}

export function isReviewTaskAccessForbidden(error: unknown): boolean {
  return readErrorStatus(error) === 403;
}
