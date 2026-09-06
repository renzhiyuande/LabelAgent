import type {
  WorkbenchPlacementMode,
  WorkbenchRegionId,
  WorkbenchRenderContext,
  WorkbenchRegionState,
} from "../types";

function resolvePlacementMode(regionId: WorkbenchRegionId, region: WorkbenchRegionState): WorkbenchPlacementMode {
  if (regionId === "top") {
    return region.size <= 96 ? "top-compact" : "top-full";
  }
  if (regionId === "center") {
    return "center-full";
  }
  if (regionId === "left") {
    return region.collapsed ? "left-narrow" : "left-wide";
  }
  return region.collapsed ? "right-narrow" : "right-wide";
}

export function buildWorkbenchRenderContext(params: {
  regionId: WorkbenchRegionId;
  region: WorkbenchRegionState;
  tabId: string;
  isActive: boolean;
}): WorkbenchRenderContext {
  const { regionId, region, tabId, isActive } = params;

  return {
    regionId,
    placementMode: resolvePlacementMode(regionId, region),
    regionSize: region.size,
    regionCollapsed: region.collapsed,
    isActive,
    tabId,
  };
}

export const useWorkbenchRenderContext = buildWorkbenchRenderContext;
