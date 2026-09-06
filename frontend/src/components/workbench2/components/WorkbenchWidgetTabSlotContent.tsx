import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  EditableWidgetBoard,
  type EditableWidgetItem,
  type WidgetViewMode,
} from "./EditableWidgetBoard";
import type { WorkbenchWidgetPlacementValue } from "../types/widget-placement";

export interface WorkbenchWidgetTabSlotContentProps<TContext, TWidgetId extends string> {
  context: TContext;
  tabId: string;
  layoutTabs: Array<{ id: string; widgetId?: string }>;
  editMode: boolean;
  isWidgetId: (id: string) => id is TWidgetId;
  buildWidget: (params: {
    widgetId: TWidgetId;
    context: TContext;
    widgetModes: Record<string, WidgetViewMode>;
    setWidgetMode: (widgetId: string, mode: WidgetViewMode) => void;
    standaloneTab?: boolean;
  }) => EditableWidgetItem | null;
  placement?: Pick<WorkbenchWidgetPlacementValue<string, TWidgetId>, "removeWidget"> | null;
  loadWidgetViewModes?: (widgetIds: string[]) => Record<string, WidgetViewMode>;
  onWidgetViewModesChange?: (modes: Record<string, WidgetViewMode>) => void;
}

export function WorkbenchWidgetTabSlotContent<TContext, TWidgetId extends string>({
  context,
  tabId,
  layoutTabs,
  editMode,
  isWidgetId,
  buildWidget,
  placement,
  loadWidgetViewModes,
  onWidgetViewModesChange,
}: WorkbenchWidgetTabSlotContentProps<TContext, TWidgetId>) {
  const tab = layoutTabs.find((item) => item.id === tabId);
  const widgetId = tab?.widgetId;
  const loadWidgetViewModesRef = useRef(loadWidgetViewModes);
  const onWidgetViewModesChangeRef = useRef(onWidgetViewModesChange);
  loadWidgetViewModesRef.current = loadWidgetViewModes;
  onWidgetViewModesChangeRef.current = onWidgetViewModesChange;

  const [widgetModes, setWidgetModes] = useState<Record<string, WidgetViewMode>>(() => {
    if (!widgetId || !loadWidgetViewModes) {
      return {};
    }
    return loadWidgetViewModes([widgetId]);
  });

  useEffect(() => {
    if (!widgetId || !loadWidgetViewModesRef.current) {
      setWidgetModes({});
      return;
    }
    setWidgetModes(loadWidgetViewModesRef.current([widgetId]));
  }, [widgetId]);

  useEffect(() => {
    onWidgetViewModesChangeRef.current?.(widgetModes);
  }, [widgetModes]);

  const setWidgetMode = (id: string, mode: WidgetViewMode) => {
    setWidgetModes((current) => ({ ...current, [id]: mode }));
  };

  const item = useMemo(() => {
    if (!widgetId || !isWidgetId(widgetId)) {
      return null;
    }
    return buildWidget({ widgetId, context, widgetModes, setWidgetMode, standaloneTab: true });
  }, [buildWidget, context, isWidgetId, widgetId, widgetModes]);

  if (!item) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        未找到组件
      </div>
    );
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden", editMode ? "p-2" : "p-0")}>
      <EditableWidgetBoard
        items={[item]}
        order={[item.id]}
        widgetModes={widgetModes}
        layout="stack"
        editing={editMode}
        onOrderChange={() => undefined}
        onRemoveWidget={
          editMode && placement && widgetId && isWidgetId(widgetId)
            ? () => placement.removeWidget(widgetId)
            : undefined
        }
        useSharedDnd={Boolean(placement && editMode)}
        singleWidgetHost
      />
    </div>
  );
}
