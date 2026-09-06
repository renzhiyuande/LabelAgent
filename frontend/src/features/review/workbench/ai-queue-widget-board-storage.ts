import type { WidgetLayoutMode, WidgetViewMode } from "@/components/workbench2/components/EditableWidgetBoard";
import type { AiQueueWorkbenchWidgetId } from "./ai-queue-widget-registry";

export type AiQueueWidgetBoardId = "content" | "insight";

const STORAGE_PREFIX = "labelhub:ai-queue:widget-board";

export const defaultAiQueueWidgetOrders: Record<AiQueueWidgetBoardId, string[]> = {
  content: ["content-payload", "content-annotate"],
  insight: ["insight-dimensions", "insight-verdict", "insight-prompt", "insight-raw-response", "insight-timeline"],
};

export const defaultAiQueueWidgetLayouts: Partial<Record<AiQueueWidgetBoardId, WidgetLayoutMode>> = {
  content: "stack",
  insight: "stack",
};

export const defaultAiQueueWidgetViewModes: Partial<Record<AiQueueWorkbenchWidgetId, WidgetViewMode>> = {
  "content-payload": "cards",
  "content-annotate": "cards",
  "insight-dimensions": "cards",
  "insight-verdict": "cards",
  "insight-prompt": "inline",
  "insight-raw-response": "inline",
  "insight-timeline": "cards",
};

export const defaultAiQueueWidgetSplitRatios: Record<AiQueueWidgetBoardId, number[]> = {
  content: [0.55, 0.45],
  insight: [0.28, 0.22, 0.16, 0.16, 0.18],
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

function equalPaneSizes(paneCount: number): number[] {
  return Array.from({ length: Math.max(paneCount, 0) }, () => 1 / Math.max(paneCount, 1));
}

export function loadAiQueueWidgetOrder(boardId: AiQueueWidgetBoardId): string[] {
  return readJsonStorage(`${STORAGE_PREFIX}:${boardId}:order`, defaultAiQueueWidgetOrders[boardId]);
}

export function saveAiQueueWidgetOrder(boardId: AiQueueWidgetBoardId, order: string[]): void {
  writeJsonStorage(`${STORAGE_PREFIX}:${boardId}:order`, order);
}

export function loadAiQueueWidgetLayout(boardId: AiQueueWidgetBoardId): WidgetLayoutMode {
  return readJsonStorage(`${STORAGE_PREFIX}:${boardId}:layout`, defaultAiQueueWidgetLayouts[boardId] ?? "stack");
}

export function saveAiQueueWidgetLayout(boardId: AiQueueWidgetBoardId, layout: WidgetLayoutMode): void {
  writeJsonStorage(`${STORAGE_PREFIX}:${boardId}:layout`, layout);
}

export function loadAiQueueWidgetActiveTab(boardId: AiQueueWidgetBoardId, order: string[]): string {
  const stored = readJsonStorage<string>(`${STORAGE_PREFIX}:${boardId}:active-tab`, order[0] ?? "");
  return order.includes(stored) ? stored : (order[0] ?? "");
}

export function saveAiQueueWidgetActiveTab(boardId: AiQueueWidgetBoardId, tabId: string): void {
  writeJsonStorage(`${STORAGE_PREFIX}:${boardId}:active-tab`, tabId);
}

function readAiQueueWidgetViewModesStorage(
  boardId: AiQueueWidgetBoardId,
): Record<string, WidgetViewMode> {
  return readJsonStorage<Record<string, WidgetViewMode>>(`${STORAGE_PREFIX}:${boardId}:widget-modes`, {});
}

function normalizeWidgetViewMode(mode: string | undefined): WidgetViewMode {
  return mode === "inline" || mode === "cards" || mode === "json" ? mode : "cards";
}

export function loadAiQueueWidgetViewModes(
  boardId: AiQueueWidgetBoardId,
  widgetIds: string[],
): Record<string, WidgetViewMode> {
  const stored = readAiQueueWidgetViewModesStorage(boardId);
  const modes: Record<string, WidgetViewMode> = {};
  for (const id of widgetIds) {
    const candidate = stored[id] ?? defaultAiQueueWidgetViewModes[id as AiQueueWorkbenchWidgetId];
    modes[id] = normalizeWidgetViewMode(candidate);
  }
  return modes;
}

export function saveAiQueueWidgetViewModes(boardId: AiQueueWidgetBoardId, modes: Record<string, WidgetViewMode>): void {
  writeJsonStorage(`${STORAGE_PREFIX}:${boardId}:widget-modes`, modes);
}

export function mergeAiQueueWidgetViewModes(
  boardId: AiQueueWidgetBoardId,
  patch: Record<string, WidgetViewMode>,
): void {
  if (Object.keys(patch).length === 0) {
    return;
  }
  const stored = readAiQueueWidgetViewModesStorage(boardId);
  saveAiQueueWidgetViewModes(boardId, { ...stored, ...patch });
}

export function loadAiQueueWidgetSplitSizes(boardId: AiQueueWidgetBoardId, paneCount: number): number[] {
  const stored = readJsonStorage<number[] | null>(`${STORAGE_PREFIX}:${boardId}:splits`, null);
  const fallback = defaultAiQueueWidgetSplitRatios[boardId];
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

export function saveAiQueueWidgetSplitSizes(boardId: AiQueueWidgetBoardId, sizes: number[]): void {
  writeJsonStorage(`${STORAGE_PREFIX}:${boardId}:splits`, sizes);
}

export function clearAiQueueWidgetBoardStorage(): void {
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
