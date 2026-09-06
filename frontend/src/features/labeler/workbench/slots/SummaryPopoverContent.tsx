import type { LabelerWorkbenchBusinessContext } from "../types";
import { resolveSubmissionStatusLabel, shouldShowReviewPanel } from "../utils/submission-review";

export function SummaryPopoverContent({ context }: { context: LabelerWorkbenchBusinessContext }) {
  const reviewStatusLabel = shouldShowReviewPanel(context.work)
    ? resolveSubmissionStatusLabel(context.work.submission.currentStatus)
    : "待提交";

  return (
    <div className="space-y-2 p-1 text-sm text-slate-600 dark:text-slate-300">
      <div>题目：{context.work.task.taskName ?? "标注工作台"}</div>
      <div>位置：{context.queuePositionLabel ?? "—"}</div>
      <div>保存状态：{context.saveHint || "空闲"}</div>
      <div>审核状态：{reviewStatusLabel}</div>
    </div>
  );
}
