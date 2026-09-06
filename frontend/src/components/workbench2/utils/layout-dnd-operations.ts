import type { WorkbenchRegionId, WorkbenchTabItem } from "../types";

function compareTabs(left: WorkbenchTabItem, right: WorkbenchTabItem) {
  return left.index - right.index;
}

export function normalizeAllTabIndices(tabs: WorkbenchTabItem[]): WorkbenchTabItem[] {
  const regionIds: WorkbenchRegionId[] = ["top", "left", "center", "right"];
  const normalized: WorkbenchTabItem[] = [];

  for (const regionId of regionIds) {
    const regionTabs = tabs
      .filter((tab) => tab.regionId === regionId)
      .sort(compareTabs)
      .map((tab, index) => ({
        ...tab,
        index,
      }));
    normalized.push(...regionTabs);
  }

  return normalized;
}

export function moveTabToRegion(
  tabs: WorkbenchTabItem[],
  tabId: string,
  targetRegionId: WorkbenchRegionId,
): WorkbenchTabItem[] {
  return moveTabToRegionAtIndex(tabs, tabId, targetRegionId);
}

export function moveTabToRegionAtIndex(
  tabs: WorkbenchTabItem[],
  tabId: string,
  targetRegionId: WorkbenchRegionId,
  targetIndex?: number,
): WorkbenchTabItem[] {
  const tabToMove = tabs.find((tab) => tab.id === tabId);
  if (!tabToMove) {
    return tabs;
  }

  const nextTabs = tabs.filter((tab) => tab.id !== tabId);
  const targetRegionTabs = nextTabs.filter((tab) => tab.regionId === targetRegionId).sort(compareTabs);
  const insertIndex =
    typeof targetIndex === "number"
      ? Math.max(0, Math.min(targetIndex, targetRegionTabs.length))
      : targetRegionTabs.length;

  const updatedTab = {
    ...tabToMove,
    regionId: targetRegionId,
    index: insertIndex,
  };

  const reorderedTargetTabs = [...targetRegionTabs];
  reorderedTargetTabs.splice(insertIndex, 0, updatedTab);

  return normalizeAllTabIndices([
    ...nextTabs.filter((tab) => tab.regionId !== targetRegionId),
    ...reorderedTargetTabs.map((tab, index) => ({
      ...tab,
      index,
    })),
  ]);
}

export function reorderTabsInRegion(
  tabs: WorkbenchTabItem[],
  regionId: WorkbenchRegionId,
  activeId: string,
  overId: string,
): WorkbenchTabItem[] {
  if (activeId === overId) {
    return tabs;
  }

  const regionTabs = tabs.filter((tab) => tab.regionId === regionId).sort(compareTabs);
  const otherTabs = tabs.filter((tab) => tab.regionId !== regionId);
  const oldIndex = regionTabs.findIndex((tab) => tab.id === activeId);
  const newIndex = regionTabs.findIndex((tab) => tab.id === overId);

  if (oldIndex < 0 || newIndex < 0) {
    return tabs;
  }

  const reordered = [...regionTabs];
  const [movedTab] = reordered.splice(oldIndex, 1);
  reordered.splice(newIndex, 0, movedTab);

  return normalizeAllTabIndices([
    ...otherTabs,
    ...reordered.map((tab, index) => ({
      ...tab,
      index,
    })),
  ]);
}
