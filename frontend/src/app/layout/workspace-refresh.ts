import type { QueryClient } from "@tanstack/react-query";
import { flushSync } from "react-dom";
import { resourceListRootKey } from "@/low-code/adapters/query-keys";
import { getRouteMetaByPath, resolveWorkspaceMountKey } from "../../lib/route-meta";
import { useKeepAliveStore } from "../../stores/keepalive";

export function refreshCurrentWorkspacePage(queryClient: QueryClient, pathname: string) {
  const mountKey = resolveWorkspaceMountKey(pathname);
  const routeMeta = getRouteMetaByPath(pathname);
  const resourceKey = routeMeta?.resourceKey;
  if (resourceKey) {
    void queryClient.cancelQueries({ queryKey: resourceListRootKey(resourceKey) });
  }
  flushSync(() => {
    useKeepAliveStore.getState().clear(mountKey);
  });
}
