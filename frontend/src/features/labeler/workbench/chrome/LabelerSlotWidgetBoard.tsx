import { useDroppable } from "@dnd-kit/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { reorderSplitSizes } from "@/components/workbench2/components/resizable-widget-split";
import {
  EditableWidgetBoard,
  type WidgetLayoutMode,
  type WidgetViewMode,
} from "@/components/workbench2/components/EditableWidgetBoard";
import { SchemaSectionsLayoutToggle } from "@/components/workbench/shared/schema-data/SchemaSectionsLayoutToggle";
import { cn } from "@/lib/utils";
import { buildLabelerWidget } from "../labeler-widget-factory";
import {
  isLabelerBoardWidgetId,
  isLabelerWidgetRemovable,
} from "../labeler-widget-registry";
import { useLabelerWidgetPlacementOptional } from "../labeler-widget-placement-context";
import type { LabelerWidgetBoardId } from "../labeler-widget-board-storage";
import {
  loadLabelerWidgetActiveTab,
  loadLabelerWidgetLayout,
  loadLabelerWidgetOrder,
  loadLabelerWidgetSplitSizes,
  loadLabelerWidgetViewModes,
  saveLabelerWidgetActiveTab,
  saveLabelerWidgetLayout,
  saveLabelerWidgetOrder,
  saveLabelerWidgetSplitSizes,
  saveLabelerWidgetViewModes,
} from "../labeler-widget-board-storage";
import type { LabelerWorkbenchBusinessContext } from "../types";

interface LabelerSlotWidgetBoardProps {
  boardId: LabelerWidgetBoardId;
  context: LabelerWorkbenchBusinessContext;
  className?: string;
}

