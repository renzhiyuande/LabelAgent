import type { WorkbenchLayoutSchema } from "../types";
import { normalizeLayoutConfig } from "./layout-normalize";

export function readStoredLayoutRaw(schema: WorkbenchLayoutSchema): unknown | null {
  if (typeof window === "undefined") {
    return null;
  }
  const keys = [schema.storageKey, ...(schema.legacyStorageKeys ?? [])];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        return JSON.parse(raw) as unknown;
      }
    } catch {
      // try next key
    }
  }
  return null;
}

export function loadLayoutConfig<TPanelId extends string, TPreset extends string>(
  schema: WorkbenchLayoutSchema<TPanelId, TPreset>,
): ReturnType<typeof normalizeLayoutConfig<TPanelId, TPreset>> {
  return normalizeLayoutConfig(schema, readStoredLayoutRaw(schema) as Parameters<
    typeof normalizeLayoutConfig<TPanelId, TPreset>
  >[1]);
}

export function saveLayoutConfig<TPanelId extends string, TPreset extends string>(
  schema: WorkbenchLayoutSchema<TPanelId, TPreset>,
  config: ReturnType<typeof normalizeLayoutConfig<TPanelId, TPreset>>,
): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(schema.storageKey, JSON.stringify(normalizeLayoutConfig(schema, config)));
}
