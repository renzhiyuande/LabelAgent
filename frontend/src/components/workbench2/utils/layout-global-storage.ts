import type { WorkbenchGlobalLayoutState, WorkbenchV2Schema } from "../types";
import { normalizeWorkbenchLayoutState, type RawWorkbenchGlobalLayoutState } from "./layout-global-normalize";
import { normalizeSideRegionCollapse } from "./layout-side-region-collapse";

function normalizeLoadedSideRegions(
  schema: WorkbenchV2Schema,
  state: WorkbenchGlobalLayoutState,
): WorkbenchGlobalLayoutState {
  return {
    ...state,
    regions: {
      ...state.regions,
      left: normalizeSideRegionCollapse(schema.regions.left, state.regions.left),
      right: normalizeSideRegionCollapse(schema.regions.right, state.regions.right),
    },
  };
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readRaw(storageKey: string): RawWorkbenchGlobalLayoutState | undefined {
  if (!canUseStorage()) {
    return undefined;
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as RawWorkbenchGlobalLayoutState;
  } catch {
    return undefined;
  }
}

export function loadWorkbenchLayoutState(
  schema: WorkbenchV2Schema,
  fallbackState: WorkbenchGlobalLayoutState,
): WorkbenchGlobalLayoutState {
  const keys = [schema.storageKey, ...(schema.legacyStorageKeys ?? [])];

  for (const key of keys) {
    const raw = readRaw(key);
    if (raw) {
      return normalizeLoadedSideRegions(
        schema,
        normalizeWorkbenchLayoutState(schema, raw, fallbackState.tabs),
      );
    }
  }

  return fallbackState;
}

export function saveWorkbenchLayoutState(schema: WorkbenchV2Schema, state: WorkbenchGlobalLayoutState) {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.setItem(schema.storageKey, JSON.stringify(state));
}
