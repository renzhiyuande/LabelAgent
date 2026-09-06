import type { ReactNode } from "react";
import { matchPath } from "react-router-dom";
import { useNavigationStore } from "../../stores/navigation";
import type { AppRouteDefinition, AppRouteMeta } from "./types";

let cachedRouteDefinitions: AppRouteDefinition[] | null = null;
let cachedRouteMap: Map<string, AppRouteDefinition> = new Map();

function getRouteMap(): Map<string, AppRouteDefinition> {
  const routes = useNavigationStore.getState().routeDefinitions;
  if (routes !== cachedRouteDefinitions) {
    cachedRouteDefinitions = routes;
    cachedRouteMap = new Map(routes.map((route) => [route.meta.path, route]));
  }
  return cachedRouteMap;
}

function resolveRouteDefinition(path: string): AppRouteDefinition | undefined {
  const map = getRouteMap();
  const direct = map.get(path);
  if (direct) {
    return direct;
  }
  for (const route of map.values()) {
    if (!route.meta.path.includes(":")) {
      continue;
    }
    if (matchPath({ path: route.meta.path, end: true }, path)) {
      return route;
    }
  }
  return undefined;
}

export function getWorkspaceRouteDefinitions(): AppRouteDefinition[] {
  return useNavigationStore.getState().routeDefinitions;
}

export function getRouteMetaByPath(path: string): AppRouteMeta | null {
  return resolveRouteDefinition(path)?.meta ?? null;
}

export function resolveRoutePermission(path: string): string | string[] | undefined {
  return getRouteMetaByPath(path)?.permission;
}

export function isSupportedWorkspacePath(path: string): boolean {
  return resolveRouteDefinition(path) !== undefined;
}

export function renderWorkspacePage(path: string): ReactNode | null {
  return resolveRouteDefinition(path)?.render() ?? null;
}

/** 参数化路由用 pattern 作稳定 mount key，避免 /work/1 → /work/2 整页 remount */
export function resolveWorkspaceMountKey(pathname: string): string {
  const route = resolveRouteDefinition(pathname);
  if (!route) {
    return pathname;
  }
  if (route.meta.path.includes(":")) {
    return route.meta.cacheKey ?? route.meta.path;
  }
  return pathname;
}

export function renderWorkspacePageByMountKey(mountKey: string): ReactNode | null {
  for (const route of getWorkspaceRouteDefinitions()) {
    const stableKey = route.meta.cacheKey ?? route.meta.path;
    if (stableKey === mountKey || route.meta.path === mountKey) {
      return route.render();
    }
  }
  return renderWorkspacePage(mountKey);
}

export function getRegisteredSystemRoutePaths(): string[] {
  return getWorkspaceRouteDefinitions()
    .map((route) => route.meta.path)
    .filter((path) => path !== "/");
}
