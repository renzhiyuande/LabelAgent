import { WorkbenchWidgetTabSlotContent } from "@/components/workbench2/components/WorkbenchWidgetTabSlotContent";
import { buildLabelerWidget } from "../labeler-widget-factory";
import { isLabelerBoardWidgetId } from "../labeler-widget-registry";
import { useLabelerWidgetPlacementOptional } from "../labeler-widget-placement-context";
import type { LabelerSlotRenderEnv, LabelerWorkbenchBusinessContext } from "../types";

export function LabelerWidgetTabSlotContent({
  context,
  env,
}: {
  context: LabelerWorkbenchBusinessContext;
  env: LabelerSlotRenderEnv;
}) {
  const placement = useLabelerWidgetPlacementOptional();

  return (
    <WorkbenchWidgetTabSlotContent
      context={context}
      tabId={env.tabId}
      layoutTabs={context.layoutTabs}
      editMode={context.editMode}
      isWidgetId={(id): id is string => isLabelerBoardWidgetId(id, context.formSchema)}
      buildWidget={({ widgetId, context: ctx, widgetModes, setWidgetMode }) =>
        buildLabelerWidget(widgetId, { context: ctx, widgetModes, setWidgetMode })
      }
      placement={placement}
    />
  );
}
