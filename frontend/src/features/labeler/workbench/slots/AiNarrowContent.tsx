import { ClipboardCheck } from "lucide-react";
import { useLabelerSubmissionTimeline } from "../hooks/use-labeler-submission-timeline";
import type { LabelerWorkbenchBusinessContext } from "../types";
import { needsReviewCommentHint } from "../utils/extract-review-comment";
import { resolveSubmissionStatusLabel, shouldShowReviewPanel } from "../utils/submission-review";

export function AiNarrowContent({ context }: { context: LabelerWorkbenchBusinessContext }) {
  const showReview = shouldShowReviewPanel(context.work);
  const status = context.work.submission.currentStatus;
  const label = showReview ? resolveSubmissionStatusLabel(status) : "待提交";

  const { reviewComment } = useLabelerSubmissionTimeline(
    context.work.submission.id,
    showReview && needsReviewCommentHint(status),
    context.work.lastReview?.comment,
  );

  return (
    <div className="flex flex-col items-center gap-1.5 py-2">
      <ClipboardCheck className="h-5 w-5 text-primary" />
      <span className="max-w-[4.5rem] truncate text-center text-[11px] text-muted-foreground" title={label}>
        {label}
      </span>
      {reviewComment ? (
        <span
          className="max-w-[4.5rem] line-clamp-3 text-center text-[10px] leading-4 text-amber-700 dark:text-amber-300"
          title={reviewComment}
        >
          {reviewComment}
        </span>
      ) : null}
    </div>
  );
}
