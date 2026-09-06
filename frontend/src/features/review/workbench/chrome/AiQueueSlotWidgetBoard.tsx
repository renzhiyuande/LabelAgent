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
import { buildAiQueueWidget } from "../ai-queue-widget-factory";
import { isAiQueueWidgetId } from "../ai-queue-widget-registry";
import { useAiQueueWidgetPlacementOptional } from "../ai-queue-widget-placement-context";
import {
  loadAiQueueWidgetActiveTab,
  loadAiQueueWidgetLayout,
  loadAiQueueWidgetOrder,
  loadAiQueueWidgetSplitSizes,
  loadAiQueueWidgetViewModes,
  saveAiQueueWidgetActiveTab,
  saveAiQueueWidgetLayout,
  saveAiQueueWidgetOrder,
  saveAiQueueWidgetSplitSizes,
  saveAiQueueWidgetViewModes,
  type AiQueueWidgetBoardId,
} from "../ai-queue-widget-board-storage";
import { flattenBoardOrder } from "@/components/workbench2/utils/widget-board-groups";
import { normalizeAiQueueBoardOrder } from "../panels/ai-queue/resolve-ai-queue-widgets";
import type { AiQueueWorkbenchBusinessContext } from "../types";

interface AiQueueSlotWidgetBoardProps {
  boardId: AiQueueWidgetBoardId;
  context: AiQueueWorkbenchBusinessContext;
  className?: string;
}

