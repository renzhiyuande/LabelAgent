import { useCallback, useState } from "react";
import type { WorkbenchChrome } from "@/components/workbench2";

export type ReviewSurfaceViewMode = "inline" | "cards" | "json";

export type ReviewRenderPrefsScope = "review" | "ai-queue";

export interface ReviewRenderPrefs {
  version: 1;
  chrome: WorkbenchChrome;
  defaults: {
    payload: ReviewSurfaceViewMode;
    annotate: ReviewSurfaceViewMode;
  };
}

const STORAGE_KEYS: Record<ReviewRenderPrefsScope, string> = {
  review: "labelhub:review:render-prefs",
  "ai-queue": "labelhub:ai-queue:render-prefs",
};

export function createDefaultReviewRenderPrefs(): ReviewRenderPrefs {
  return {
    version: 1,
    chrome: "flush",
    defaults: {
      payload: "inline",
      annotate: "inline",
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

function normalizeSurfaceViewMode(value: unknown, fallback: ReviewSurfaceViewMode): ReviewSurfaceViewMode {
  return value === "inline" || value === "cards" || value === "json" ? value : fallback;
}

function normalizeWorkbenchChrome(value: unknown, fallback: WorkbenchChrome): WorkbenchChrome {
  return value === "default" || value === "flush" ? value : fallback;
}

function normalizePrefs(raw: Partial<ReviewRenderPrefs> | null | undefined): ReviewRenderPrefs {
  const fallback = createDefaultReviewRenderPrefs();
  return {
    version: 1,
    chrome: normalizeWorkbenchChrome(raw?.chrome, fallback.chrome),
    defaults: {
      payload: normalizeSurfaceViewMode(raw?.defaults?.payload, fallback.defaults.payload),
      annotate: normalizeSurfaceViewMode(raw?.defaults?.annotate, fallback.defaults.annotate),
    },
  };
}

export function loadReviewRenderPrefs(scope: ReviewRenderPrefsScope): ReviewRenderPrefs {
  return normalizePrefs(readJson(STORAGE_KEYS[scope], null));
}

export function saveReviewRenderPrefs(scope: ReviewRenderPrefsScope, prefs: ReviewRenderPrefs): void {
  writeJson(STORAGE_KEYS[scope], normalizePrefs(prefs));
}

export function useReviewRenderPrefs(scope: ReviewRenderPrefsScope) {
  const [prefs, setPrefsState] = useState<ReviewRenderPrefs>(() => loadReviewRenderPrefs(scope));

  const setPrefs = useCallback(
    (patch: Partial<ReviewRenderPrefs> | ((current: ReviewRenderPrefs) => ReviewRenderPrefs)) => {
      setPrefsState((current) => {
        const next = normalizePrefs(typeof patch === "function" ? patch(current) : { ...current, ...patch });
        saveReviewRenderPrefs(scope, next);
        return next;
      });
    },
    [scope],
  );

  const resetRenderPrefs = useCallback(() => {
    const next = createDefaultReviewRenderPrefs();
    saveReviewRenderPrefs(scope, next);
    setPrefsState(next);
    return next;
  }, [scope]);

  return { prefs, setPrefs, resetRenderPrefs };
}

/** 预览/独立面板等无完整工作台时的占位 render prefs 能力 */
export function createStubReviewRenderPrefsHandlers() {
  const renderPrefs = createDefaultReviewRenderPrefs();
  return {
    renderPrefs,
    setRenderPrefs: () => undefined,
    resetRenderPrefs: () => renderPrefs,
    applyRenderDefaultViews: () => undefined,
  };
}
