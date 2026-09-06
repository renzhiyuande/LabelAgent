import { LabelerQueueSlot } from "../LabelerQueueSlot";
import { LabelerSlotFrame } from "../LabelerSlotFrame";
import type { LabelerSlotRenderEnv, LabelerWorkbenchBusinessContext } from "../types";

export function QueueSlotContent({
  context,
  env,
}: {
  context: LabelerWorkbenchBusinessContext;
  env: LabelerSlotRenderEnv;
}) {
  return (
    <LabelerSlotFrame slotId="queue" title="题目队列" description="缩放时显示当前题号，编辑态可切换显示视图。" env={env} controls={context}>
      <LabelerQueueSlot
        rows={context.queueRows}
        currentAssignmentId={context.assignmentId}
        currentOrdinalLabel={context.queueOrdinalLabel}
        loading={context.queueLoading}
        loadingMore={context.queueLoadingMore}
        hasMore={context.queueHasMore}
        queueLocked={context.contentPendingOnly}
        mode={context.slotModes.queue}
        onSelectAssignment={context.onSelectAssignment}
        onLoadMore={context.onLoadMoreQueue}
        onApplyQueueScope={context.onApplyQueueScope}
      />
    </LabelerSlotFrame>
  );
}