export function AiQueueSlotWidgetBoard({ boardId, context, className }: AiQueueSlotWidgetBoardProps) {
  const placement = useAiQueueWidgetPlacementOptional();
  const useSharedDnd = Boolean(placement && context.editMode);

  const [localOrder, setLocalOrder] = useState(() =>
    normalizeAiQueueBoardOrder(boardId, loadAiQueueWidgetOrder(boardId), context),
  );
  const rawOrder = placement ? placement.orders[boardId] : localOrder;
  const hiddenSet = useMemo(
    () => new Set(placement?.hiddenWidgetIds ?? []),
    [placement?.hiddenWidgetIds.join(",")],
  );
  const tabWidgetSet = useMemo(
    () => placement?.tabWidgetIds ?? new Set<string>(),
    [Array.from(placement?.tabWidgetIds ?? []).join(",")],
  );

  const boardGroups = placement?.groups[boardId] ?? {};
  const boardOrder = useMemo(
    () =>
      normalizeAiQueueBoardOrder(boardId, rawOrder, context, {
        hiddenWidgetIds: hiddenSet,
        tabWidgetIds: tabWidgetSet,
        groups: boardGroups,
      }),
    [boardId, boardGroups, context, hiddenSet, rawOrder.join(","), tabWidgetSet],
  );
  const setOrder = useSharedDnd
    ? (next: string[]) => placement!.setBoardOrder(boardId, next)
    : setLocalOrder;

  const [layout, setLayout] = useState<WidgetLayoutMode>(() => loadAiQueueWidgetLayout(boardId));
  const [activeTab, setActiveTab] = useState(() =>
    loadAiQueueWidgetActiveTab(boardId, normalizeAiQueueBoardOrder(boardId, loadAiQueueWidgetOrder(boardId), context)),
  );
  const [splitSizes, setSplitSizes] = useState<number[]>(() =>
    loadAiQueueWidgetSplitSizes(
      boardId,
      normalizeAiQueueBoardOrder(boardId, loadAiQueueWidgetOrder(boardId), context).length,
    ),
  );
  const [widgetModes, setWidgetModes] = useState<Record<string, WidgetViewMode>>(() =>
    loadAiQueueWidgetViewModes(
      boardId,
      normalizeAiQueueBoardOrder(boardId, loadAiQueueWidgetOrder(boardId), context),
    ),
  );
  const prevPaneCountRef = useRef(boardOrder.length);

  const { setNodeRef, isOver } = useDroppable({
    id: `widget-board-${boardId}`,
    disabled: !useSharedDnd,
    data: { type: "ai-queue-widget-board", boardId },
  });

  const setWidgetMode = (widgetId: string, mode: WidgetViewMode) => {
    setWidgetModes((current) => ({ ...current, [widgetId]: mode }));
  };

  const widgetIdsForBoard = useMemo(() => {
    const ids = flattenBoardOrder(boardOrder, boardGroups);
    for (const entryId of boardOrder) {
      if (isAiQueueWidgetId(entryId) && !ids.includes(entryId)) {
        ids.push(entryId);
      }
    }
    return ids;
  }, [boardGroups, boardOrder.join(",")]);

  const items = useMemo(
    () =>
      widgetIdsForBoard
        .map((widgetId) =>
          buildAiQueueWidget(widgetId as Parameters<typeof buildAiQueueWidget>[0], {
            context,
            boardId,
            widgetModes,
            setWidgetMode,
          }),
        )
        .filter((item): item is NonNullable<typeof item> => item != null),
    [boardId, context, widgetIdsForBoard.join(","), widgetModes],
  );

  useEffect(() => {
    if (!placement) {
      return;
    }
    setLocalOrder(placement.orders[boardId]);
  }, [boardId, placement, placement?.orders[boardId].join(",")]);

  useEffect(() => {
    const nextOrder = normalizeAiQueueBoardOrder(boardId, boardOrder, context, {
      hiddenWidgetIds: hiddenSet,
      tabWidgetIds: tabWidgetSet,
      groups: boardGroups,
    });
    if (nextOrder.join(",") !== boardOrder.join(",") && !useSharedDnd) {
      setLocalOrder(nextOrder);
    }
  }, [boardId, boardGroups, boardOrder.join(","), context, hiddenSet, tabWidgetSet, useSharedDnd]);

  useEffect(() => {
    if (prevPaneCountRef.current === boardOrder.length) {
      return;
    }
    prevPaneCountRef.current = boardOrder.length;
    setSplitSizes(loadAiQueueWidgetSplitSizes(boardId, boardOrder.length));
  }, [boardId, boardOrder.length]);

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
    if (!useSharedDnd) {
      saveAiQueueWidgetOrder(boardId, boardOrder);
    }
  }, [boardId, boardOrder.join(","), useSharedDnd]);

  useEffect(() => {
    saveAiQueueWidgetLayout(boardId, layout);
  }, [boardId, layout]);

  useEffect(() => {
    saveAiQueueWidgetActiveTab(boardId, activeTab);
  }, [activeTab, boardId]);

  useEffect(() => {
    saveAiQueueWidgetSplitSizes(boardId, splitSizes);
  }, [boardId, splitSizes]);

  useEffect(() => {
    saveAiQueueWidgetViewModes(boardId, widgetModes);
  }, [boardId, widgetModes]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        className ?? "flex h-full min-h-0 flex-1 flex-col overflow-hidden",
        useSharedDnd && isOver && "ring-2 ring-blue-400/40 ring-inset",
      )}
    >
      {context.editMode ? (
        <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2 px-0.5">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            「题目上下文」与「标注结果」为独立组件，可拖动手柄换序；按住 Shift（或 Alt）拖到另一组件上可合并
          </p>
          <SchemaSectionsLayoutToggle value={layout} onChange={setLayout} />
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-hidden p-0">
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
          groups={placement?.groups[boardId]}
          onGroupLayoutChange={
            placement ? (groupId, nextLayout) => placement.updateGroup(boardId, groupId, { layout: nextLayout }) : undefined
          }
          onGroupSplitSizesChange={
            placement ? (groupId, sizes) => placement.updateGroup(boardId, groupId, { splitSizes: sizes }) : undefined
          }
          onGroupWidgetIdsReorder={
            placement
              ? (groupId, widgetIds) => placement.reorderGroupWidgets(boardId, groupId, widgetIds)
              : undefined
          }
          onDissolveGroup={placement ? (groupId) => placement.dissolveGroup(boardId, groupId) : undefined}
          useSharedDnd={useSharedDnd}
          widgetMergeModifier={placement?.dragMergeModifier}
          onRemoveWidget={
            useSharedDnd && placement
              ? (widgetId) => {
                  if (isAiQueueWidgetId(widgetId)) {
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
