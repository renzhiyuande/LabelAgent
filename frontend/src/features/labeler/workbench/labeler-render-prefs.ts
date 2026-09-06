import { useCallback, useEffect, useState } from "react";
import type { WorkbenchChrome } from "@/components/workbench2";
import type { FormSchema } from "@/low-code/schema/types";
import { inferSectionSurface } from "./labeler-section-widget";

export type LabelerWorkbenchLayoutMode = "classic" | "sectionWidgets";

/** 区块 widget 使用的渲染器 */
export type LabelerSectionSurface = "auto" | "display" | "annotate";

export type LabelerSurfaceViewMode = "inline" | "cards" | "json";

export interface LabelerSectionWidgetConfig {
  /** 渲染器：题面展示 / 作答表单 / 自动推断 */
  surface?: LabelerSectionSurface;
  viewMode?: LabelerSurfaceViewMode;
  visible?: boolean;
}

export interface LabelerRenderPrefs {
  version: 2;
  layoutMode: LabelerWorkbenchLayoutMode;
  chrome: WorkbenchChrome;
  sectionWidgets?: Record<string, LabelerSectionWidgetConfig>;
  defaults: {
    payload: LabelerSurfaceViewMode;
    annotate: LabelerSurfaceViewMode;
  };
}

const GLOBAL_PREFS_KEY = "labelhub:labeler:render-prefs";
const TEMPLATE_PREFS_PREFIX = "labelhub:labeler:render-prefs:tpl:";

export function createDefaultLabelerRenderPrefs(): LabelerRenderPrefs {
  return {
    version: 2,
    layoutMode: "classic",
    chrome: "flush",
    defaults: {
      payload: "inline",
      annotate: "cards",
    },
  };
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeSurfaceViewMode(value: unknown, fallback: LabelerSurfaceViewMode): LabelerSurfaceViewMode {
  return value === "inline" || value === "cards" || value === "json" ? value : fallback;
}

function normalizeWorkbenchChrome(value: unknown, fallback: WorkbenchChrome): WorkbenchChrome {
  return value === "default" || value === "flush" ? value : fallback;
}

function normalizeSectionSurface(value: unknown): LabelerSectionSurface | undefined {
  if (value === "auto" || value === "display" || value === "annotate") {
    return value;
  }
  if (value === "payload") {
    return "display";
  }
  if (value === "annotate") {
    return "annotate";
  }
  return undefined;
}

function migrateLegacyPrefs(raw: Record<string, unknown>): Partial<LabelerRenderPrefs> {
  const contentPartition = raw.contentPartition;
  if (contentPartition === "bySection") {
    const sectionSlots = raw.sectionSlots as Record<string, string> | undefined;
    const sectionWidgets: Record<string, LabelerSectionWidgetConfig> = {};
    if (sectionSlots) {
      for (const [key, slot] of Object.entries(sectionSlots)) {
        sectionWidgets[key] = {
          surface: slot === "annotate" ? "annotate" : "display",
          visible: true,
        };
      }
    }
    return {
      layoutMode: "sectionWidgets",
      sectionWidgets,
    };
  }
  return { layoutMode: "classic" };
}

function normalizePrefs(raw: Partial<LabelerRenderPrefs> | Record<string, unknown> | null): LabelerRenderPrefs {
  const defaults = createDefaultLabelerRenderPrefs();
  if (!raw) {
    return defaults;
  }

  const migrated =
    raw && typeof raw === "object" && "version" in raw && raw.version === 2
      ? {}
      : migrateLegacyPrefs((raw ?? {}) as Record<string, unknown>);
  const merged = { ...defaults, ...migrated, ...raw };

  const layoutMode = merged.layoutMode === "sectionWidgets" ? "sectionWidgets" : "classic";
  const chrome = normalizeWorkbenchChrome(merged.chrome, defaults.chrome);
  const sectionWidgetsRaw = merged.sectionWidgets;
  const sectionWidgets: Record<string, LabelerSectionWidgetConfig> | undefined =
    sectionWidgetsRaw && typeof sectionWidgetsRaw === "object"
      ? Object.fromEntries(
          Object.entries(sectionWidgetsRaw).map(([key, value]) => {
            const config = (value ?? {}) as LabelerSectionWidgetConfig;
            return [
              key,
              {
                surface: normalizeSectionSurface(config.surface),
                viewMode: normalizeSurfaceViewMode(config.viewMode, defaults.defaults.payload),
                visible: config.visible !== false,
              },
            ];
          }),
        )
      : undefined;

  return {
    version: 2,
    layoutMode,
    chrome,
    sectionWidgets,
    defaults: {
      payload: normalizeSurfaceViewMode(merged.defaults?.payload, defaults.defaults.payload),
      annotate: normalizeSurfaceViewMode(merged.defaults?.annotate, defaults.defaults.annotate),
    },
  };
}

function templatePrefsKey(templateVersionId: string | number): string {
  return `${TEMPLATE_PREFS_PREFIX}${templateVersionId}`;
}

export function loadLabelerRenderPrefs(templateVersionId?: string | number | null): LabelerRenderPrefs {
  const global = normalizePrefs(
    readJson<Partial<LabelerRenderPrefs> | Record<string, unknown> | null>(GLOBAL_PREFS_KEY, null),
  );
  if (templateVersionId == null || templateVersionId === "") {
    return global;
  }
  const override = readJson<Partial<LabelerRenderPrefs> | null>(templatePrefsKey(templateVersionId), null);
  if (!override) {
    return global;
  }
  const merged = normalizePrefs({ ...global, ...override });
  return {
    ...merged,
    sectionWidgets: {
      ...(global.sectionWidgets ?? {}),
      ...(override.sectionWidgets ?? {}),
    },
  };
}

export function saveLabelerRenderPrefs(
  templateVersionId: string | number | null | undefined,
  prefs: LabelerRenderPrefs,
): void {
  const normalized = normalizePrefs(prefs);
  writeJson(GLOBAL_PREFS_KEY, normalized);
  if (templateVersionId != null && templateVersionId !== "") {
    writeJson(templatePrefsKey(templateVersionId), {
      sectionWidgets: normalized.sectionWidgets,
    });
  }
}

export function clearLabelerRenderPrefsStorage(): void {
  if (typeof window === "undefined") {
    return;
  }
  const keys: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key === GLOBAL_PREFS_KEY || key?.startsWith(TEMPLATE_PREFS_PREFIX)) {
      keys.push(key);
    }
  }
  keys.forEach((key) => window.localStorage.removeItem(key));
}

