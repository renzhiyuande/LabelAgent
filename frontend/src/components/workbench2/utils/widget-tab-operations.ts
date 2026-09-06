import type { WorkbenchRegionId, WorkbenchTabItem } from "../types";
import { WORKBENCH_WIDGET_HOST_SLOT_ID } from "../types";
import { normalizeAllTabIndices } from "./layout-dnd-operations";

export function buildWidgetTabId(widgetId: string, regionId: WorkbenchRegionId): string {
  return `widget-tab:${widgetId}:${regionId}`;
}

export function createWidgetTab(params: {
  widgetId: string;
  regionId: WorkbenchRegionId;
  label: string;
  tabs: WorkbenchTabItem[];
}): { tabs: WorkbenchTabItem[]; tabId: string; created: boolean } {
  const tabId = buildWidgetTabId(params.widgetId, params.regionId);
  const existing = params.tabs.find((tab) => tab.id === tabId);
  if (existing) {
    return { tabs: params.tabs, tabId, created: false };
  }

  const regionTabs = params.tabs.filter((tab) => tab.regionId === params.regionId);
  const newTab: WorkbenchTabItem = {
    id: tabId,
    slotId: WORKBENCH_WIDGET_HOST_SLOT_ID,
    label: params.label,
    regionId: params.regionId,
    index: regionTabs.length,
    tabKind: "widget",
    widgetId: params.widgetId,
  };

  return {
    tabs: normalizeAllTabIndices([...params.tabs, newTab]),
    tabId,
    created: true,
  };
}

export function removeWorkbenchTab(tabs: WorkbenchTabItem[], tabId: string): WorkbenchTabItem[] {
  return normalizeAllTabIndices(tabs.filter((tab) => tab.id !== tabId));
}

export function renameWorkbenchTab(
  tabs: WorkbenchTabItem[],
  tabId: string,
  label: string,
): WorkbenchTabItem[] {
  return tabs.map((tab) => (tab.id === tabId ? { ...tab, label: label.trim() || tab.label } : tab));
}

export function findWidgetTab(
  tabs: WorkbenchTabItem[],
  widgetId: string,
): WorkbenchTabItem | undefined {
  return tabs.find((tab) => tab.tabKind === "widget" && tab.widgetId === widgetId);
}

export function isWidgetHostTab(tab: WorkbenchTabItem): boolean {
  return tab.tabKind === "widget" && Boolean(tab.widgetId);
}
