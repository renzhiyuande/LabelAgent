import { useCallback, useState } from "react";
import type { WorkbenchLayoutConfig, WorkbenchLayoutSchema } from "../types";
import { applyLayoutPreset, togglePanelCollapsed, updateLayoutSizes } from "../utils/layout-operations";
import { normalizeLayoutConfig } from "../utils/layout-normalize";
import { loadLayoutConfig, saveLayoutConfig } from "../utils/layout-storage";

export interface UseWorkbenchLayoutOptions<
  TPanelId extends string,
  TPreset extends string,
  TConfig extends WorkbenchLayoutConfig<TPanelId, TPreset>,
> {
  normalize?: (raw: unknown) => TConfig;
  load?: () => TConfig;
  save?: (config: TConfig) => void;
}

export function useWorkbenchLayout<
  TPanelId extends string,
  TPreset extends string,
  TConfig extends WorkbenchLayoutConfig<TPanelId, TPreset> = WorkbenchLayoutConfig<TPanelId, TPreset>,
>(
  schema: WorkbenchLayoutSchema<TPanelId, TPreset>,
  options?: UseWorkbenchLayoutOptions<TPanelId, TPreset, TConfig>,
) {
  const normalize =
    options?.normalize ??
    ((raw: unknown) => normalizeLayoutConfig(schema, raw as Parameters<typeof normalizeLayoutConfig>[1]) as TConfig);
  const load = options?.load ?? (() => normalize(loadLayoutConfig(schema)) as TConfig);
  const save =
    options?.save ??
    ((config: TConfig) => {
      saveLayoutConfig(schema, normalize(config));
    });

  const [config, setConfigState] = useState<TConfig>(() => load());

  const setConfig = useCallback(
    (next: TConfig | ((current: TConfig) => TConfig)) => {
      setConfigState((current) => {
        const resolved = typeof next === "function" ? next(current) : next;
        const normalized = normalize(resolved);
        save(normalized);
        return normalized;
      });
    },
    [normalize, save],
  );

  const applyPreset = useCallback(
    (preset: TPreset, preserve?: Partial<TConfig>) => {
      setConfig({
        ...applyLayoutPreset(schema, preset),
        ...preserve,
      } as TConfig);
    },
    [schema, setConfig],
  );

  const togglePanel = useCallback(
    (panelId: TPanelId) => {
      setConfig((current) => togglePanelCollapsed(current, panelId) as TConfig);
    },
    [setConfig],
  );

  const patchSizes = useCallback(
    (patch: Parameters<typeof updateLayoutSizes<TPanelId, TPreset>>[2]) => {
      setConfig((current) => updateLayoutSizes(schema, current, patch) as TConfig);
    },
    [schema, setConfig],
  );

  return {
    schema,
    config,
    setConfig,
    applyPreset,
    togglePanel,
    patchSizes,
  };
}
