import type {
  RawWorkbenchLayoutConfig,
  WorkbenchLayoutConfig,
  WorkbenchLayoutSchema,
  WorkbenchLayoutSizes,
  WorkbenchPanelDefinition,
} from "../types";

export const PANEL_COLLAPSED_WIDTH = 52;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolvePanelDefinition(
  schema: WorkbenchLayoutSchema,
  panelId: string,
): WorkbenchPanelDefinition | undefined {
  return schema.panelDefinitions[panelId as keyof typeof schema.panelDefinitions];
}

export function normalizePanelOrder<TPanelId extends string>(
  schema: WorkbenchLayoutSchema<TPanelId>,
  order?: TPanelId[],
): TPanelId[] {
  const required = Object.keys(schema.panelDefinitions) as TPanelId[];
  const seen = new Set<TPanelId>();
  const next: TPanelId[] = [];

  for (const panel of order ?? []) {
    if (required.includes(panel) && !seen.has(panel)) {
      seen.add(panel);
      next.push(panel);
    }
  }
  for (const panel of required) {
    if (!seen.has(panel)) {
      next.push(panel);
    }
  }
  return next;
}

export function normalizeLayoutSizes<TPreset extends string>(
  schema: WorkbenchLayoutSchema<string, TPreset>,
  preset: TPreset,
  sizes?: RawWorkbenchLayoutConfig["sizes"],
): WorkbenchLayoutSizes {
  const defaults = schema.presets[preset].sizes;
  const leadingDef = resolvePanelDefinition(schema, schema.leadingPanelId);
  const trailingDef = resolvePanelDefinition(schema, schema.trailingPanelId);

  const leadingWidth =
    sizes?.leadingWidth ??
    defaults.leadingWidth ??
    leadingDef?.defaultWidth ??
    260;
  const trailingWidth =
    sizes?.trailingWidth ??
    defaults.trailingWidth ??
    trailingDef?.defaultWidth ??
    380;
  const stackedPrimaryPercent =
    sizes?.stackedPrimaryPercent ??
    defaults.stackedPrimaryPercent ??
    55;

  return {
    leadingWidth: clamp(
      leadingWidth,
      leadingDef?.minWidth ?? 72,
      leadingDef?.maxWidth ?? 360,
    ),
    trailingWidth: clamp(
      trailingWidth,
      trailingDef?.minWidth ?? 300,
      trailingDef?.maxWidth ?? 640,
    ),
    stackedPrimaryPercent: clamp(stackedPrimaryPercent, 35, 72),
  };
}

export function normalizePanelCollapsed<TPanelId extends string>(
  schema: WorkbenchLayoutSchema<TPanelId>,
  preset: WorkbenchLayoutConfig<TPanelId>["preset"],
  raw?: Partial<Record<TPanelId, boolean>>,
): Record<TPanelId, boolean> {
  const defaults = (schema.presets[preset].panelCollapsed ?? {}) as Partial<Record<TPanelId, boolean>>;
  const panelIds = Object.keys(schema.panelDefinitions) as TPanelId[];
  const next = {} as Record<TPanelId, boolean>;

  for (const panelId of panelIds) {
    next[panelId] = raw?.[panelId] ?? defaults[panelId] ?? false;
  }
  return next;
}

export function normalizeLayoutConfig<TPanelId extends string, TPreset extends string>(
  schema: WorkbenchLayoutSchema<TPanelId, TPreset>,
  raw: RawWorkbenchLayoutConfig<TPanelId> | null | undefined,
): WorkbenchLayoutConfig<TPanelId, TPreset> {
  const preset =
    raw?.preset && raw.preset in schema.presets ? (raw.preset as TPreset) : schema.defaultPreset;
  const presetDef = schema.presets[preset];

  return {
    preset,
    panelOrder: normalizePanelOrder(schema, raw?.panelOrder ?? presetDef.panelOrder),
    sizes: normalizeLayoutSizes(schema, preset, raw?.sizes),
    panelCollapsed: normalizePanelCollapsed(
      schema,
      preset,
      raw?.panelCollapsed,
    ),
  };
}

export function createDefaultLayoutConfig<TPanelId extends string, TPreset extends string>(
  schema: WorkbenchLayoutSchema<TPanelId, TPreset>,
  preset: TPreset = schema.defaultPreset,
): WorkbenchLayoutConfig<TPanelId, TPreset> {
  return normalizeLayoutConfig(schema, { preset });
}
