import { useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppShellStore } from "../../../stores/app-shell";
import { useTabWorkspaceStore } from "../../../stores/tab-workspace";

const DESIGNER_PATH = "/system/template-designer";

const DEFAULT_FALLBACK = "/owner/tasks";
export const DESIGNER_RETURN_TO_KEY = "labelhub:designer:returnTo";

function isSafeInternalPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("://");
}

export function isDesignerLocation(path: string): boolean {
  const pathname = path.split("?")[0] ?? path;
  return pathname === DESIGNER_PATH;
}

function normalizeBackTarget(path: string | null | undefined): string | null {
  if (!path || !isSafeInternalPath(path) || isDesignerLocation(path)) {
    return null;
  }
  return path;
}

export function resolveDesignerReturnTo(searchParams: URLSearchParams): string | null {
  const raw = searchParams.get("returnTo");
  if (!raw) {
    return null;
  }
  try {
    return normalizeBackTarget(decodeURIComponent(raw));
  } catch {
    return normalizeBackTarget(raw);
  }
}

export function rememberDesignerReturnTo(returnTo: string): void {
  const normalized = normalizeBackTarget(returnTo);
  if (!normalized) {
    return;
  }
  const existing = peekDesignerReturnTo();
  if (existing) {
    return;
  }
  sessionStorage.setItem(DESIGNER_RETURN_TO_KEY, normalized);
}

export function peekDesignerReturnTo(): string | null {
  const stored = sessionStorage.getItem(DESIGNER_RETURN_TO_KEY);
  return normalizeBackTarget(stored);
}

export function consumeDesignerReturnTo(): string | null {
  const stored = peekDesignerReturnTo();
  if (stored) {
    sessionStorage.removeItem(DESIGNER_RETURN_TO_KEY);
  }
  return stored;
}

function resolveTabFallbackTarget(): string | null {
  const tabs = useTabWorkspaceStore.getState().tabs;
  for (let index = tabs.length - 1; index >= 0; index -= 1) {
    const tab = tabs[index];
    if (isDesignerLocation(tab.key) || isDesignerLocation(tab.path)) {
      continue;
    }
    const target = normalizeBackTarget(tab.path) ?? normalizeBackTarget(tab.key);
    if (target) {
      return target;
    }
  }
  return null;
}

export function resolveDesignerBackTarget(searchParams: URLSearchParams): string {
  return (
    resolveDesignerReturnTo(searchParams) ??
    peekDesignerReturnTo() ??
    resolveTabFallbackTarget() ??
    DEFAULT_FALLBACK
  );
}

export function appendDesignerReturnTo(
  designerUrl: string,
  returnTo: string,
): string {
  rememberDesignerReturnTo(returnTo);
  const url = new URL(designerUrl, "http://local");
  const normalized = normalizeBackTarget(returnTo);
  if (normalized) {
    url.searchParams.set("returnTo", normalized);
  }
  return `${url.pathname}${url.search}`;
}

export function useDesignerBack() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = resolveDesignerBackTarget(searchParams);

  const goBack = useCallback(() => {
    useAppShellStore.getState().exitFocusMode();
    const params = new URLSearchParams(window.location.search);
    const target = resolveDesignerBackTarget(params);
    consumeDesignerReturnTo();
    navigate(target);
  }, [navigate]);

  return { goBack, returnTo };
}