export function buildDefaultSectionWidgetConfigs(schema: FormSchema): Record<string, LabelerSectionWidgetConfig> {
  const configs: Record<string, LabelerSectionWidgetConfig> = {};
  for (const section of schema.sections) {
    configs[section.key] = {
      surface: "auto",
      visible: true,
    };
  }
  return configs;
}

export function ensureSectionWidgetConfigs(
  schema: FormSchema,
  current?: Record<string, LabelerSectionWidgetConfig>,
): Record<string, LabelerSectionWidgetConfig> {
  const next = { ...(current ?? {}) };
  for (const section of schema.sections) {
    if (!next[section.key]) {
      next[section.key] = {
        surface: inferSectionSurface(section) === "annotate" ? "auto" : "auto",
        visible: true,
      };
    }
  }
  for (const key of Object.keys(next)) {
    if (!schema.sections.some((section) => section.key === key)) {
      delete next[key];
    }
  }
  return next;
}

export function useLabelerRenderPrefs(templateVersionId?: string | number | null) {
  const [prefs, setPrefsState] = useState<LabelerRenderPrefs>(() =>
    loadLabelerRenderPrefs(templateVersionId),
  );

  useEffect(() => {
    setPrefsState(loadLabelerRenderPrefs(templateVersionId));
  }, [templateVersionId]);

  const setPrefs = useCallback(
    (patch: Partial<LabelerRenderPrefs> | ((current: LabelerRenderPrefs) => LabelerRenderPrefs)) => {
      setPrefsState((current) => {
        const next = normalizePrefs(
          typeof patch === "function" ? patch(current) : { ...current, ...patch },
        );
        saveLabelerRenderPrefs(templateVersionId, next);
        return next;
      });
    },
    [templateVersionId],
  );

  const resetRenderPrefs = useCallback(() => {
    const next = createDefaultLabelerRenderPrefs();
    saveLabelerRenderPrefs(templateVersionId, next);
    setPrefsState(next);
  }, [templateVersionId]);

  return { prefs, setPrefs, resetRenderPrefs };
}
