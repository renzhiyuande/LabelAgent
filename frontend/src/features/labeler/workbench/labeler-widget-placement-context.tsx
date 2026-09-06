import type { FormSchema } from "@/low-code/schema/types";
import { reorderSplitSizes } from "@/components/workbench2/components/resizable-widget-split";
import { createWorkbenchWidgetPlacementContext } from "@/components/workbench2/hooks/create-workbench-widget-placement";
import { defaultResolveTargetBoardList } from "@/components/workbench2/utils/widget-placement-helpers";
import { persistLabelerWidgetOrders } from "./labeler-edit-layout-storage";
import { isSectionWidgetId } from "./labeler-section-widget";
import {
  isStaticLabelerWidgetId,
  LABELER_WIDGET_DEFINITIONS,
  listAvailableWidgetIds,
  resolveLabelerWidgetDefinition,
} from "./labeler-widget-registry";
import {
  loadLabelerWidgetSplitSizes,
  saveLabelerWidgetSplitSizes,
  type LabelerWidgetBoardId,
} from "./labeler-widget-board-storage";
import { createDefaultLabelerRenderPrefs, type LabelerRenderPrefs } from "./labeler-render-prefs";
import { loadLabelerWidgetOrdersFromStorage } from "./labeler-widget-orders";

let widgetDefinitionLoader: {
  formSchema: FormSchema | null;
  renderPrefs: LabelerRenderPrefs;
} = {
  formSchema: null,
  renderPrefs: createDefaultLabelerRenderPrefs(),
};

export function configureLabelerWidgetDefinitionLoader(
  formSchema: FormSchema | null,
  renderPrefs: LabelerRenderPrefs,
): void {
  widgetDefinitionLoader = { formSchema, renderPrefs };
}

export type { WorkbenchLayoutBridge as LabelerLayoutBridge } from "@/components/workbench2/types/widget-placement";

const BOARD_IDS = ["payload", "annotate", "ai"] as const satisfies readonly LabelerWidgetBoardId[];
const AI_REVIEW_WIDGET_ID = "ai-review" as const;

function isLabelerBoardId(id: string): id is LabelerWidgetBoardId {
  return id === "payload" || id === "annotate" || id === "ai";
}

function isLabelerBoardWidgetIdForPlacement(id: string): id is string {
  return isStaticLabelerWidgetId(id) || isSectionWidgetId(id);
}

function normalizeLabelerWidgetOrders(
  orders: Record<LabelerWidgetBoardId, string[]>,
): Record<LabelerWidgetBoardId, string[]> {
  const boardsWithReview = BOARD_IDS.filter((boardId) => orders[boardId].includes(AI_REVIEW_WIDGET_ID));
  if (boardsWithReview.length <= 1) {
    return {
      payload: [...orders.payload],
      annotate: [...orders.annotate],
      ai: [...orders.ai],
    };
  }

  const keepBoard =
    boardsWithReview.find((boardId) => boardId === "payload") ??
    boardsWithReview.find((boardId) => boardId === "annotate") ??
    boardsWithReview.find((boardId) => boardId === "ai") ??
    "payload";

  const next: Record<LabelerWidgetBoardId, string[]> = {
    payload: [...orders.payload],
    annotate: [...orders.annotate],
    ai: [...orders.ai],
  };
  for (const boardId of BOARD_IDS) {
    if (boardId !== keepBoard) {
      next[boardId] = next[boardId].filter((id) => id !== AI_REVIEW_WIDGET_ID);
    }
  }
  return next;
}

function persistLabelerBoardSplitSizes(boardId: LabelerWidgetBoardId, order: string[]) {
  if (boardId === "ai" || order.length <= 1) {
    return;
  }
  saveLabelerWidgetSplitSizes(boardId, loadLabelerWidgetSplitSizes(boardId, order.length));
}

const labelerWidgetPlacement = createWorkbenchWidgetPlacementContext<LabelerWidgetBoardId, string>({
  boardIds: BOARD_IDS,
  hiddenStorageKey: "labelhub:labeler:widget-board:hidden",
  isWidgetId: isLabelerBoardWidgetIdForPlacement,
  isBoardId: isLabelerBoardId,
  getWidgetDefinition: (id) => {
    if (isStaticLabelerWidgetId(id)) {
      return LABELER_WIDGET_DEFINITIONS[id];
    }
    const resolved = resolveLabelerWidgetDefinition(
      id,
      widgetDefinitionLoader.formSchema,
      widgetDefinitionLoader.renderPrefs,
    );
    if (resolved) {
      return resolved;
    }
    return {
      id,
      defaultBoard: "payload",
      title: id,
      transferable: isSectionWidgetId(id),
      removable: isSectionWidgetId(id),
    };
  },
  loadInitialOrders: loadLabelerWidgetOrdersFromStorage,
  persistOrders: persistLabelerWidgetOrders,
  normalizeOrders: normalizeLabelerWidgetOrders,
  onBoardOrderChange: (boardId, prevOrder, nextOrder) => {
    if (prevOrder.join(",") !== nextOrder.join(",") && nextOrder.length > 1) {
      saveLabelerWidgetSplitSizes(
        boardId,
        reorderSplitSizes(prevOrder, loadLabelerWidgetSplitSizes(boardId, prevOrder.length), nextOrder),
      );
    }
  },
  onBoardWidgetsChanged: (boardId, _prevOrder, nextOrder) => {
    persistLabelerBoardSplitSizes(boardId, nextOrder);
  },
  canMoveToBoard: (widgetId, targetBoardId) => {
    if (targetBoardId === "ai") {
      return widgetId === AI_REVIEW_WIDGET_ID;
    }
    return isLabelerBoardWidgetIdForPlacement(widgetId);
  },
  resolveTargetBoardList: ({ widgetId, targetBoardId, baseList, overWidgetId }) => {
    if (targetBoardId === "ai") {
      return [AI_REVIEW_WIDGET_ID];
    }
    return defaultResolveTargetBoardList({ widgetId, baseList, overWidgetId });
  },
  defaultAvailableWidgetIds: listAvailableWidgetIds(null, createDefaultLabelerRenderPrefs()),
});

export const LabelerWidgetPlacementProvider = labelerWidgetPlacement.Provider;
export const useLabelerWidgetPlacement = labelerWidgetPlacement.usePlacement;
export const useLabelerWidgetPlacementOptional = labelerWidgetPlacement.usePlacementOptional;
export const useLabelerWidgetDragHandlers = labelerWidgetPlacement.useDragHandlers;
export const clearLabelerHiddenWidgetsStorage = labelerWidgetPlacement.clearHiddenStorage;
