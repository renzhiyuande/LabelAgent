import { WorkbenchWidgetTabSlotContent } from "@/components/workbench2/components/WorkbenchWidgetTabSlotContent";
import { buildAiQueueWidget } from "../../ai-queue-widget-factory";
import {
  loadAiQueueWidgetViewModes,
  mergeAiQueueWidgetViewModes,
} from "../../ai-queue-widget-board-storage";
import { isAiQueueWidgetId } from "../../ai-queue-widget-registry";
import { useAiQueueWidgetPlacementOptional } from "../../ai-queue-widget-placement-context";
import type { AiQueueSlotRenderEnv, AiQueueWorkbenchBusinessContext } from "../../types";

export function AiQueueWidgetTabSlotContent({
  context,
  env,
}: {
  context: AiQueueWorkbenchBusinessContext;
  env: AiQueueSlotRenderEnv;
}) {
  const placement = useAiQueueWidgetPlacementOptional();

  return (
    <WorkbenchWidgetTabSlotContent
      context={context}
      tabId={env.tabId}
      layoutTabs={context.layoutTabs}
      editMode={context.editMode}
      isWidgetId={isAiQueueWidgetId}
      buildWidget={({ widgetId, context: ctx, widgetModes, setWidgetMode }) =>
        buildAiQueueWidget(widgetId, {
          context: ctx,
          boardId: "content",
          widgetModes,
          setWidgetMode,
        })
      }
      placement={placement}
      loadWidgetViewModes={(widgetIds) => {
        const id = widgetIds[0];
        if (!id || !isAiQueueWidgetId(id)) {
          return {};
        }
        return loadAiQueueWidgetViewModes("content", widgetIds);
      }}
      onWidgetViewModesChange={(modes) => {
        const id = Object.keys(modes)[0];
        if (!id || !isAiQueueWidgetId(id)) {
          return;
        }
        mergeAiQueueWidgetViewModes("content", modes);
      }}
    />
  );
}
