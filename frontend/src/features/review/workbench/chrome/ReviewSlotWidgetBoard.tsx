import { useDroppable } from "@dnd-kit/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { reorderSplitSizes } from "@/components/workbench2/components/resizable-widget-split";
import {
  EditableWidgetBoard,
  type WidgetLayoutMode,
  type WidgetViewMode,
} from "@/components/workbench2/components/EditableWidgetBoard";
import { SchemaSectionsLayoutToggle } from "@/components/workbench/shared/schema-data/SchemaSectionsLayoutToggle";
import { cn } from "@/lib/utils";
import { buildReviewWidget } from "../review-widget-factory";
import { isReviewWidgetId } from "../review-widget-registry";
import { useReviewWidgetPlacementOptional } from "../review-widget-placement-context";
import {
  loadReviewWidgetActiveTab,
  loadReviewWidgetLayout,
  loadReviewWidgetOrder,
  loadReviewWidgetSplitSizes,
  loadReviewWidgetViewModes,
  mergeReviewWidgetViewModes,
  saveReviewWidgetActiveTab,
  saveReviewWidgetLayout,
  saveReviewWidgetOrder,
  saveReviewWidgetSplitSizes,
  type ReviewWidgetBoardId,
} from "../review-widget-board-storage";
import { flattenBoardOrder } from "@/components/workbench2/utils/widget-board-groups";
import { normalizeReviewBoardOrder } from "../panels/review/resolve-review-widgets";
import type { ReviewWorkbenchBusinessContext } from "../types";

interface ReviewSlotWidgetBoardProps {
  boardId: ReviewWidgetBoardId;
  context: ReviewWorkbenchBusinessContext;
  className?: string;
}

