import type { FormSchema } from "@/low-code/schema/types";
import type { LabelerRenderPrefs } from "./labeler-render-prefs";
import {
  buildSectionWidgetId,
  defaultBoardForSectionWidget,
  isSectionWidgetId,
  resolveSectionSurface,
} from "./labeler-section-widget";
import {
  defaultLabelerWidgetOrders,
  loadLabelerWidgetOrder,
  saveLabelerWidgetOrder,
  type LabelerWidgetBoardId,
} from "./labeler-widget-board-storage";
import { isStaticLabelerWidgetId } from "./labeler-widget-registry";

const BOARD_IDS: LabelerWidgetBoardId[] = ["payload", "annotate", "ai"];

export function buildDefaultSectionWidgetOrders(
  formSchema: FormSchema,
  prefs: LabelerRenderPrefs,
): Record<LabelerWidgetBoardId, string[]> {
  const orders: Record<LabelerWidgetBoardId, string[]> = {
    payload: [],
    annotate: [],
    ai: [],
  };

  for (const section of formSchema.sections) {
    const config = prefs.sectionWidgets?.[section.key];
    if (config?.visible === false) {
      continue;
    }
    const surface = resolveSectionSurface(section, config?.surface);
    orders[defaultBoardForSectionWidget(surface)].push(buildSectionWidgetId(section.key));
  }

  if (!orders.annotate.includes("annotate-actions")) {
    orders.annotate.push("annotate-actions");
  }

  return orders;
}

export function applySectionWidgetOrders(
  formSchema: FormSchema,
  prefs: LabelerRenderPrefs,
): Record<LabelerWidgetBoardId, string[]> {
  const orders = buildDefaultSectionWidgetOrders(formSchema, prefs);
  for (const boardId of BOARD_IDS) {
    saveLabelerWidgetOrder(boardId, orders[boardId]);
  }
  return orders;
}

function filterStoredOrder(
  boardId: LabelerWidgetBoardId,
  order: string[],
  formSchema: FormSchema | null,
  layoutMode: LabelerRenderPrefs["layoutMode"],
): string[] {
  return order.filter((widgetId) => {
    if (isStaticLabelerWidgetId(widgetId)) {
      if (layoutMode === "sectionWidgets") {
        return widgetId === "annotate-actions" || widgetId === "ai-review";
      }
      return true;
    }
    if (layoutMode !== "sectionWidgets" || !isSectionWidgetId(widgetId) || !formSchema) {
      return false;
    }
    const sectionKey = widgetId.slice("section:".length);
    return formSchema.sections.some((section) => section.key === sectionKey);
  });
}

export function resolveLabelerWidgetOrders(
  formSchema: FormSchema | null,
  prefs: LabelerRenderPrefs,
): Record<LabelerWidgetBoardId, string[]> {
  if (prefs.layoutMode !== "sectionWidgets" || !formSchema) {
    return {
      payload: filterStoredOrder("payload", loadLabelerWidgetOrder("payload"), formSchema, "classic"),
      annotate: filterStoredOrder("annotate", loadLabelerWidgetOrder("annotate"), formSchema, "classic"),
      ai: filterStoredOrder("ai", loadLabelerWidgetOrder("ai"), formSchema, "classic"),
    };
  }

  const stored: Record<LabelerWidgetBoardId, string[]> = {
    payload: filterStoredOrder("payload", loadLabelerWidgetOrder("payload"), formSchema, "sectionWidgets"),
    annotate: filterStoredOrder("annotate", loadLabelerWidgetOrder("annotate"), formSchema, "sectionWidgets"),
    ai: filterStoredOrder("ai", loadLabelerWidgetOrder("ai"), formSchema, "sectionWidgets"),
  };

  const hasSectionWidget = BOARD_IDS.some((boardId) =>
    stored[boardId].some((widgetId) => isSectionWidgetId(widgetId)),
  );
  if (!hasSectionWidget) {
    return buildDefaultSectionWidgetOrders(formSchema, prefs);
  }

  const placed = new Set(BOARD_IDS.flatMap((boardId) => stored[boardId]));
  const defaults = buildDefaultSectionWidgetOrders(formSchema, prefs);
  const next: Record<LabelerWidgetBoardId, string[]> = {
    payload: [...stored.payload],
    annotate: [...stored.annotate],
    ai: [...stored.ai],
  };

  for (const boardId of BOARD_IDS) {
    for (const widgetId of defaults[boardId]) {
      if (!placed.has(widgetId)) {
        next[boardId].push(widgetId);
        placed.add(widgetId);
      }
    }
  }

  if (!next.annotate.includes("annotate-actions")) {
    next.annotate.push("annotate-actions");
  }

  return next;
}

export function getClassicDefaultOrders(): Record<LabelerWidgetBoardId, string[]> {
  return {
    payload: [...defaultLabelerWidgetOrders.payload],
    annotate: [...defaultLabelerWidgetOrders.annotate],
    ai: [...defaultLabelerWidgetOrders.ai],
  };
}
