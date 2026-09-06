import type { EditableWidgetItem, WidgetViewMode } from "@/components/workbench2/components/EditableWidgetBoard";
import { AI_QUEUE_WIDGET_DEFINITIONS, type AiQueueWorkbenchWidgetId } from "./ai-queue-widget-registry";
import { SchemaSectionWidgetBody } from "./panels/ai-queue/SchemaSectionWidgetBody";
import { findAiQueueSection } from "./panels/ai-queue/resolve-ai-queue-widgets";
import type { AiQueueWidgetBoardId } from "./ai-queue-widget-board-storage";
import type { AiQueueWorkbenchBusinessContext } from "./types";

export interface BuildAiQueueWidgetOptions {
  context: AiQueueWorkbenchBusinessContext;
  boardId: AiQueueWidgetBoardId;
  widgetModes: Record<string, WidgetViewMode>;
  setWidgetMode: (widgetId: string, mode: WidgetViewMode) => void;
}

export function buildAiQueueWidget(
  widgetId: AiQueueWorkbenchWidgetId,
  options: BuildAiQueueWidgetOptions,
): EditableWidgetItem | null {
  const { context, boardId, widgetModes, setWidgetMode } = options;
  const definition = AI_QUEUE_WIDGET_DEFINITIONS[widgetId];
  const section = findAiQueueSection(context, boardId, widgetId);

  if (!section) {
    return null;
  }

  const defaultViewMode =
    widgetId === "insight-prompt" || widgetId === "insight-raw-response" ? "inline" : "cards";
  const mode = widgetModes[widgetId] ?? defaultViewMode;

  return {
    id: widgetId,
    title: section.title?.trim() || definition.title,
    defaultViewMode,
    viewModeConfigurable: false,
    fillHeight: true,
    body: (
      <SchemaSectionWidgetBody
        section={section}
        viewMode={mode}
        showViewToggle={context.editMode}
        onViewModeChange={(next) => setWidgetMode(widgetId, next)}
        compactHeader
        fillHeight
      />
    ),
    json: section.data ?? null,
  };
}
