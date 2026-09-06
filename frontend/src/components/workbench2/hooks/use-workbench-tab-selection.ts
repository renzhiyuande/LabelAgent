import { useMemo } from "react";
import type { WorkbenchGlobalLayoutState, WorkbenchRegionId, WorkbenchTabItem } from "../types";

export function useWorkbenchTabSelection(state: WorkbenchGlobalLayoutState, regionId: WorkbenchRegionId) {
  const regionTabs = useMemo(
    () =>
      state.tabs
        .filter((tab) => tab.regionId === regionId)
        .sort((left, right) => left.index - right.index),
    [regionId, state.tabs],
  );

  const activeTab = regionTabs.find((tab) => tab.id === state.regions[regionId].activeTabId) ?? regionTabs[0] ?? null;

  return {
    tabs: regionTabs,
    activeTab,
  };
}
