import type { NotificationItem } from "../api/notifications-api";

let optimizationResultWatchCount = 0;

export function startOptimizationResultWatch(): () => void {
  optimizationResultWatchCount += 1;
  return () => {
    optimizationResultWatchCount = Math.max(0, optimizationResultWatchCount - 1);
  };
}

export function isOptimizationResultWatchActive(): boolean {
  return optimizationResultWatchCount > 0;
}

export function isPromptOptimizationNotification(
  item: Pick<NotificationItem, "title" | "linkUrl">,
): boolean {
  const title = item.title ?? "";
  if (title.includes("提示词优化") || title.includes("AI 预审提示词优化")) {
    return true;
  }
  return (item.linkUrl ?? "").includes("/owner/ai-review-health");
}

/** 质检大屏触发优化时由页面轮询负责 toast，铃铛仅更新角标，避免重复弹窗。 */
export function shouldAutoToastNotification(
  item: Pick<NotificationItem, "title" | "linkUrl">,
  pathname: string,
): boolean {
  if (!isPromptOptimizationNotification(item)) {
    return true;
  }
  if (pathname.includes("/owner/ai-review-health")) {
    return false;
  }
  return !isOptimizationResultWatchActive();
}
