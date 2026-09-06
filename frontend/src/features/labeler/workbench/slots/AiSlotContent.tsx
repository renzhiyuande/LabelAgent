import {
  loadLabelerWidgetOrder,
  type LabelerWidgetBoardId,
} from "../labeler-widget-board-storage";
import { LabelerReviewStatusPanel } from "../panels/LabelerReviewStatusPanel";
import { LabelerSlotFrame } from "../LabelerSlotFrame";
import { LabelerSlotWidgetBoard } from "../chrome/LabelerSlotWidgetBoard";
import { SurfaceByMode } from "../chrome/SurfaceByMode";
import { useLabelerWidgetPlacementOptional } from "../labeler-widget-placement-context";
import type { LabelerSlotRenderEnv, LabelerWorkbenchBusinessContext } from "../types";

const REVIEW_WIDGET_ID = "ai-review";

function resolveOrders(
  placement: ReturnType<typeof useLabelerWidgetPlacementOptional>,
): Record<LabelerWidgetBoardId, string[]> {
  if (placement) {
    return placement.orders;
  }
  return {
    payload: loadLabelerWidgetOrder("payload"),
    annotate: loadLabelerWidgetOrder("annotate"),
    ai: loadLabelerWidgetOrder("ai"),
  };
}

function resolveReviewWidgetBoard(orders: Record<LabelerWidgetBoardId, string[]>): LabelerWidgetBoardId | null {
  if (orders.ai.includes(REVIEW_WIDGET_ID)) {
    return "ai";
  }
  if (orders.annotate.includes(REVIEW_WIDGET_ID)) {
    return "annotate";
  }
  if (orders.payload.includes(REVIEW_WIDGET_ID)) {
    return "payload";
  }
  return null;
}

function ReviewStatusPanelView({ context }: { context: LabelerWorkbenchBusinessContext }) {
  return (
    <SurfaceByMode
      mode={context.slotModes.ai}
      jsonData={{
        submissionId: context.work.submission.id,
        currentStatus: context.work.submission.currentStatus,
        lastReview: context.work.lastReview,
      }}
    >
      <div className="h-full overflow-y-auto">
        <LabelerReviewStatusPanel work={context.work} />
      </div>
    </SurfaceByMode>
  );
}

export function AiSlotContent({
  context,
  env,
}: {
  context: LabelerWorkbenchBusinessContext;
  env: LabelerSlotRenderEnv;
}) {
  const placement = useLabelerWidgetPlacementOptional();
  const orders = resolveOrders(placement);
  const reviewBoard = resolveReviewWidgetBoard(orders);
  const inAiBoard = reviewBoard === "ai";
  const inPayload = reviewBoard === "payload";

  if (inAiBoard) {
    return (
      <LabelerSlotFrame
        slotId="ai"
        title="审核进度"
        description={
          context.editMode
            ? "审核进度组件展示于此；可拖到题面或作答区。"
            : "提交后可查看人工审核状态、打回意见与审计日志。"
        }
        env={env}
        controls={context}
        suppressViewMode
      >
        <LabelerSlotWidgetBoard boardId="ai" context={context} />
      </LabelerSlotFrame>
    );
  }

  if (context.editMode) {
    return (
      <LabelerSlotFrame
        slotId="ai"
        title="审核进度"
        description={
          inPayload
            ? "审核进度在题面区；拖入下方可移回审核区。"
            : "下方可拖入「审核进度」组件；预览仍保留在上方。"
        }
        env={env}
        controls={context}
      >
        {inPayload ? (
          <p className="mb-2 shrink-0 text-[11px] text-slate-500 dark:text-slate-400">
            审核进度当前在题面区，拖入下方可移回审核区。
          </p>
        ) : (
          <div className="mb-2 min-h-0 flex-1 overflow-hidden">
            <ReviewStatusPanelView context={context} />
          </div>
        )}
        <LabelerSlotWidgetBoard boardId="ai" context={context} className="shrink-0" />
      </LabelerSlotFrame>
    );
  }

  if (inPayload) {
    return (
      <LabelerSlotFrame
        slotId="ai"
        title="审核进度"
        description="审核进度组件当前在题面区域展示。"
        env={env}
        controls={context}
        suppressViewMode
      >
        <div className="flex h-full min-h-[120px] items-center justify-center px-4 text-center text-sm text-slate-500 dark:text-slate-400">
          审核进度已放在题面右侧。可在「编辑布局」中将组件拖回本区域，或拖入作答区。
        </div>
      </LabelerSlotFrame>
    );
  }

  return (
    <LabelerSlotFrame
      slotId="ai"
      title="审核进度"
      description="提交后可查看人工审核状态、打回意见与审计日志。"
      env={env}
      controls={context}
    >
      <ReviewStatusPanelView context={context} />
    </LabelerSlotFrame>
  );
}
