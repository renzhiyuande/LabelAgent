import { isWidgetGroupEntry, parseWidgetGroupEntry } from "@/components/workbench2/utils/widget-board-groups";
import {
  ALL_REVIEW_WIDGET_IDS,
  defaultBoardForReviewWidget,
  isReviewWidgetId,
} from "./review-widget-registry";
import {
  defaultReviewWidgetOrders,
  loadReviewWidgetGroups,
  loadReviewWidgetOrder,
  type ReviewWidgetBoardId,
} from "./review-widget-board-storage";
import { collectWidgetsFromBoardOrder, removeGroupedWidgetDuplicates } from "./review-widget-order-utils";
import { reviewDefaultTabWidgetIds } from "./review-widget-layout-defaults";

const BOARD_IDS: ReviewWidgetBoardId[] = ["content", "review", "ai"];

function readStoredBoardOrder(boardId: ReviewWidgetBoardId): string[] {
  return loadReviewWidgetOrder(boardId).filter((id) => isReviewWidgetId(id) || isWidgetGroupEntry(id));
}

function collectPlacedWidgetIds(
  orders: Record<ReviewWidgetBoardId, string[]>,
  groups: Record<ReviewWidgetBoardId, Record<string, import("@/components/workbench2/utils/widget-board-groups").WidgetBoardGroup>>,
): Set<string> {
  const placed = new Set<string>();
  for (const boardId of BOARD_IDS) {
    for (const widgetId of collectWidgetsFromBoardOrder(orders[boardId], groups[boardId])) {
      placed.add(widgetId);
    }
  }
  return placed;
}

function ensureDefaultWidgets(
  orders: Record<ReviewWidgetBoardId, string[]>,
): Record<ReviewWidgetBoardId, string[]> {
  const groups = loadReviewWidgetGroups();
  const next: Record<ReviewWidgetBoardId, string[]> = {
    content: [...orders.content],
    review: [...orders.review],
    ai: [...orders.ai],
  };
  const placed = collectPlacedWidgetIds(next, groups);
  const tabWidgetSet = new Set<string>(reviewDefaultTabWidgetIds);

  for (const widgetId of ALL_REVIEW_WIDGET_IDS) {
    if (placed.has(widgetId) || tabWidgetSet.has(widgetId)) {
      continue;
    }
    const board = defaultBoardForReviewWidget(widgetId);
    if (board) {
      next[board] = [...next[board], widgetId];
      placed.add(widgetId);
    }
  }

  return next;
}

function dedupeCrossBoardWidgets(
  orders: Record<ReviewWidgetBoardId, string[]>,
): Record<ReviewWidgetBoardId, string[]> {
  const seen = new Set<string>();
  const next: Record<ReviewWidgetBoardId, string[]> = {
    content: [],
    review: [],
    ai: [],
  };

  for (const boardId of BOARD_IDS) {
    for (const widgetId of orders[boardId]) {
      if (seen.has(widgetId)) {
        continue;
      }
      seen.add(widgetId);
      next[boardId].push(widgetId);
    }
  }

  return next;
}

export function loadReviewWidgetOrdersFromStorage(): Record<ReviewWidgetBoardId, string[]> {
  const raw: Record<ReviewWidgetBoardId, string[]> = {
    content: readStoredBoardOrder("content"),
    review: readStoredBoardOrder("review"),
    ai: readStoredBoardOrder("ai"),
  };

  const ensured = ensureDefaultWidgets(raw);
  const groups = loadReviewWidgetGroups();
  const sanitized: Record<ReviewWidgetBoardId, string[]> = {
    content: removeGroupedWidgetDuplicates(ensured.content, groups.content),
    review: removeGroupedWidgetDuplicates(ensured.review, groups.review),
    ai: removeGroupedWidgetDuplicates(ensured.ai, groups.ai),
  };
  return dedupeCrossBoardWidgets(sanitized);
}

export function getDefaultReviewWidgetOrders(): Record<ReviewWidgetBoardId, string[]> {
  return {
    content: [...defaultReviewWidgetOrders.content],
    review: [...defaultReviewWidgetOrders.review],
    ai: [...defaultReviewWidgetOrders.ai],
  };
}

export { BOARD_IDS as REVIEW_WIDGET_BOARD_IDS };
