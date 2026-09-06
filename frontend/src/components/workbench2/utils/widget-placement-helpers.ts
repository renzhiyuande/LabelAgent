import type { DragEndEvent } from "@dnd-kit/core";
import type { WorkbenchTabItem } from "../types";
import type { WorkbenchWidgetDefinition, WorkbenchWidgetPlacementConfig } from "../types/widget-placement";
import type { WorkbenchWidgetPaletteItem } from "../components/WorkbenchWidgetPalette";
import type { WidgetBoardGroup } from "./widget-board-groups";
import { findBoardForWidgetInOrder } from "./widget-board-groups";

export function collectTabWidgetIds(tabs: WorkbenchTabItem[]): Set<string> {
  const ids = new Set<string>();
  for (const tab of tabs) {
    if (tab.tabKind === "widget" && tab.widgetId) {
      ids.add(tab.widgetId);
    }
  }
  return ids;
}

export function findBoardForWidget<TBoardId extends string>(
  orders: Record<TBoardId, string[]>,
  boardIds: readonly TBoardId[],
  widgetId: string,
  groupsByBoard?: Record<TBoardId, Record<string, WidgetBoardGroup>>,
): TBoardId | null {
  for (const boardId of boardIds) {
    if (findBoardForWidgetInOrder(orders[boardId], groupsByBoard?.[boardId] ?? {}, widgetId)) {
      return boardId;
    }
  }
  return null;
}

export function removeWidgetFromAllBoards<TBoardId extends string>(
  orders: Record<TBoardId, string[]>,
  boardIds: readonly TBoardId[],
  widgetId: string,
): Record<TBoardId, string[]> {
  const next = { ...orders };
  for (const boardId of boardIds) {
    next[boardId] = orders[boardId].filter((id) => id !== widgetId);
  }
  return next;
}

export function parseWidgetMergeDropId(overId: string): string | null {
  if (!overId.startsWith("widget-merge-")) {
    return null;
  }
  return overId.slice("widget-merge-".length);
}

export function isWidgetMergeDropId(overId: string): boolean {
  return overId.startsWith("widget-merge-");
}

export { isDragMergeModifier } from "./widget-drag-merge-modifier";

export function resolveOverWidgetId(
  event: DragEndEvent,
  activeId: string,
  isWidgetId: (id: string) => boolean,
): string | null {
  const overId = event.over ? String(event.over.id) : null;
  if (overId) {
    const mergeTarget = parseWidgetMergeDropId(overId);
    if (mergeTarget && isWidgetId(mergeTarget) && mergeTarget !== activeId) {
      return mergeTarget;
    }
    if (isWidgetId(overId) && overId !== activeId) {
      return overId;
    }
  }
  for (const collision of event.collisions ?? []) {
    const id = String(collision.id);
    const mergeTarget = parseWidgetMergeDropId(id);
    if (mergeTarget && isWidgetId(mergeTarget) && mergeTarget !== activeId) {
      return mergeTarget;
    }
    if (isWidgetId(id) && id !== activeId) {
      return id;
    }
  }
  return null;
}

export function parseWidgetBoardDropId(overId: string): string | null {
  if (!overId.startsWith("widget-board-")) {
    return null;
  }
  return overId.replace("widget-board-", "");
}

export function parseTabDropzoneRegionId(overId: string): string | null {
  if (!overId.startsWith("dropzone-")) {
    return null;
  }
  return overId.replace("dropzone-", "");
}

export function buildWidgetPaletteItems<TBoardId extends string, TWidgetId extends string>(params: {
  orders: Record<TBoardId, string[]>;
  boardIds: readonly TBoardId[];
  tabWidgetIds: Set<string>;
  hiddenWidgetIds: string[];
  widgetIds: readonly TWidgetId[];
  getWidgetDefinition: (id: TWidgetId) => WorkbenchWidgetDefinition;
  transferableOnly?: boolean;
}): WorkbenchWidgetPaletteItem[] {
  const { orders, boardIds, tabWidgetIds, hiddenWidgetIds, widgetIds, getWidgetDefinition, transferableOnly = true } =
    params;

  return widgetIds
    .filter((widgetId) => !transferableOnly || getWidgetDefinition(widgetId).transferable)
    .map((widgetId) => {
      const onBoard = Boolean(findBoardForWidget(orders, boardIds, widgetId));
      const onTab = tabWidgetIds.has(widgetId);
      const hidden = hiddenWidgetIds.includes(widgetId);
      return {
        id: widgetId,
        title: getWidgetDefinition(widgetId).title,
        placed: onBoard || onTab,
        hidden,
        onTab,
      };
    });
}

export function defaultResolveTargetBoardList(params: {
  widgetId: string;
  baseList: string[];
  overWidgetId?: string;
}): string[] {
  const targetList = [...params.baseList.filter((id) => id !== params.widgetId)];
  if (params.overWidgetId && targetList.includes(params.overWidgetId)) {
    targetList.splice(targetList.indexOf(params.overWidgetId), 0, params.widgetId);
  } else {
    targetList.push(params.widgetId);
  }
  return targetList;
}

export type WorkbenchWidgetPlacementConfigShape<TBoardId extends string, TWidgetId extends string> =
  WorkbenchWidgetPlacementConfig<TBoardId, TWidgetId>;
