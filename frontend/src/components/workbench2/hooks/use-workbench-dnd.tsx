import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useCallback, useState, type ReactNode } from "react";
import type {
  WorkbenchDraggableData,
  WorkbenchDroppableData,
  WorkbenchGlobalDragState,
  WorkbenchRegionId,
  WorkbenchTabItem,
} from "../types";
import {
  moveTabToRegionAtIndex,
  normalizeAllTabIndices,
  reorderTabsInRegion,
} from "../utils/layout-dnd-operations";
import { readWidgetDragMergeModifier } from "../utils/widget-drag-merge-modifier";
import { isWidgetGroupChildSortDrag } from "../components/WidgetGroupChildSortable";

const IDLE_DRAG_STATE: WorkbenchGlobalDragState = {
  mode: "idle",
  activeTabId: null,
  sourceRegionId: null,
  currentHoverOverRegionId: null,
  previewInsertIndex: null,
};

export interface WorkbenchWidgetDragHandlers {
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => boolean | void;
  isWidgetId: (id: string) => boolean;
}

/** @deprecated 使用 WorkbenchWidgetDragHandlers */
export type LabelerWidgetDragHandlers = WorkbenchWidgetDragHandlers;

export interface UseWorkbenchGlobalDragOptions {
  tabs: WorkbenchTabItem[];
  onTabsChange: (tabs: WorkbenchTabItem[]) => void;
  enableCrossRegion?: boolean;
  bodyRegionOrder?: Array<Extract<WorkbenchRegionId, "left" | "center" | "right">>;
  onBodyRegionOrderChange?: (
    bodyRegionOrder: Array<Extract<WorkbenchRegionId, "left" | "center" | "right">>,
  ) => void;
  /** Widget 拖放，与 Tab 共用同一 DndContext */
  widgetDrag?: WorkbenchWidgetDragHandlers;
  /** @deprecated 使用 widgetDrag */
  labelerWidgetDrag?: WorkbenchWidgetDragHandlers;
}

function isWidgetBoardCollisionId(id: string | number): boolean {
  return String(id).startsWith("widget-board-");
}

function isTabDropzoneCollisionId(id: string | number): boolean {
  return String(id).startsWith("dropzone-");
}

function isWidgetDropTargetCollisionId(id: string | number): boolean {
  return isWidgetBoardCollisionId(id) || isTabDropzoneCollisionId(id);
}

function isWidgetDragActive(
  active: DragStartEvent["active"],
  widgetDrag?: WorkbenchWidgetDragHandlers,
): boolean {
  if (isWidgetGroupChildSortDrag(active.data)) {
    return false;
  }
  const data = active.data.current as { type?: string } | undefined;
  if (data?.type === "workbench-widget-item") {
    return true;
  }
  return widgetDrag?.isWidgetId(String(active.id)) ?? false;
}

function filterOtherWidgetHits(
  hits: ReturnType<typeof pointerWithin>,
  activeId: string,
  isWidgetId: (id: string) => boolean,
) {
  return hits.filter((entry) => isWidgetId(String(entry.id)) && String(entry.id) !== activeId);
}

function filterMergeDropHits(hits: ReturnType<typeof pointerWithin>, activeId: string) {
  return hits.filter((entry) => {
    const id = String(entry.id);
    if (!id.startsWith("widget-merge-")) {
      return false;
    }
    const targetWidgetId = id.slice("widget-merge-".length);
    return targetWidgetId !== activeId;
  });
}

function createWidgetCollisionDetection(isWidgetId: (id: string) => boolean): CollisionDetection {
  return (args) => {
    const activeId = String(args.active.id);

    if (readWidgetDragMergeModifier()) {
      const mergeHits = filterMergeDropHits(pointerWithin(args), activeId);
      if (mergeHits.length > 0) {
        return mergeHits;
      }
    }

    const pointerHits = filterOtherWidgetHits(pointerWithin(args), activeId, isWidgetId);
    if (pointerHits.length > 0) {
      return pointerHits;
    }

    const boardHits = pointerWithin(args).filter((entry) => isWidgetDropTargetCollisionId(entry.id));
    if (boardHits.length > 0) {
      return boardHits;
    }

    const rectWidgetHits = filterOtherWidgetHits(rectIntersection(args), activeId, isWidgetId);
    if (rectWidgetHits.length > 0) {
      return rectWidgetHits;
    }

    const rectBoardHits = rectIntersection(args).filter((entry) => isWidgetDropTargetCollisionId(entry.id));
    if (rectBoardHits.length > 0) {
      return rectBoardHits;
    }

    return closestCenter(args);
  };
}

