import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WorkbenchGlobalLayoutState, WorkbenchRegionId, WorkbenchTabItem, WorkbenchV2Schema } from "../types";
import {
  createDefaultWorkbenchLayoutState,
  normalizeWorkbenchLayoutState,
} from "../utils/layout-global-normalize";
import {
  applySideRegionResizeDelta,
  applySideRegionSizeUpdate,
  isWorkbenchSideRegionId,
  resolveExpandedSideRegionSize,
} from "../utils/layout-side-region-collapse";
import { loadWorkbenchLayoutState, saveWorkbenchLayoutState } from "../utils/layout-global-storage";

export interface UseWorkbenchGlobalLayoutOptions {
  schema: WorkbenchV2Schema;
  initialTabs: WorkbenchTabItem[];
  controlledState?: WorkbenchGlobalLayoutState;
  onStateChange?: (state: WorkbenchGlobalLayoutState) => void;
}

export function useWorkbenchGlobalLayout({
  schema,
  initialTabs,
  controlledState,
  onStateChange,
}: UseWorkbenchGlobalLayoutOptions) {
  const isControlled = controlledState !== undefined;
  const fallbackState = useMemo(
    () => createDefaultWorkbenchLayoutState(schema, initialTabs),
    [initialTabs, schema],
  );

  const [uncontrolledState, setUncontrolledState] = useState<WorkbenchGlobalLayoutState>(() =>
    loadWorkbenchLayoutState(schema, fallbackState),
  );

  const state = isControlled ? controlledState : uncontrolledState;
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const updateState = useCallback(
    (nextState: WorkbenchGlobalLayoutState | ((current: WorkbenchGlobalLayoutState) => WorkbenchGlobalLayoutState)) => {
      const resolved = typeof nextState === "function" ? nextState(stateRef.current) : nextState;
      const normalized = normalizeWorkbenchLayoutState(schema, resolved, initialTabs);
      stateRef.current = normalized;
      saveWorkbenchLayoutState(schema, normalized);
      if (isControlled) {
        onStateChange?.(normalized);
      } else {
        setUncontrolledState(normalized);
        onStateChange?.(normalized);
      }
    },
    [initialTabs, isControlled, onStateChange, schema],
  );

  const setTabs = useCallback(
    (tabs: WorkbenchTabItem[]) => {
      updateState((current) => ({
        ...current,
        tabs,
      }));
    },
    [updateState],
  );

  const setRegionCollapsed = useCallback(
    (regionId: WorkbenchRegionId, collapsed: boolean) => {
      const regionDef = schema.regions[regionId];
      if (regionDef.collapsible === false) {
        return;
      }
      updateState((current) => {
        const stored = current.regions[regionId];
        const nextRegion =
          !collapsed && isWorkbenchSideRegionId(regionId)
            ? {
                ...stored,
                collapsed: false,
                size: resolveExpandedSideRegionSize(regionDef, stored),
              }
            : { ...stored, collapsed };
        return {
          ...current,
          regions: {
            ...current.regions,
            [regionId]: nextRegion,
          },
        };
      });
    },
    [schema.regions, updateState],
  );

  const toggleRegionCollapsed = useCallback(
    (regionId: Extract<WorkbenchRegionId, "left" | "right">) => {
      updateState((current) => {
        const regionDef = schema.regions[regionId];
        if (regionDef.collapsible === false) {
          return current;
        }
        const stored = current.regions[regionId];
        const nextCollapsed = !stored.collapsed;
        const nextRegion = !nextCollapsed
          ? {
              ...stored,
              collapsed: false,
              size: resolveExpandedSideRegionSize(regionDef, stored),
            }
          : { ...stored, collapsed: true };
        return {
          ...current,
          regions: {
            ...current.regions,
            [regionId]: nextRegion,
          },
        };
      });
    },
    [schema.regions, updateState],
  );

  const setRegionSize = useCallback(
    (regionId: WorkbenchRegionId, size: number) => {
      const regionDef = schema.regions[regionId];
      updateState((current) => ({
        ...current,
        regions: {
          ...current.regions,
          [regionId]: applySideRegionSizeUpdate(regionDef, current.regions[regionId], size),
        },
      }));
    },
    [schema.regions, updateState],
  );

  const setRegionSizes = useCallback(
    (sizes: Partial<Record<WorkbenchRegionId, number>>) => {
      updateState((current) => {
        const nextRegions = { ...current.regions };
        (Object.keys(sizes) as WorkbenchRegionId[]).forEach((regionId) => {
          const size = sizes[regionId];
          if (typeof size !== "number") {
            return;
          }
          nextRegions[regionId] = applySideRegionSizeUpdate(
            schema.regions[regionId],
            nextRegions[regionId],
            size,
          );
        });
        return {
          ...current,
          regions: nextRegions,
        };
      });
    },
    [schema.regions, updateState],
  );

  const adjustRegionSizes = useCallback(
    (deltas: Partial<Record<WorkbenchRegionId, number>>) => {
      updateState((current) => {
        const nextRegions = { ...current.regions };
        (Object.keys(deltas) as WorkbenchRegionId[]).forEach((regionId) => {
          const delta = deltas[regionId];
          if (typeof delta !== "number" || delta === 0) {
            return;
          }
          nextRegions[regionId] = applySideRegionResizeDelta(
            schema.regions[regionId],
            nextRegions[regionId],
            delta,
          );
        });
        return {
          ...current,
          regions: nextRegions,
        };
      });
    },
    [schema.regions, updateState],
  );

  const setActiveTab = useCallback(
    (regionId: WorkbenchRegionId, tabId: string | null) => {
      updateState((current) => ({
        ...current,
        regions: {
          ...current.regions,
          [regionId]: {
            ...current.regions[regionId],
            activeTabId: tabId,
          },
        },
      }));
    },
    [updateState],
  );

  const setBodyRegionOrder = useCallback(
    (bodyRegionOrder: WorkbenchGlobalLayoutState["bodyRegionOrder"]) => {
      updateState((current) => ({
        ...current,
        bodyRegionOrder,
      }));
    },
    [updateState],
  );

  const resetLayout = useCallback(() => {
    updateState(fallbackState);
  }, [fallbackState, updateState]);

  const collapseSideRegions = useCallback(() => {
    updateState((current) => ({
      ...current,
      regions: {
        ...current.regions,
        left: { ...current.regions.left, collapsed: true },
        right: { ...current.regions.right, collapsed: true },
      },
    }));
  }, [updateState]);

  return {
    state,
    setTabs,
    setRegionCollapsed,
    toggleRegionCollapsed,
    collapseSideRegions,
    setRegionSize,
    setRegionSizes,
    adjustRegionSizes,
    setActiveTab,
    setBodyRegionOrder,
    resetLayout,
  };
}
