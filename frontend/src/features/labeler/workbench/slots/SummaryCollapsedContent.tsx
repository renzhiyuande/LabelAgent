import { Sparkles } from "lucide-react";
import type { LabelerWorkbenchBusinessContext } from "../types";
import { resolveSubmissionStatusLabel, shouldShowReviewPanel } from "../utils/submission-review";

export function SummaryCollapsedContent({ context }: { context: LabelerWorkbenchBusinessContext }) {
  const saveLabel = context.saveHint?.trim() || "空闲";
  const reviewStatusLabel = shouldShowReviewPanel(context.work)
    ? resolveSubmissionStatusLabel(context.work.submission.currentStatus)
    : "待提交";

  return (
    <div className="lh-scrollbar-none flex h-full w-full min-h-0 flex-col items-center gap-1.5 overflow-y-auto py-3">
      <Sparkles className="h-5 w-5 shrink-0 text-violet-500" />
      {context.queueOrdinalLabel ? (
        <span className="text-center text-[11px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">
          {context.queueOrdinalLabel}
        </span>
      ) : null}
      {context.queuePositionLabel ? (
        <span className="text-center text-[10px] leading-4 tabular-nums text-slate-500 dark:text-slate-400">
          {context.queuePositionLabel}
        </span>
      ) : null}
      <span className="max-w-[3.5rem] truncate text-center text-[10px] text-slate-500 dark:text-slate-400" title={saveLabel}>
        {saveLabel}
      </span>
      <span className="max-w-[3.5rem] truncate text-center text-[10px] font-semibold text-slate-600 dark:text-slate-300" title={reviewStatusLabel}>
        {reviewStatusLabel}
      </span>
    </div>
  );
}