export function useWorkbenchGlobalDrag({
  tabs,
  onTabsChange,
  enableCrossRegion = true,
  bodyRegionOrder,
  onBodyRegionOrderChange,
  labelerWidgetDrag,
  widgetDrag: widgetDragOption,
}: UseWorkbenchGlobalDragOptions) {
  const widgetDrag = widgetDragOption ?? labelerWidgetDrag;
  const [dragState, setDragState] = useState<WorkbenchGlobalDragState>(IDLE_DRAG_STATE);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const collisionDetection = useCallback<CollisionDetection>(
    (args) => {
      if (isWidgetDragActive(args.active, widgetDrag)) {
        return createWidgetCollisionDetection(widgetDrag?.isWidgetId ?? (() => false))(args);
      }
      const tabIds = new Set(tabs.map((tab) => tab.id));
      const all = closestCenter(args);
      const tabHits = all.filter((entry) => tabIds.has(String(entry.id)));
      if (tabHits.length > 0) {
        return tabHits;
      }
      return all;
    },
    [tabs, widgetDrag],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      widgetDrag?.onDragStart(event);
      if (isWidgetDragActive(event.active, widgetDrag)) {
        return;
      }
      const data = event.active.data.current as WorkbenchDraggableData | undefined;
      if (data?.type === "workbench-tab-item") {
        setDragState({
          mode: "dragging-tab-item",
          activeTabId: data.tabId,
          sourceRegionId: data.sourceRegionId,
          currentHoverOverRegionId: data.sourceRegionId,
          previewInsertIndex: null,
        });
      }
    },
    [widgetDrag],
  );

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      if (isWidgetDragActive(event.active, widgetDrag)) {
        return;
      }
      const data = event.active.data.current as WorkbenchDraggableData | undefined;
      if (data?.type !== "workbench-tab-item") {
        return;
      }
      if (!event.over) {
        setDragState((state) => ({
          ...state,
          currentHoverOverRegionId: null,
          previewInsertIndex: null,
        }));
        return;
      }
      const overData = event.over.data.current as WorkbenchDroppableData | undefined;
      if (overData?.type === "workbench-tab-container") {
        setDragState((state) => ({
          ...state,
          currentHoverOverRegionId: overData.regionId,
        }));
      }
    },
    [widgetDrag],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (isWidgetDragActive(active, widgetDrag)) {
        widgetDrag?.onDragEnd(event);
        setDragState(IDLE_DRAG_STATE);
        return;
      }

      const data = active.data.current as
        | WorkbenchDraggableData
        | { type: "workbench-body-region"; regionId: Extract<WorkbenchRegionId, "left" | "center" | "right"> }
        | undefined;

      setDragState(IDLE_DRAG_STATE);

      if (!data || !over) {
        return;
      }

      if (data.type === "workbench-body-region") {
        if (!bodyRegionOrder || !onBodyRegionOrderChange || active.id === over.id) {
          return;
        }
        const oldIndex = bodyRegionOrder.indexOf(String(active.id) as Extract<WorkbenchRegionId, "left" | "center" | "right">);
        const newIndex = bodyRegionOrder.indexOf(String(over.id) as Extract<WorkbenchRegionId, "left" | "center" | "right">);
        if (oldIndex < 0 || newIndex < 0) {
          return;
        }
        onBodyRegionOrderChange(arrayMove(bodyRegionOrder, oldIndex, newIndex));
        return;
      }

      if (data.type !== "workbench-tab-item") {
        return;
      }

      const overData = over.data.current as WorkbenchDroppableData | WorkbenchDraggableData | undefined;
      const overTab = tabs.find((tab) => tab.id === String(over.id));
      const targetRegionId =
        overData?.type === "workbench-tab-container"
          ? overData.regionId
          : overTab?.regionId ?? null;

      if (enableCrossRegion && targetRegionId && targetRegionId !== data.sourceRegionId) {
        const targetIndex = overTab?.regionId === targetRegionId ? overTab.index : undefined;
        onTabsChange(moveTabToRegionAtIndex(tabs, data.tabId, targetRegionId, targetIndex));
        return;
      }

      if (active.id !== over.id && data.sourceRegionId) {
        onTabsChange(reorderTabsInRegion(tabs, data.sourceRegionId, String(active.id), String(over.id)));
      }
    },
    [bodyRegionOrder, enableCrossRegion, onBodyRegionOrderChange, onTabsChange, tabs, widgetDrag],
  );

  return {
    dragState,
    sensors,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    DndContext,
    DragOverlay,
    collisionDetection,
    normalizeAllTabIndices,
  };
}

export type WorkbenchDndProviderProps = {
  children: ReactNode;
  overlay?: ReactNode;
} & ReturnType<typeof useWorkbenchGlobalDrag>;

export function WorkbenchDndProvider({
  children,
  overlay,
  sensors,
  handleDragStart,
  handleDragMove,
  handleDragEnd,
  DndContext: DndContextComponent,
  DragOverlay: DragOverlayComponent,
  collisionDetection,
}: WorkbenchDndProviderProps) {
  return (
    <DndContextComponent
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      {children}
      <DragOverlayComponent>{overlay}</DragOverlayComponent>
    </DndContextComponent>
  );
}
