import { Badge } from "@/components/ui/badge";
import { formatReviewStageHeadline } from "../../../utils/review-stage";
import type { ReviewWorkbenchBusinessContext } from "../../types";

export function ContentHeaderPanelBody({ context }: { context: ReviewWorkbenchBusinessContext }) {
  const row = context.rows.find((item) => item.id === context.currentId);
  const detail = context.detail;
  const title = detail?.title ?? row?.title;
  const submissionCode = detail?.submissionCode ?? row?.submissionCode;
  const labeler = detail?.labeler ?? row?.labeler;
  const reviewStage = detail?.reviewStage;

  if (!title && !submissionCode) {
    return null;
  }

  return (
    <div className="shrink-0 border-b border-border/80 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">题目与标注结果</p>
      <h2 className="mt-0.5 truncate text-base font-semibold text-foreground">{title}</h2>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {submissionCode ? <Badge variant="secondary">{submissionCode}</Badge> : null}
        {reviewStage ? (
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
            {formatReviewStageHeadline(reviewStage)}
          </Badge>
        ) : null}
        {labeler ? <Badge variant="secondary">{labeler}</Badge> : null}
      </div>
    </div>
  );
}