export function ReviewSlotWidgetBoard({ boardId, context, className }: ReviewSlotWidgetBoardProps) {
  const placement = useReviewWidgetPlacementOptional();
  const useSharedDnd = Boolean(placement && context.editMode);

  const [localOrder, setLocalOrder] = useState(() => loadReviewWidgetOrder(boardId));
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
      normalizeReviewBoardOrder(boardId, rawOrder, context, {
        hiddenWidgetIds: hiddenSet,
        tabWidgetIds: tabWidgetSet,
        groups: boardGroups,
      }),
    [boardId, boardGroups, context, hiddenSet, rawOrder.join(","), tabWidgetSet],
  );
  const setOrder = useSharedDnd
    ? (next: string[]) => placement!.setBoardOrder(boardId, next)
    : setLocalOrder;

  const [layout, setLayout] = useState<WidgetLayoutMode>(() => loadReviewWidgetLayout(boardId));
  const [activeTab, setActiveTab] = useState(() =>
    loadReviewWidgetActiveTab(
      boardId,
      normalizeReviewBoardOrder(boardId, loadReviewWidgetOrder(boardId), context),
    ),
  );
  const [splitSizes, setSplitSizes] = useState<number[]>([]);
  const [widgetModes, setWidgetModes] = useState<Record<string, WidgetViewMode>>({});
  const lastHydratedOrderKeyRef = useRef<string | null>(null);
  const lastHydratedWidgetIdsKeyRef = useRef<string | null>(null);

  const { setNodeRef, isOver } = useDroppable({
    id: `widget-board-${boardId}`,
    disabled: !useSharedDnd,
    data: { type: "review-widget-board", boardId },
  });

  const setWidgetMode = (widgetId: string, mode: WidgetViewMode) => {
    setWidgetModes((current) => {
      const next = { ...current, [widgetId]: mode };
      mergeReviewWidgetViewModes(boardId, { [widgetId]: mode });
      return next;
    });
  };

  const widgetIdsForBoard = useMemo(() => {
    const ids = flattenBoardOrder(boardOrder, boardGroups);
    for (const entryId of boardOrder) {
      if (isReviewWidgetId(entryId) && !ids.includes(entryId)) {
        ids.push(entryId);
      }
    }
    return ids;
  }, [boardGroups, boardOrder.join(",")]);

  const items = useMemo(
    () =>
      widgetIdsForBoard
        .map((widgetId) =>
          buildReviewWidget(widgetId as Parameters<typeof buildReviewWidget>[0], {
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
    const nextOrder = normalizeReviewBoardOrder(boardId, boardOrder, context, {
      hiddenWidgetIds: hiddenSet,
      tabWidgetIds: tabWidgetSet,
      groups: boardGroups,
    });
    if (nextOrder.join(",") !== boardOrder.join(",") && !useSharedDnd) {
      setLocalOrder(nextOrder);
    }
  }, [boardId, boardOrder.join(","), boardGroups, context, hiddenSet, tabWidgetSet, useSharedDnd]);

  const boardOrderKey = boardOrder.join(",");

  const widgetIdsKey = widgetIdsForBoard.join(",");

  useEffect(() => {
    if (widgetIdsForBoard.length === 0 || lastHydratedWidgetIdsKeyRef.current === widgetIdsKey) {
      return;
    }
    lastHydratedWidgetIdsKeyRef.current = widgetIdsKey;
    setWidgetModes((prev) => {
      const loaded = loadReviewWidgetViewModes(boardId, widgetIdsForBoard);
      return Object.keys(prev).length === 0 ? loaded : { ...loaded, ...prev };
    });
  }, [boardId, widgetIdsForBoard, widgetIdsKey]);

  useEffect(() => {
    if (boardOrder.length === 0 || lastHydratedOrderKeyRef.current === boardOrderKey) {
      return;
    }
    lastHydratedOrderKeyRef.current = boardOrderKey;
    setSplitSizes(loadReviewWidgetSplitSizes(boardId, boardOrder));
  }, [boardId, boardOrder, boardOrderKey]);

  const handleSplitSizesChange = useCallback(
    (sizes: number[]) => {
      setSplitSizes(sizes);
      if (boardOrder.length > 0) {
        saveReviewWidgetSplitSizes(boardId, boardOrder, sizes);
      }
    },
    [boardId, boardOrder],
  );

  function preserveWidgetModes(prevModes: Record<string, WidgetViewMode>, nextOrder: string[]) {
    const next = { ...prevModes };
    for (const widgetId of flattenBoardOrder(nextOrder, boardGroups)) {
      if (!(widgetId in next)) {
        next[widgetId] = "cards";
      }
    }
    return next;
  }

  function handleOrderChange(nextOrder: string[]) {
    if (useSharedDnd) {
      setSplitSizes((prevSizes) => {
        const nextSizes = reorderSplitSizes(boardOrder, prevSizes, nextOrder);
        if (nextOrder.length > 0) {
          saveReviewWidgetSplitSizes(boardId, nextOrder, nextSizes);
        }
        return nextSizes;
      });
      setWidgetModes((prevModes) => preserveWidgetModes(prevModes, nextOrder));
      setOrder(nextOrder);
      return;
    }
    setLocalOrder((prevOrder) => {
      setSplitSizes((prevSizes) => {
        const nextSizes = reorderSplitSizes(prevOrder, prevSizes, nextOrder);
        if (nextOrder.length > 0) {
          saveReviewWidgetSplitSizes(boardId, nextOrder, nextSizes);
        }
        return nextSizes;
      });
      setWidgetModes((prevModes) => preserveWidgetModes(prevModes, nextOrder));
      return nextOrder;
    });
  }

  useEffect(() => {
    if (!useSharedDnd) {
      saveReviewWidgetOrder(boardId, boardOrder);
    }
  }, [boardId, boardOrder.join(","), useSharedDnd]);

  useEffect(() => {
    saveReviewWidgetLayout(boardId, layout);
  }, [boardId, layout]);

  useEffect(() => {
    saveReviewWidgetActiveTab(boardId, activeTab);
  }, [activeTab, boardId]);

  useEffect(() => {
    if (Object.keys(widgetModes).length === 0) {
      return;
    }
    mergeReviewWidgetViewModes(boardId, widgetModes);
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
          onSplitSizesChange={handleSplitSizesChange}
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
                  if (isReviewWidgetId(widgetId)) {
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
