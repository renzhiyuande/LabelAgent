import { reorderSplitSizes } from "@/components/workbench2/components/resizable-widget-split";
import { createWorkbenchWidgetPlacementContext } from "@/components/workbench2/hooks/create-workbench-widget-placement";
import type { WorkbenchLayoutBridge } from "@/components/workbench2/types/widget-placement";
import {
  loadAiQueueWidgetSplitSizes,
  saveAiQueueWidgetOrder,
  saveAiQueueWidgetSplitSizes,
  type AiQueueWidgetBoardId,
} from "./ai-queue-widget-board-storage";
import {
  AI_QUEUE_WIDGET_DEFINITIONS,
  isAiQueueWidgetId,
  type AiQueueWorkbenchWidgetId,
} from "./ai-queue-widget-registry";
import { AI_QUEUE_WIDGET_BOARD_IDS, loadAiQueueWidgetOrdersFromStorage } from "./ai-queue-widget-orders";

export type { WorkbenchLayoutBridge as AiQueueLayoutBridge } from "@/components/workbench2/types/widget-placement";

function isAiQueueBoardId(id: string): id is AiQueueWidgetBoardId {
  return id === "content" || id === "insight";
}

function persistAllAiQueueOrders(orders: Record<AiQueueWidgetBoardId, string[]>) {
  for (const id of AI_QUEUE_WIDGET_BOARD_IDS) {
    saveAiQueueWidgetOrder(id, orders[id]);
  }
}

function persistAiQueueBoardSplitSizes(boardId: AiQueueWidgetBoardId, order: string[]) {
  if (order.length <= 1) {
    return;
  }
  saveAiQueueWidgetSplitSizes(boardId, loadAiQueueWidgetSplitSizes(boardId, order.length));
}

const aiQueueWidgetPlacement = createWorkbenchWidgetPlacementContext<AiQueueWidgetBoardId, AiQueueWorkbenchWidgetId>({
  boardIds: AI_QUEUE_WIDGET_BOARD_IDS,
  widgetGroupsStorageKey: "labelhub:ai-queue:widget-board:groups",
  hiddenStorageKey: "labelhub:ai-queue:widget-board:hidden",
  isWidgetId: isAiQueueWidgetId,
  isBoardId: isAiQueueBoardId,
  getWidgetDefinition: (id) => AI_QUEUE_WIDGET_DEFINITIONS[id],
  loadInitialOrders: loadAiQueueWidgetOrdersFromStorage,
  persistOrders: persistAllAiQueueOrders,
  onBoardOrderChange: (boardId, prevOrder, nextOrder) => {
    if (prevOrder.join(",") !== nextOrder.join(",") && nextOrder.length > 1) {
      saveAiQueueWidgetSplitSizes(
        boardId,
        reorderSplitSizes(prevOrder, loadAiQueueWidgetSplitSizes(boardId, prevOrder.length), nextOrder),
      );
    }
  },
  onBoardWidgetsChanged: (boardId, _prevOrder, nextOrder) => {
    persistAiQueueBoardSplitSizes(boardId, nextOrder);
  },
});

export const AiQueueWidgetPlacementProvider = aiQueueWidgetPlacement.Provider;
export const useAiQueueWidgetPlacement = aiQueueWidgetPlacement.usePlacement;
export const useAiQueueWidgetPlacementOptional = aiQueueWidgetPlacement.usePlacementOptional;
export const useAiQueueWidgetDragHandlers = aiQueueWidgetPlacement.useDragHandlers;
export const clearAiQueueHiddenWidgetsStorage = aiQueueWidgetPlacement.clearHiddenStorage;
