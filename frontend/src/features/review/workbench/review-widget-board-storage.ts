import type { WidgetLayoutMode, WidgetViewMode } from "@/components/workbench2/components/EditableWidgetBoard";
import { normalizeSplitSizes } from "@/components/workbench2/components/resizable-widget-split";
import {
  parseWidgetGroupEntry,
  readWidgetBoardGroups,
  writeWidgetBoardGroups,
  type WidgetBoardGroup,
} from "@/components/workbench2/utils/widget-board-groups";
import { removeGroupedWidgetDuplicates } from "./review-widget-order-utils";
import { migrateReviewWidgetOrder } from "./panels/review/resolve-review-widgets";
import {
  REVIEW_CONTENT_PRIMARY_GROUP_ID,
  reviewWidgetLayoutDefaults,
} from "./review-widget-layout-defaults";
import { isReviewWidgetId, type ReviewWorkbenchWidgetId } from "./review-widget-registry";

const REVIEW_WIDGET_BOARD_IDS: ReviewWidgetBoardId[] = ["content", "review", "ai"];

export type ReviewWidgetBoardId = "content" | "review" | "ai";

const STORAGE_PREFIX = "labelhub:review:widget-board";
const GROUPS_STORAGE_KEY = `${STORAGE_PREFIX}:groups`;
const CONFIG_VERSION_KEY = `${STORAGE_PREFIX}:config-version`;
/** 递增后应用 reviewWidgetLayoutDefaults 快照 */
const WIDGET_BOARD_CONFIG_VERSION = 3;

export const defaultReviewWidgetOrders: Record<ReviewWidgetBoardId, string[]> = {
  content: [...reviewWidgetLayoutDefaults.content.order],
  review: [...reviewWidgetLayoutDefaults.review.order],
  ai: [...reviewWidgetLayoutDefaults.ai.order],
};

export const defaultReviewWidgetLayouts: Partial<Record<ReviewWidgetBoardId, WidgetLayoutMode>> = {
  content: reviewWidgetLayoutDefaults.content.layout,
  review: reviewWidgetLayoutDefaults.review.layout,
  ai: reviewWidgetLayoutDefaults.ai.layout,
};

export const defaultReviewWidgetActiveTabs: Partial<Record<ReviewWidgetBoardId, string>> = {
  content: reviewWidgetLayoutDefaults.content.activeTab,
  review: reviewWidgetLayoutDefaults.review.activeTab,
  ai: reviewWidgetLayoutDefaults.ai.activeTab,
};

export const defaultReviewWidgetViewModes: Partial<Record<ReviewWorkbenchWidgetId, WidgetViewMode>> = {
  ...reviewWidgetLayoutDefaults.content.viewModes,
  "content-annotate": "inline",
  ...reviewWidgetLayoutDefaults.review.viewModes,
  ...reviewWidgetLayoutDefaults.ai.viewModes,
};

export const defaultReviewWidgetGroups: Record<ReviewWidgetBoardId, Record<string, WidgetBoardGroup>> = {
  content: { ...reviewWidgetLayoutDefaults.content.groups },
  review: { ...reviewWidgetLayoutDefaults.review.groups },
  ai: { ...reviewWidgetLayoutDefaults.ai.groups },
};

export const defaultReviewWidgetSplitSizes: Record<ReviewWidgetBoardId, number[]> = {
  content: [...reviewWidgetLayoutDefaults.content.splitSizes],
  review: [...reviewWidgetLayoutDefaults.review.splitSizes],
  ai: [...reviewWidgetLayoutDefaults.ai.splitSizes],
};

const REVIEW_WIDGET_SPLIT_WEIGHTS: Record<string, number> = {
  "content-header": 0.06,
  [REVIEW_CONTENT_PRIMARY_GROUP_ID]: 0.94,
  "content-payload": 0.2,
  "content-annotate": 0.42,
  "content-annotate-diff": 0.16,
  "content-annotate-timeline": 0.12,
  "review-header": 0.12,
  "review-comment": 0.68,
  "review-actions": 0.2,
  "ai-dimensions": 0.55,
  "ai-verdict": 0.45,
};

