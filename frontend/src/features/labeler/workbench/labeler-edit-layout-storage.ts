import type { LabelerWorkbenchViewMode } from "./LabelerSlotFrame";
import { saveLabelerWidgetOrder, type LabelerWidgetBoardId } from "./labeler-widget-board-storage";

const SLOT_MODES_KEY = "labelhub:labeler:slot-modes";

export const defaultLabelerSlotModes: Record<
  "toolbar" | "summary" | "queue" | "payload" | "annotate" | "ai",
  LabelerWorkbenchViewMode
> = {
  toolbar: "inline",
  summary: "cards",
  queue: "inline",
  payload: "inline",
  annotate: "inline",
  ai: "cards",
};

export type LabelerSlotModesState = typeof defaultLabelerSlotModes;

function readJson<T>(key: string, fallback: T): T {
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

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadLabelerSlotModes(): LabelerSlotModesState {
  const stored = readJson<Partial<LabelerSlotModesState> | null>(SLOT_MODES_KEY, null);
  if (!stored) {
    return { ...defaultLabelerSlotModes };
  }
  const next = { ...defaultLabelerSlotModes };
  for (const key of Object.keys(defaultLabelerSlotModes) as Array<keyof LabelerSlotModesState>) {
    const mode = stored[key];
    if (mode === "inline" || mode === "cards" || mode === "json") {
      next[key] = mode;
    }
  }
  return next;
}

export function saveLabelerSlotModes(modes: LabelerSlotModesState): void {
  writeJson(SLOT_MODES_KEY, modes);
}

export function clearLabelerSlotModesStorage(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(SLOT_MODES_KEY);
}

export function persistLabelerWidgetOrders(orders: Record<LabelerWidgetBoardId, string[]>): void {
  const boards: LabelerWidgetBoardId[] = ["payload", "annotate", "ai"];
  for (const boardId of boards) {
    saveLabelerWidgetOrder(boardId, orders[boardId]);
  }
}
