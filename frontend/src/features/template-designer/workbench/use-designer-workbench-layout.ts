import { useCallback } from "react";
import { useWorkbenchLayout } from "@/components/workbench/hooks/use-workbench-layout";
import { normalizeLayoutConfig } from "@/components/workbench/utils/layout-normalize";
import type { RawWorkbenchLayoutConfig, WorkbenchLayoutConfig } from "@/components/workbench/types";
import { readStoredLayoutRaw, saveLayoutConfig } from "@/components/workbench/utils/layout-storage";
import {
  designerLayoutSchema,
  type DesignerLayoutPreset,
  type DesignerPanelId,
} from "../constants/designer-layout-schema";

export type DesignerWorkbenchLayoutConfig = WorkbenchLayoutConfig<
  DesignerPanelId,
  DesignerLayoutPreset
>;

export function useDesignerWorkbenchLayout() {
  const normalize = useCallback(
    (raw: unknown) => normalizeLayoutConfig(designerLayoutSchema, raw as Partial<DesignerWorkbenchLayoutConfig>),
    [],
  );
  const load = useCallback(
    () =>
      normalizeLayoutConfig(
        designerLayoutSchema,
        readStoredLayoutRaw(designerLayoutSchema) as RawWorkbenchLayoutConfig<DesignerPanelId> | null | undefined,
      ),
    [],
  );
  const save = useCallback((config: DesignerWorkbenchLayoutConfig) => {
    saveLayoutConfig(designerLayoutSchema, normalizeLayoutConfig(designerLayoutSchema, config));
  }, []);

  return useWorkbenchLayout<DesignerPanelId, DesignerLayoutPreset, DesignerWorkbenchLayoutConfig>(
    designerLayoutSchema,
    { normalize, load, save },
  );
}
