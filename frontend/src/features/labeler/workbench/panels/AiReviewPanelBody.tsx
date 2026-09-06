import type { WidgetViewMode } from "@/components/workbench2/components/EditableWidgetBoard";
import { LabelerReviewStatusPanel } from "./LabelerReviewStatusPanel";
import type { LabelerWorkbenchViewMode } from "../LabelerSlotFrame";
import type { LabelerWorkbenchBusinessContext } from "../types";

export function AiReviewPanelBody({
  context,
  viewMode,
}: {
  context: LabelerWorkbenchBusinessContext;
  viewMode: WidgetViewMode;
}) {
  if (viewMode === "json") {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        <pre className="overflow-auto rounded-lg bg-slate-950 p-3 text-xs leading-6 text-emerald-300">
          {JSON.stringify(
            {
              submissionId: context.work.submission.id,
              currentStatus: context.work.submission.currentStatus,
              lastReview: context.work.lastReview,
            },
            null,
            2,
          )}
        </pre>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <LabelerReviewStatusPanel
        work={context.work}
        className="h-full"
        collapsible={viewMode !== ("inline" as LabelerWorkbenchViewMode)}
        storageKey={`labeler-review-status:${context.assignmentId}`}
        title="审核进度"
      />
    </div>
  );
}
