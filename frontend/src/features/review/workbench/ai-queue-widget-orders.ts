import {
  ALL_AI_QUEUE_WIDGET_IDS,
  defaultBoardForAiQueueWidget,
  isAiQueueWidgetId,
} from "./ai-queue-widget-registry";
import {
  defaultAiQueueWidgetOrders,
  loadAiQueueWidgetOrder,
  type AiQueueWidgetBoardId,
} from "./ai-queue-widget-board-storage";

const BOARD_IDS: AiQueueWidgetBoardId[] = ["content", "insight"];

function readStoredBoardOrder(boardId: AiQueueWidgetBoardId): string[] {
  return loadAiQueueWidgetOrder(boardId).filter((id) => isAiQueueWidgetId(id));
}

function ensureDefaultWidgets(
  orders: Record<AiQueueWidgetBoardId, string[]>,
): Record<AiQueueWidgetBoardId, string[]> {
  const next: Record<AiQueueWidgetBoardId, string[]> = {
    content: [...orders.content],
    insight: [...orders.insight],
  };
  const placed = new Set([...next.content, ...next.insight]);

  for (const widgetId of ALL_AI_QUEUE_WIDGET_IDS) {
    if (placed.has(widgetId)) {
      continue;
    }
    const board = defaultBoardForAiQueueWidget(widgetId);
    if (board) {
      next[board] = [...next[board], widgetId];
      placed.add(widgetId);
    }
  }

  return next;
}

function dedupeCrossBoardWidgets(
  orders: Record<AiQueueWidgetBoardId, string[]>,
): Record<AiQueueWidgetBoardId, string[]> {
  const seen = new Set<string>();
  const next: Record<AiQueueWidgetBoardId, string[]> = {
    content: [],
    insight: [],
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

export function loadAiQueueWidgetOrdersFromStorage(): Record<AiQueueWidgetBoardId, string[]> {
  const raw: Record<AiQueueWidgetBoardId, string[]> = {
    content: readStoredBoardOrder("content"),
    insight: readStoredBoardOrder("insight"),
  };

  return dedupeCrossBoardWidgets(ensureDefaultWidgets(raw));
}

export function getDefaultAiQueueWidgetOrders(): Record<AiQueueWidgetBoardId, string[]> {
  return {
    content: [...defaultAiQueueWidgetOrders.content],
    insight: [...defaultAiQueueWidgetOrders.insight],
  };
}

export { BOARD_IDS as AI_QUEUE_WIDGET_BOARD_IDS };
