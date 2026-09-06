import { formatReviewStageHeadline } from "../../../utils/review-stage";
import type { ReviewWorkbenchBusinessContext } from "../../types";

export function ReviewHeaderPanelBody({ context }: { context: ReviewWorkbenchBusinessContext }) {
  const stage = context.detail?.reviewStage;
  return (
    <div className="shrink-0 border-b border-border/80 px-4 py-3">
      <p className="text-sm font-semibold text-foreground">审核操作</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {stage ? `${formatReviewStageHeadline(stage)} · ` : ""}
        通过、驳回或打回并填写批注意见
      </p>
    </div>
  );
}
