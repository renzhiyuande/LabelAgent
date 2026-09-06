import { WorkbenchWidgetTabSlotContent } from "@/components/workbench2/components/WorkbenchWidgetTabSlotContent";
import { buildReviewWidget } from "../../review-widget-factory";
import { defaultBoardForReviewWidget, isReviewWidgetId } from "../../review-widget-registry";
import {
  loadReviewWidgetViewModes,
  mergeReviewWidgetViewModes,
} from "../../review-widget-board-storage";
import { useReviewWidgetPlacementOptional } from "../../review-widget-placement-context";
import type { ReviewSlotRenderEnv, ReviewWorkbenchBusinessContext } from "../../types";

function reviewBoardIdForWidget(widgetId: string) {
  return defaultBoardForReviewWidget(widgetId as Parameters<typeof defaultBoardForReviewWidget>[0]) ?? "content";
}

export function ReviewWidgetTabSlotContent({
  context,
  env,
}: {
  context: ReviewWorkbenchBusinessContext;
  env: ReviewSlotRenderEnv;
}) {
  const placement = useReviewWidgetPlacementOptional();

  return (
    <WorkbenchWidgetTabSlotContent
      context={context}
      tabId={env.tabId}
      layoutTabs={context.layoutTabs}
      editMode={context.editMode}
      isWidgetId={isReviewWidgetId}
      buildWidget={({ widgetId, context: ctx, widgetModes, setWidgetMode }) => {
        const boardId = defaultBoardForReviewWidget(widgetId) ?? "content";
        return buildReviewWidget(widgetId, {
          context: ctx,
          boardId,
          widgetModes,
          setWidgetMode,
          standaloneTab: true,
        });
      }}
      placement={placement}
      loadWidgetViewModes={(widgetIds) => {
        const id = widgetIds[0];
        if (!id || !isReviewWidgetId(id)) {
          return {};
        }
        return loadReviewWidgetViewModes(reviewBoardIdForWidget(id), widgetIds);
      }}
      onWidgetViewModesChange={(modes) => {
        const id = Object.keys(modes)[0];
        if (!id || !isReviewWidgetId(id)) {
          return;
        }
        mergeReviewWidgetViewModes(reviewBoardIdForWidget(id), modes);
      }}
    />
  );
}
