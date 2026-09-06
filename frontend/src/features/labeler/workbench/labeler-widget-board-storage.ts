import type { WidgetLayoutMode, WidgetViewMode } from "@/components/workbench2/components/EditableWidgetBoard";
import type { LabelerWorkbenchWidgetId } from "./labeler-widget-registry";

export type LabelerWidgetBoardId = "payload" | "annotate" | "ai";

const STORAGE_PREFIX = "labelhub:labeler:widget-board";

export type LabelerAnnotateWidgetId = "annotate-main" | "annotate-actions";
export type LabelerPayloadWidgetId = "payload-main" | "ai-review";

export const defaultLabelerWidgetOrders: Record<LabelerWidgetBoardId, string[]> = {
  payload: ["payload-main"],
  annotate: ["annotate-main", "annotate-actions"],
  ai: ["ai-review"],
};

export const defaultLabelerWidgetLayouts: Partial<Record<LabelerWidgetBoardId, WidgetLayoutMode>> = {
  payload: "row",
  annotate: "stack",
  ai: "stack",
};

export const defaultLabelerWidgetViewModes: Partial<Record<LabelerWorkbenchWidgetId, WidgetViewMode>> = {
  "payload-main": "inline",
  "ai-review": "cards",
  "annotate-main": "cards",
  "annotate-actions": "cards",
};

export const defaultLabelerWidgetSplitRatios: Record<LabelerWidgetBoardId, number[]> = {
  payload: [1],
  annotate: [0.78, 0.22],
  ai: [1],
};

function readJsonStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key: string, value: unknown): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadLabelerWidgetOrder(boardId: LabelerWidgetBoardId): string[] {
  return readJsonStorage(`${STORAGE_PREFIX}:${boardId}:order`, defaultLabelerWidgetOrders[boardId]);
}

export function saveLabelerWidgetOrder(boardId: LabelerWidgetBoardId, order: string[]): void {
  writeJsonStorage(`${STORAGE_PREFIX}:${boardId}:order`, order);
}

export function loadLabelerWidgetLayout(boardId: LabelerWidgetBoardId): WidgetLayoutMode {
  return readJsonStorage(`${STORAGE_PREFIX}:${boardId}:layout`, defaultLabelerWidgetLayouts[boardId] ?? "stack");
}

export function saveLabelerWidgetLayout(boardId: LabelerWidgetBoardId, layout: WidgetLayoutMode): void {
  writeJsonStorage(`${STORAGE_PREFIX}:${boardId}:layout`, layout);
}

export function loadLabelerWidgetActiveTab(boardId: LabelerWidgetBoardId, order: string[]): string {
  const stored = readJsonStorage<string>(`${STORAGE_PREFIX}:${boardId}:active-tab`, order[0] ?? "");
  return order.includes(stored) ? stored : (order[0] ?? "");
}

export function saveLabelerWidgetActiveTab(boardId: LabelerWidgetBoardId, tabId: string): void {
  writeJsonStorage(`${STORAGE_PREFIX}:${boardId}:active-tab`, tabId);
}

export function loadLabelerWidgetViewModes(
  boardId: LabelerWidgetBoardId,
  widgetIds: string[],
): Record<string, WidgetViewMode> {
  const stored = readJsonStorage<Record<string, WidgetViewMode> | null>(`${STORAGE_PREFIX}:${boardId}:widget-modes`, null);
  const modes: Record<string, WidgetViewMode> = {};
  for (const id of widgetIds) {
    const candidate = stored?.[id] ?? defaultLabelerWidgetViewModes[id as LabelerWorkbenchWidgetId];
    modes[id] = candidate === "inline" || candidate === "cards" || candidate === "json" ? candidate : "cards";
  }
  return modes;
}

export function saveLabelerWidgetViewModes(boardId: LabelerWidgetBoardId, modes: Record<string, WidgetViewMode>): void {
  writeJsonStorage(`${STORAGE_PREFIX}:${boardId}:widget-modes`, modes);
}

export function loadLabelerWidgetSplitSizes(boardId: LabelerWidgetBoardId, paneCount: number): number[] {
  const stored = readJsonStorage<number[] | null>(`${STORAGE_PREFIX}:${boardId}:splits`, null);
  const fallback = defaultLabelerWidgetSplitRatios[boardId];
  if (!stored || stored.length !== paneCount || paneCount <= 0) {
    if (fallback && fallback.length === paneCount) {
      const total = fallback.reduce((sum, size) => sum + size, 0);
      return total > 0 ? fallback.map((size) => size / total) : equalPaneSizes(paneCount);
    }
    return equalPaneSizes(paneCount);
  }
  const total = stored.reduce((sum, size) => sum + size, 0);
  if (total <= 0) {
    return equalPaneSizes(paneCount);
  }
  return stored.map((size) => size / total);
}

function equalPaneSizes(paneCount: number): number[] {
  return Array.from({ length: Math.max(paneCount, 0) }, () => 1 / Math.max(paneCount, 1));
}

export function saveLabelerWidgetSplitSizes(boardId: LabelerWidgetBoardId, sizes: number[]): void {
  writeJsonStorage(`${STORAGE_PREFIX}:${boardId}:splits`, sizes);
}

export function clearLabelerWidgetBoardStorage(): void {
  if (typeof window === "undefined") {
    return;
  }
  const keys: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(STORAGE_PREFIX)) {
      keys.push(key);
    }
  }
  keys.forEach((key) => window.localStorage.removeItem(key));
}

