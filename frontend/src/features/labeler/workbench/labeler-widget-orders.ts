import type { FormSchema } from "@/low-code/schema/types";
import { readHiddenWidgetIds } from "@/components/workbench2/utils/hidden-widget-storage";
import { isLabelerBoardWidgetId } from "./labeler-widget-registry";
import { loadLabelerRenderPrefs } from "./labeler-render-prefs";
import {
  getClassicDefaultOrders,
  resolveLabelerWidgetOrders,
} from "./labeler-section-widget-orders";
import {
  defaultLabelerWidgetOrders,
  loadLabelerWidgetOrder,
  type LabelerWidgetBoardId,
} from "./labeler-widget-board-storage";

const AI_REVIEW_WIDGET_ID = "ai-review" as const;
const HIDDEN_WIDGETS_STORAGE_KEY = "labelhub:labeler:widget-board:hidden";
const BOARD_IDS: LabelerWidgetBoardId[] = ["payload", "annotate", "ai"];

let widgetOrderLoaderContext: {
  formSchema: FormSchema | null;
  templateVersionId?: number | null;
} = {
  formSchema: null,
  templateVersionId: null,
};

export function configureLabelerWidgetOrderLoader(
  formSchema: FormSchema | null,
  templateVersionId?: number | null,
): void {
  widgetOrderLoaderContext = { formSchema, templateVersionId };
}

function readStoredBoardOrder(boardId: LabelerWidgetBoardId): string[] {
  const { formSchema } = widgetOrderLoaderContext;
  const prefs = loadLabelerRenderPrefs(widgetOrderLoaderContext.templateVersionId);
  return loadLabelerWidgetOrder(boardId).filter((id) => isLabelerBoardWidgetId(id, formSchema));
}

function dedupeAiReviewWidget(
  orders: Record<LabelerWidgetBoardId, string[]>,
): Record<LabelerWidgetBoardId, string[]> {
  const next: Record<LabelerWidgetBoardId, string[]> = {
    payload: [...orders.payload],
    annotate: [...orders.annotate],
    ai: [...orders.ai],
  };

  const boardsWithReview = BOARD_IDS.filter((boardId) => next[boardId].includes(AI_REVIEW_WIDGET_ID));
  if (boardsWithReview.length <= 1) {
    return next;
  }

  const keepBoard =
    boardsWithReview.find((boardId) => boardId === "payload") ??
    boardsWithReview.find((boardId) => boardId === "annotate") ??
    boardsWithReview.find((boardId) => boardId === "ai") ??
    "payload";

  for (const boardId of BOARD_IDS) {
    if (boardId !== keepBoard) {
      next[boardId] = next[boardId].filter((id) => id !== AI_REVIEW_WIDGET_ID);
    }
  }
  return next;
}

function ensureDefaultWidgets(
  orders: Record<LabelerWidgetBoardId, string[]>,
  hiddenWidgetIds: string[],
): Record<LabelerWidgetBoardId, string[]> {
  const { formSchema } = widgetOrderLoaderContext;
  const prefs = loadLabelerRenderPrefs(widgetOrderLoaderContext.templateVersionId);
  const next: Record<LabelerWidgetBoardId, string[]> = {
    payload: [...orders.payload],
    annotate: [...orders.annotate],
    ai: [...orders.ai],
  };
  const placed = new Set([...next.payload, ...next.annotate, ...next.ai]);
  const availableIds =
    prefs.layoutMode === "sectionWidgets" && formSchema
      ? resolveLabelerWidgetOrders(formSchema, prefs)
      : getClassicDefaultOrders();

  for (const boardId of BOARD_IDS) {
    for (const widgetId of availableIds[boardId]) {
      if (placed.has(widgetId) || hiddenWidgetIds.includes(widgetId)) {
        continue;
      }
      next[boardId] = [...next[boardId], widgetId];
      placed.add(widgetId);
    }
  }

  if (!placed.has("annotate-actions") && !hiddenWidgetIds.includes("annotate-actions")) {
    next.annotate = [...next.annotate, "annotate-actions"];
  }

  return next;
}

export function loadLabelerWidgetOrdersFromStorage(): Record<LabelerWidgetBoardId, string[]> {
  const { formSchema, templateVersionId } = widgetOrderLoaderContext;
  const prefs = loadLabelerRenderPrefs(templateVersionId);
  const hiddenWidgetIds = readHiddenWidgetIds(HIDDEN_WIDGETS_STORAGE_KEY, (id) =>
    isLabelerBoardWidgetId(id, formSchema),
  );

  if (prefs.layoutMode === "sectionWidgets" && formSchema) {
    const resolved = resolveLabelerWidgetOrders(formSchema, prefs);
    return dedupeAiReviewWidget(ensureDefaultWidgets(resolved, hiddenWidgetIds));
  }

  const raw: Record<LabelerWidgetBoardId, string[]> = {
    payload: readStoredBoardOrder("payload"),
    annotate: readStoredBoardOrder("annotate"),
    ai: readStoredBoardOrder("ai"),
  };

  return dedupeAiReviewWidget(ensureDefaultWidgets(raw, hiddenWidgetIds));
}

export function getDefaultLabelerWidgetOrders(): Record<LabelerWidgetBoardId, string[]> {
  const { formSchema, templateVersionId } = widgetOrderLoaderContext;
  const prefs = loadLabelerRenderPrefs(templateVersionId);
  if (prefs.layoutMode === "sectionWidgets" && formSchema) {
    return resolveLabelerWidgetOrders(formSchema, prefs);
  }
  return {
    payload: [...defaultLabelerWidgetOrders.payload],
    annotate: [...defaultLabelerWidgetOrders.annotate],
    ai: [...defaultLabelerWidgetOrders.ai],
  };
}

export {
  applySectionWidgetOrders,
  buildDefaultSectionWidgetOrders,
  resolveLabelerWidgetOrders,
} from "./labeler-section-widget-orders";