export function LabelerSlotWidgetBoard({ boardId, context, className }: LabelerSlotWidgetBoardProps) {
  const placement = useLabelerWidgetPlacementOptional();
  const useSharedDnd = Boolean(placement && context.editMode);

  const [localOrder, setLocalOrder] = useState(() => loadLabelerWidgetOrder(boardId));
  const rawOrder = placement ? placement.orders[boardId] : localOrder;
  const boardOrder = useMemo(() => {
    if (boardId === "ai") {
      return rawOrder.filter((id) => id === "ai-review");
    }
    return rawOrder;
  }, [boardId, rawOrder.join(",")]);
  const setOrder = useSharedDnd
    ? (next: string[]) => placement!.setBoardOrder(boardId, next)
    : setLocalOrder;

  const [layout, setLayout] = useState<WidgetLayoutMode>(() => loadLabelerWidgetLayout(boardId));
  const [activeTab, setActiveTab] = useState(() => loadLabelerWidgetActiveTab(boardId, loadLabelerWidgetOrder(boardId)));
  const [splitSizes, setSplitSizes] = useState<number[]>(() =>
    loadLabelerWidgetSplitSizes(boardId, loadLabelerWidgetOrder(boardId).length),
  );
  const [widgetModes, setWidgetModes] = useState<Record<string, WidgetViewMode>>(() =>
    loadLabelerWidgetViewModes(boardId, loadLabelerWidgetOrder(boardId)),
  );
  const prevPaneCountRef = useRef(boardOrder.length);

  const { setNodeRef, isOver } = useDroppable({
    id: `widget-board-${boardId}`,
    disabled: !useSharedDnd,
    data: { type: "labeler-widget-board", boardId },
  });

  const setWidgetMode = (widgetId: string, mode: WidgetViewMode) => {
    setWidgetModes((current) => ({ ...current, [widgetId]: mode }));
  };

  const items = useMemo(
    () =>
      boardOrder
        .map((widgetId) =>
          isLabelerBoardWidgetId(widgetId, context.formSchema)
            ? buildLabelerWidget(widgetId, { context, widgetModes, setWidgetMode })
            : null,
        )
        .filter((item): item is NonNullable<typeof item> => item != null),
    [boardOrder, context, widgetModes],
  );

  useEffect(() => {
    if (!placement) {
      return;
    }
    setLocalOrder(placement.orders[boardId]);
  }, [boardId, placement, placement?.orders[boardId].join(",")]);

  useEffect(() => {
    if (prevPaneCountRef.current === boardOrder.length) {
      return;
    }
    prevPaneCountRef.current = boardOrder.length;
    setSplitSizes(loadLabelerWidgetSplitSizes(boardId, boardOrder.length));
  }, [boardId, boardOrder.length]);

  useEffect(() => {
    setWidgetModes((current) => {
      const loaded = loadLabelerWidgetViewModes(boardId, boardOrder);
      const next: Record<string, WidgetViewMode> = {};
      for (const id of boardOrder) {
        next[id] = current[id] ?? loaded[id] ?? "cards";
      }
      return next;
    });
  }, [boardId, boardOrder.join(",")]);

  function handleOrderChange(nextOrder: string[]) {
    if (useSharedDnd) {
      setSplitSizes((prevSizes) => reorderSplitSizes(boardOrder, prevSizes, nextOrder));
      setWidgetModes((prevModes) => {
        const next: Record<string, WidgetViewMode> = {};
        for (const id of nextOrder) {
          next[id] = prevModes[id] ?? "cards";
        }
        return next;
      });
      setOrder(nextOrder);
      return;
    }
    setLocalOrder((prevOrder) => {
      setSplitSizes((prevSizes) => reorderSplitSizes(prevOrder, prevSizes, nextOrder));
      setWidgetModes((prevModes) => {
        const next: Record<string, WidgetViewMode> = {};
        for (const id of nextOrder) {
          next[id] = prevModes[id] ?? "cards";
        }
        return next;
      });
      return nextOrder;
    });
  }

  useEffect(() => {
    saveLabelerWidgetOrder(boardId, boardOrder);
  }, [boardId, boardOrder.join(",")]);

  useEffect(() => {
    saveLabelerWidgetLayout(boardId, layout);
  }, [boardId, layout]);

  useEffect(() => {
    saveLabelerWidgetActiveTab(boardId, activeTab);
  }, [activeTab, boardId]);

  useEffect(() => {
    saveLabelerWidgetSplitSizes(boardId, splitSizes);
  }, [boardId, splitSizes]);

  useEffect(() => {
    saveLabelerWidgetViewModes(boardId, widgetModes);
  }, [boardId, widgetModes]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        className ?? "flex h-full min-h-0 flex-1 flex-col overflow-hidden",
        useSharedDnd && isOver && "ring-2 ring-blue-400/40 ring-inset",
      )}
    >
      {context.editMode && boardId === "ai" && items.length > 0 ? (
        <p className="mb-2 shrink-0 text-[11px] text-slate-500 dark:text-slate-400">
          拖左侧手柄可将「AI 审核」移到题面或作答区
        </p>
      ) : null}
      {context.editMode && boardId !== "ai" ? (
        <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2 px-0.5">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            拖动手柄调整顺序，可拖到题面/作答/AI 洞察等区域；退出编辑后可拖动分割线调整比例
          </p>
          <SchemaSectionsLayoutToggle value={layout} onChange={setLayout} />
        </div>
      ) : null}
      <div
        className={cn(
          "min-h-0 flex-1 overflow-hidden",
          boardId === "ai" && context.editMode && items.length === 0 && "min-h-[160px]",
        )}
      >
        {boardId === "ai" && context.editMode && items.length === 0 ? (
          <p className="mb-2 px-1 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
            将「AI 审核」组件拖入此区域
          </p>
        ) : null}
        <EditableWidgetBoard
          items={items}
          order={boardOrder}
          widgetModes={widgetModes}
          layout={layout}
          editing={context.editMode}
          onOrderChange={handleOrderChange}
          activeTabId={activeTab}
          onActiveTabChange={setActiveTab}
          splitSizes={splitSizes}
          onSplitSizesChange={setSplitSizes}
          useSharedDnd={useSharedDnd}
          onRemoveWidget={
            useSharedDnd && placement
              ? (widgetId) => {
                  if (
                    isLabelerWidgetRemovable(widgetId, context.formSchema, context.renderPrefs)
                  ) {
                    placement.removeWidget(widgetId);
                  }
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
