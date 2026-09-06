import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { resourceListRootKey } from "../adapters/query-keys";
import { getRouteMetaService } from "../global-config";

/**
 * keepAlive 下页面隐藏时不卸载，React Query 列表可能仍是旧缓存。
 * 仅在「从隐藏切回可见」时失效列表缓存，避免首屏重复请求。
 */
export function useResourcePageVisibleRefetch(
  resourceKey: string,
  options: {
    enabled?: boolean;
    initialLoading: boolean;
  },
) {
  const { enabled = true, initialLoading } = options;
  const queryClient = useQueryClient();
  const location = useLocation();
  const routeMeta = getRouteMetaService();
  const visibleMountKey = routeMeta?.resolveWorkspaceMountKey?.(location.pathname) ?? "";
  const isVisible = useMemo(() => {
    const routes = routeMeta?.getWorkspaceRouteDefinitions?.() ?? [];
    const route = routes.find((item: any) => item.meta?.resourceKey === resourceKey);
    if (!route) {
      return false;
    }
    return (routeMeta?.resolveWorkspaceMountKey?.((route as any).meta?.path ?? "") ?? "") === visibleMountKey;
  }, [resourceKey, visibleMountKey, routeMeta]);

  const prevVisibleRef = useRef(isVisible);
  const mountedRef = useRef(false);
  const initialLoadingRef = useRef(initialLoading);
  initialLoadingRef.current = initialLoading;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!mountedRef.current) {
      mountedRef.current = true;
      prevVisibleRef.current = isVisible;
      return;
    }

    const becameVisible = isVisible && !prevVisibleRef.current;
    prevVisibleRef.current = isVisible;

    if (!becameVisible) {
      return;
    }

    // 首屏加载中切回可见时不重复失效；仅响应「从隐藏变为可见」。
    if (initialLoadingRef.current) {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: resourceListRootKey(resourceKey) });
  }, [enabled, isVisible, queryClient, resourceKey]);
}
