import type {
  WorkbenchGlobalLayoutState,
  WorkbenchRegionDefinition,
  WorkbenchRegionId,
  WorkbenchRegionState,
  WorkbenchTabItem,
  WorkbenchV2Schema,
} from "../types";
import { normalizeAllTabIndices } from "./layout-dnd-operations";

export interface RawWorkbenchGlobalLayoutState {
  regions?: Partial<Record<WorkbenchRegionId, Partial<WorkbenchRegionState>>>;
  bodyRegionOrder?: Array<WorkbenchRegionId>;
  tabs?: Partial<WorkbenchTabItem>[];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeRegionState(
  definition: WorkbenchRegionDefinition,
  incoming: Partial<WorkbenchRegionState> | undefined,
): WorkbenchRegionState {
  return {
    id: definition.id,
    collapsed: definition.collapsible === false ? false : Boolean(incoming?.collapsed),
    size: clamp(
      typeof incoming?.size === "number" ? incoming.size : definition.defaultSize,
      definition.minSize,
      definition.maxSize,
    ),
    activeTabId: typeof incoming?.activeTabId === "string" ? incoming.activeTabId : null,
  };
}

function isValidRegionId(value: unknown): value is WorkbenchTabItem["regionId"] {
  return value === "top" || value === "left" || value === "center" || value === "right";
}

/** 以 schema 默认 tabs 为基准，仅覆盖 localStorage 里保存的区域/顺序，避免刷新后 tab 归位 */
function mergeWorkbenchTabs(
  storedTabs: Partial<WorkbenchTabItem>[] | undefined,
  defaultTabs: WorkbenchTabItem[],
): WorkbenchTabItem[] {
  const storedById = new Map<string, Partial<WorkbenchTabItem>>();
  for (const tab of storedTabs ?? []) {
    if (typeof tab?.id === "string") {
      storedById.set(tab.id, tab);
    }
  }

  const merged: WorkbenchTabItem[] = defaultTabs.map((defaultTab) => {
    const stored = storedById.get(defaultTab.id);
    if (!stored) {
      return defaultTab;
    }
    return {
      ...defaultTab,
      regionId: isValidRegionId(stored.regionId) ? stored.regionId : defaultTab.regionId,
      index: typeof stored.index === "number" ? stored.index : defaultTab.index,
      pinned: Boolean(stored.pinned),
      tabKind: stored.tabKind === "widget" ? "widget" : defaultTab.tabKind,
      widgetId: typeof stored.widgetId === "string" ? stored.widgetId : defaultTab.widgetId,
    };
  });

  for (const stored of storedById.values()) {
    if (
      typeof stored.id === "string" &&
      !merged.some((tab) => tab.id === stored.id) &&
      typeof stored.slotId === "string" &&
      typeof stored.label === "string" &&
      isValidRegionId(stored.regionId)
    ) {
      merged.push({
        id: stored.id,
        slotId: stored.slotId,
        label: stored.label,
        regionId: stored.regionId,
        index: typeof stored.index === "number" ? stored.index : merged.length,
        pinned: Boolean(stored.pinned),
        tabKind: stored.tabKind === "widget" ? "widget" : undefined,
        widgetId: typeof stored.widgetId === "string" ? stored.widgetId : undefined,
      });
    }
  }

  return normalizeAllTabIndices(merged);
}

function fallbackActiveTabs(
  regions: Record<WorkbenchRegionId, WorkbenchRegionState>,
  tabs: WorkbenchTabItem[],
): Record<WorkbenchRegionId, WorkbenchRegionState> {
  const nextRegions = { ...regions };

  (Object.keys(nextRegions) as WorkbenchRegionId[]).forEach((regionId) => {
    const regionTabs = tabs.filter((tab) => tab.regionId === regionId).sort((left, right) => left.index - right.index);
    const currentActive = nextRegions[regionId].activeTabId;
    const hasActive = regionTabs.some((tab) => tab.id === currentActive);
    nextRegions[regionId] = {
      ...nextRegions[regionId],
      activeTabId: hasActive ? currentActive : (regionTabs[0]?.id ?? null),
    };
  });

  return nextRegions;
}

function normalizeBodyRegionOrder(
  order: Array<WorkbenchRegionId> | undefined,
): Array<Extract<WorkbenchRegionId, "left" | "center" | "right">> {
  const validOrder = (order ?? []).filter(
    (regionId): regionId is Extract<WorkbenchRegionId, "left" | "center" | "right"> =>
      regionId === "left" || regionId === "center" || regionId === "right",
  );
  const fullOrder: Array<Extract<WorkbenchRegionId, "left" | "center" | "right">> = [];

  for (const regionId of validOrder) {
    if (!fullOrder.includes(regionId)) {
      fullOrder.push(regionId);
    }
  }

  for (const regionId of ["left", "center", "right"] as const) {
    if (!fullOrder.includes(regionId)) {
      fullOrder.push(regionId);
    }
  }

  return fullOrder;
}

export function createDefaultWorkbenchLayoutState(
  schema: WorkbenchV2Schema,
  tabs: WorkbenchTabItem[],
): WorkbenchGlobalLayoutState {
  const regions = {
    top: normalizeRegionState(schema.regions.top, undefined),
    left: normalizeRegionState(schema.regions.left, undefined),
    center: normalizeRegionState(schema.regions.center, undefined),
    right: normalizeRegionState(schema.regions.right, undefined),
  };

  return {
    regions: fallbackActiveTabs(regions, normalizeAllTabIndices(tabs)),
    bodyRegionOrder: normalizeBodyRegionOrder(undefined),
    tabs: normalizeAllTabIndices(tabs),
  };
}

export function normalizeWorkbenchLayoutState(
  schema: WorkbenchV2Schema,
  state: RawWorkbenchGlobalLayoutState | undefined,
  fallbackTabs: WorkbenchTabItem[],
): WorkbenchGlobalLayoutState {
  const normalizedTabs = mergeWorkbenchTabs(state?.tabs, fallbackTabs);

  const regions = {
    top: normalizeRegionState(schema.regions.top, state?.regions?.top),
    left: normalizeRegionState(schema.regions.left, state?.regions?.left),
    center: normalizeRegionState(schema.regions.center, state?.regions?.center),
    right: normalizeRegionState(schema.regions.right, state?.regions?.right),
  };

  return {
    regions: fallbackActiveTabs(regions, normalizedTabs),
    bodyRegionOrder: normalizeBodyRegionOrder(state?.bodyRegionOrder),
    tabs: normalizedTabs,
  };
}
