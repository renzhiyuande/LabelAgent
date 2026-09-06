"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const WIDGET_GROUP_CHILD_SORT_TYPE = "widget-group-child";

export function isWidgetGroupChildSortDrag(data: { current?: unknown } | undefined): boolean {
  return (data?.current as { type?: string } | undefined)?.type === WIDGET_GROUP_CHILD_SORT_TYPE;
}

interface WidgetGroupChildrenSortableProps {
  widgetIds: string[];
  editing: boolean;
  onReorder?: (widgetIds: string[]) => void;
  children: ReactNode;
  className?: string;
}

export function WidgetGroupChildrenSortable({
  widgetIds,
  editing,
  onReorder,
  children,
  className,
}: WidgetGroupChildrenSortableProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!editing || !onReorder || widgetIds.length < 2) {
    return <div className={cn("h-full min-h-0 w-full overflow-hidden", className)}>{children}</div>;
  }

  const handleReorder = onReorder;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = widgetIds.indexOf(String(active.id));
    const newIndex = widgetIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
      return;
    }
    handleReorder(arrayMove(widgetIds, oldIndex, newIndex));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
        <div className={cn("h-full min-h-0 w-full overflow-hidden", className)}>{children}</div>
      </SortableContext>
    </DndContext>
  );
}
