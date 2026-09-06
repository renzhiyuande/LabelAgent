import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import type { LabelerWorkbenchBusinessContext } from "../types";
import {
  resolveSubmissionStatusLabel,
  resolveSubmissionStatusMeta,
  shouldShowReviewPanel,
} from "../utils/submission-review";

export function resolveReviewTabBadge(context: LabelerWorkbenchBusinessContext): ReactNode | undefined {
  if (!shouldShowReviewPanel(context.work)) {
    return undefined;
  }

  const status = context.work.submission.currentStatus;
  const meta = resolveSubmissionStatusMeta(status);

  return (
    <Badge variant={meta.badge} className="h-5 shrink-0 px-1.5 text-[11px] font-semibold">
      {resolveSubmissionStatusLabel(status)}
    </Badge>
  );
}
