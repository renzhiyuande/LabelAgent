import { reorderSplitSizes } from "@/components/workbench2/components/resizable-widget-split";
import { createWorkbenchWidgetPlacementContext } from "@/components/workbench2/hooks/create-workbench-widget-placement";
import type { WorkbenchLayoutBridge } from "@/components/workbench2/types/widget-placement";
import {
  loadReviewWidgetGroups,
  loadReviewWidgetSplitSizes,
  saveReviewWidgetOrder,
  saveReviewWidgetSplitSizes,
  type ReviewWidgetBoardId,
} from "./review-widget-board-storage";
import {
  REVIEW_WIDGET_DEFINITIONS,
  isReviewWidgetId,
  type ReviewWorkbenchWidgetId,
} from "./review-widget-registry";
import { REVIEW_WIDGET_BOARD_IDS, loadReviewWidgetOrdersFromStorage } from "./review-widget-orders";

export type { WorkbenchLayoutBridge as ReviewLayoutBridge } from "@/components/workbench2/types/widget-placement";

function isReviewBoardId(id: string): id is ReviewWidgetBoardId {
  return id === "content" || id === "review" || id === "ai";
}

function persistAllReviewOrders(orders: Record<ReviewWidgetBoardId, string[]>) {
  for (const id of REVIEW_WIDGET_BOARD_IDS) {
    saveReviewWidgetOrder(id, orders[id]);
  }
}

function persistReviewBoardSplitSizes(boardId: ReviewWidgetBoardId, order: string[]) {
  if (order.length <= 1) {
    return;
  }
  saveReviewWidgetSplitSizes(boardId, order, loadReviewWidgetSplitSizes(boardId, order));
}

const reviewWidgetPlacement = createWorkbenchWidgetPlacementContext<ReviewWidgetBoardId, ReviewWorkbenchWidgetId>({
  boardIds: REVIEW_WIDGET_BOARD_IDS,
  widgetGroupsStorageKey: "labelhub:review:widget-board:groups",
  loadInitialGroups: loadReviewWidgetGroups,
  hiddenStorageKey: "labelhub:review:widget-board:hidden",
  isWidgetId: isReviewWidgetId,
  isBoardId: isReviewBoardId,
  getWidgetDefinition: (id) => REVIEW_WIDGET_DEFINITIONS[id],
  loadInitialOrders: loadReviewWidgetOrdersFromStorage,
  persistOrders: persistAllReviewOrders,
  onBoardOrderChange: (boardId, prevOrder, nextOrder) => {
    if (prevOrder.join(",") !== nextOrder.join(",") && nextOrder.length > 1) {
      saveReviewWidgetSplitSizes(
        boardId,
        nextOrder,
        reorderSplitSizes(prevOrder, loadReviewWidgetSplitSizes(boardId, prevOrder), nextOrder),
      );
    }
  },
  onBoardWidgetsChanged: (boardId, _prevOrder, nextOrder) => {
    persistReviewBoardSplitSizes(boardId, nextOrder);
  },
});

export const ReviewWidgetPlacementProvider = reviewWidgetPlacement.Provider;
export const useReviewWidgetPlacement = reviewWidgetPlacement.usePlacement;
export const useReviewWidgetPlacementOptional = reviewWidgetPlacement.usePlacementOptional;
export const useReviewWidgetDragHandlers = reviewWidgetPlacement.useDragHandlers;
export const clearReviewHiddenWidgetsStorage = reviewWidgetPlacement.clearHiddenStorage;