export function resolveReviewWidgetSplitSizes(boardId: ReviewWidgetBoardId, order: string[]): number[] {
  const preset = defaultReviewWidgetSplitSizes[boardId];
  if (preset && preset.length === order.length) {
    const total = preset.reduce((sum, size) => sum + size, 0);
    if (total > 0) {
      return preset.map((size) => size / total);
    }
  }

  if (order.length === 0) {
    return [];
  }
  const weights = order.map((entryId) => {
    const groupId = parseWidgetGroupEntry(entryId);
    if (groupId) {
      return REVIEW_WIDGET_SPLIT_WEIGHTS[groupId] ?? 0.88;
    }
    if (isReviewWidgetId(entryId)) {
      return REVIEW_WIDGET_SPLIT_WEIGHTS[entryId] ?? 1;
    }
    return 1;
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) {
    return equalPaneSizes(order.length);
  }
  return weights.map((weight) => weight / total);
}

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

type ReviewSplitStorage = Record<string, number[]>;

export function reviewBoardOrderKey(order: string[]): string {
  return order.join("|");
}

function readSplitStorage(boardId: ReviewWidgetBoardId): ReviewSplitStorage | number[] | null {
  return readJsonStorage<ReviewSplitStorage | number[] | null>(`${STORAGE_PREFIX}:${boardId}:splits`, null);
}

function seedReviewWidgetBoardDefaults(): void {
  for (const boardId of REVIEW_WIDGET_BOARD_IDS) {
    const preset = reviewWidgetLayoutDefaults[boardId];
    saveReviewWidgetLayout(boardId, preset.layout);
    saveReviewWidgetOrder(boardId, preset.order);
    saveReviewWidgetActiveTab(boardId, preset.activeTab);
    saveReviewWidgetSplitSizes(boardId, preset.order, preset.splitSizes);
    saveReviewWidgetViewModes(boardId, preset.viewModes);
  }
  writeWidgetBoardGroups(GROUPS_STORAGE_KEY, defaultReviewWidgetGroups);
}

function migrateReviewWidgetBoardConfig(): void {
  if (typeof window === "undefined") {
    return;
  }
  const currentVersion = readJsonStorage(CONFIG_VERSION_KEY, 0);
  if (currentVersion >= WIDGET_BOARD_CONFIG_VERSION) {
    return;
  }
  seedReviewWidgetBoardDefaults();
  writeJsonStorage(CONFIG_VERSION_KEY, WIDGET_BOARD_CONFIG_VERSION);
}

function resolveBoardGroups(
  stored: Record<ReviewWidgetBoardId, Record<string, WidgetBoardGroup>>,
  boardId: ReviewWidgetBoardId,
): Record<string, WidgetBoardGroup> {
  const boardStored = stored[boardId];
  return Object.keys(boardStored).length > 0 ? boardStored : defaultReviewWidgetGroups[boardId];
}

export function loadReviewWidgetGroups(): Record<ReviewWidgetBoardId, Record<string, WidgetBoardGroup>> {
  migrateReviewWidgetBoardConfig();
  const stored = readWidgetBoardGroups(GROUPS_STORAGE_KEY, REVIEW_WIDGET_BOARD_IDS);
  return {
    content: resolveBoardGroups(stored, "content"),
    review: resolveBoardGroups(stored, "review"),
    ai: resolveBoardGroups(stored, "ai"),
  };
}

export function loadReviewWidgetOrder(boardId: ReviewWidgetBoardId): string[] {
  migrateReviewWidgetBoardConfig();
  const stored = readJsonStorage(`${STORAGE_PREFIX}:${boardId}:order`, defaultReviewWidgetOrders[boardId]);
  const storedGroups = readWidgetBoardGroups(GROUPS_STORAGE_KEY, REVIEW_WIDGET_BOARD_IDS);
  const groups = resolveBoardGroups(storedGroups, boardId);
  const migrated = migrateReviewWidgetOrder(boardId, stored, groups);
  return removeGroupedWidgetDuplicates(migrated, groups);
}

export function saveReviewWidgetOrder(boardId: ReviewWidgetBoardId, order: string[]): void {
  writeJsonStorage(`${STORAGE_PREFIX}:${boardId}:order`, order);
}

export function loadReviewWidgetLayout(boardId: ReviewWidgetBoardId): WidgetLayoutMode {
  migrateReviewWidgetBoardConfig();
  return readJsonStorage(`${STORAGE_PREFIX}:${boardId}:layout`, defaultReviewWidgetLayouts[boardId] ?? "stack");
}

export function saveReviewWidgetLayout(boardId: ReviewWidgetBoardId, layout: WidgetLayoutMode): void {
  writeJsonStorage(`${STORAGE_PREFIX}:${boardId}:layout`, layout);
}

export function loadReviewWidgetActiveTab(boardId: ReviewWidgetBoardId, order: string[]): string {
  migrateReviewWidgetBoardConfig();
  const fallback = defaultReviewWidgetActiveTabs[boardId] ?? order[0] ?? "";
  const stored = readJsonStorage<string>(`${STORAGE_PREFIX}:${boardId}:active-tab`, fallback);
  if (order.includes(stored)) {
    return stored;
  }
  if (order.includes(fallback)) {
    return fallback;
  }
  return order[0] ?? "";
}

export function saveReviewWidgetActiveTab(boardId: ReviewWidgetBoardId, tabId: string): void {
  writeJsonStorage(`${STORAGE_PREFIX}:${boardId}:active-tab`, tabId);
}

function readReviewWidgetViewModesStorage(
  boardId: ReviewWidgetBoardId,
): Record<string, WidgetViewMode> {
  return readJsonStorage<Record<string, WidgetViewMode>>(`${STORAGE_PREFIX}:${boardId}:widget-modes`, {});
}

function normalizeWidgetViewMode(mode: string | undefined): WidgetViewMode {
  return mode === "inline" || mode === "cards" || mode === "json" ? mode : "cards";
}

export function loadReviewWidgetViewModes(
  boardId: ReviewWidgetBoardId,
  widgetIds: string[],
): Record<string, WidgetViewMode> {
  const stored = readReviewWidgetViewModesStorage(boardId);
  const modes: Record<string, WidgetViewMode> = {};
  for (const id of widgetIds) {
    const candidate = stored[id] ?? defaultReviewWidgetViewModes[id as ReviewWorkbenchWidgetId];
    modes[id] = normalizeWidgetViewMode(candidate);
  }
  return modes;
}

export function saveReviewWidgetViewModes(boardId: ReviewWidgetBoardId, modes: Record<string, WidgetViewMode>): void {
  writeJsonStorage(`${STORAGE_PREFIX}:${boardId}:widget-modes`, modes);
}

/** 合并写入，避免独立 tab 等局部保存冲掉同看板其它 widget 的显示模式 */
export function mergeReviewWidgetViewModes(
  boardId: ReviewWidgetBoardId,
  patch: Record<string, WidgetViewMode>,
): void {
  if (Object.keys(patch).length === 0) {
    return;
  }
  const stored = readReviewWidgetViewModesStorage(boardId);
  saveReviewWidgetViewModes(boardId, { ...stored, ...patch });
}

export function loadReviewWidgetSplitSizes(boardId: ReviewWidgetBoardId, order: string[]): number[] {
  if (order.length === 0) {
    return [];
  }

  const orderKey = reviewBoardOrderKey(order);
  const stored = readSplitStorage(boardId);

  if (stored && !Array.isArray(stored)) {
    const keyed = stored[orderKey];
    if (keyed && keyed.length === order.length) {
      return normalizeSplitSizes(keyed, order.length);
    }
  }

  // 兼容旧版：仅按 pane 数量存的数组
  if (Array.isArray(stored) && stored.length === order.length) {
    const total = stored.reduce((sum, size) => sum + size, 0);
    if (total > 0) {
      const legacy = normalizeSplitSizes(
        stored.map((size) => size / total),
        order.length,
      );
      saveReviewWidgetSplitSizes(boardId, order, legacy);
      return legacy;
    }
  }

  return resolveReviewWidgetSplitSizes(boardId, order);
}

export function saveReviewWidgetSplitSizes(
  boardId: ReviewWidgetBoardId,
  order: string[],
  sizes: number[],
): void {
  if (order.length === 0 || sizes.length !== order.length) {
    return;
  }
  const raw = readSplitStorage(boardId);
  const bucket: ReviewSplitStorage = Array.isArray(raw) ? {} : { ...(raw ?? {}) };
  bucket[reviewBoardOrderKey(order)] = sizes;
  writeJsonStorage(`${STORAGE_PREFIX}:${boardId}:splits`, bucket);
}

export function clearReviewWidgetBoardStorage(): void {
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
  seedReviewWidgetBoardDefaults();
  writeJsonStorage(CONFIG_VERSION_KEY, WIDGET_BOARD_CONFIG_VERSION);
}
