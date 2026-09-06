import type { WorkbenchLayoutConfig, WorkbenchLayoutSchema, WorkbenchLayoutSizes } from "../types";
import { PANEL_COLLAPSED_WIDTH, normalizeLayoutConfig, normalizeLayoutSizes } from "./layout-normalize";

export function applyLayoutPreset<TPanelId extends string, TPreset extends string>(
  schema: WorkbenchLayoutSchema<TPanelId, TPreset>,
  preset: TPreset,
): WorkbenchLayoutConfig<TPanelId, TPreset> {
  return normalizeLayoutConfig(schema, { preset });
}

export function updateLayoutSizes<
  TPanelId extends string,
  TPreset extends string,
  TConfig extends WorkbenchLayoutConfig<TPanelId, TPreset> = WorkbenchLayoutConfig<TPanelId, TPreset>,
>(
  schema: WorkbenchLayoutSchema<TPanelId, TPreset>,
  config: TConfig,
  patch: Partial<WorkbenchLayoutSizes>,
): TConfig {
  return {
    ...config,
    sizes: normalizeLayoutSizes(schema, config.preset, { ...config.sizes, ...patch }),
  };
}

export function togglePanelCollapsed<
  TPanelId extends string,
  TPreset extends string,
  TConfig extends WorkbenchLayoutConfig<TPanelId, TPreset> = WorkbenchLayoutConfig<TPanelId, TPreset>,
>(config: TConfig, panelId: TPanelId): TConfig {
  return {
    ...config,
    panelCollapsed: {
      ...config.panelCollapsed,
      [panelId]: !config.panelCollapsed[panelId],
    },
  };
}

export function resolvePanelWidth<TPanelId extends string, TPreset extends string>(
  schema: WorkbenchLayoutSchema<TPanelId, TPreset>,
  config: WorkbenchLayoutConfig<TPanelId, TPreset>,
  panelId: TPanelId,
): number {
  if (config.panelCollapsed[panelId]) {
    return PANEL_COLLAPSED_WIDTH;
  }
  if (panelId === schema.leadingPanelId) {
    return config.sizes.leadingWidth;
  }
  if (panelId === schema.trailingPanelId) {
    return config.sizes.trailingWidth;
  }
  return 0;
}

export function isPanelCollapsed<TPanelId extends string, TPreset extends string>(
  config: WorkbenchLayoutConfig<TPanelId, TPreset>,
  panelId: TPanelId,
): boolean {
  return config.panelCollapsed[panelId];
}

export function getPanelLabels<TPanelId extends string>(
  schema: WorkbenchLayoutSchema<TPanelId>,
): Record<TPanelId, string> {
  const labels = {} as Record<TPanelId, string>;
  for (const panelId of Object.keys(schema.panelDefinitions) as TPanelId[]) {
    labels[panelId] = schema.panelDefinitions[panelId].label;
  }
  return labels;
}
