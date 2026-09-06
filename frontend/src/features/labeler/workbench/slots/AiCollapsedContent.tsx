import { ClipboardCheck } from "lucide-react";
import { resolveReviewTabBadge } from "../layout/resolve-review-tab-badge";
import { useLabelerSubmissionTimeline } from "../hooks/use-labeler-submission-timeline";
import type { LabelerWorkbenchBusinessContext } from "../types";
import { needsReviewCommentHint } from "../utils/extract-review-comment";
import { resolveSubmissionStatusLabel, shouldShowReviewPanel } from "../utils/submission-review";

export function AiCollapsedContent({ context }: { context: LabelerWorkbenchBusinessContext }) {
  const showReview = shouldShowReviewPanel(context.work);
  const status = context.work.submission.currentStatus;
  const statusLabel = showReview ? resolveSubmissionStatusLabel(status) : "待提交";

  const { reviewComment, loading } = useLabelerSubmissionTimeline(
    context.work.submission.id,
    showReview && needsReviewCommentHint(status),
    context.work.lastReview?.comment,
  );

  return (
    <div className="lh-scrollbar-none flex h-full w-full min-h-0 flex-col items-center gap-2 overflow-y-auto px-1 py-3">
      <ClipboardCheck className="h-5 w-5 shrink-0 text-primary" />
      {resolveReviewTabBadge(context)}
      <div className="flex flex-col items-center gap-0.5 text-center">
        <span className="text-[10px] text-muted-foreground">审核状态</span>
        <span className="max-w-[5rem] truncate text-xs font-semibold text-foreground" title={statusLabel}>
          {statusLabel}
        </span>
      </div>
      {showReview && needsReviewCommentHint(status) ? (
        reviewComment ? (
          <div className="w-full max-w-[5.5rem] border-t border-amber-200/70 pt-2 dark:border-amber-500/30">
            <p className="text-[10px] font-medium text-amber-700 dark:text-amber-300">打回意见</p>
            <p
              className="mt-1 line-clamp-4 text-[10px] leading-4 text-amber-900 dark:text-amber-100"
              title={reviewComment}
            >
              {reviewComment}
            </p>
          </div>
        ) : loading ? (
          <p className="text-[10px] text-muted-foreground">加载意见…</p>
        ) : null
      ) : null}
    </div>
  );
}
