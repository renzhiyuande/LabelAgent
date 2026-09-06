import type { WidgetViewMode } from "@/components/workbench2/components/EditableWidgetBoard";
import { LabelerPayloadPanel } from "./LabelerPayloadPanel";
import type { LabelerWorkbenchBusinessContext } from "../types";
import type { LabelerWorkbenchViewMode } from "../LabelerSlotFrame";

export function PayloadPanelBody({
  context,
  viewMode,
}: {
  context: LabelerWorkbenchBusinessContext;
  viewMode?: WidgetViewMode;
}) {
  const resolvedMode = (viewMode ?? context.slotModes.payload) as LabelerWorkbenchViewMode;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <LabelerPayloadPanel
        viewMode={resolvedMode}
        payload={context.work.taskItem.payload}
        displaySchema={context.displaySchema}
        taskName={context.work.task.taskName ?? "题目"}
        seqNo={context.work.taskItem.seqNo}
        sceneCode={context.work.task.sceneCode}
        lastReviewComment={context.work.lastReview?.comment}
        pending={context.contentPendingOnly}
      />
    </div>
  );
}
