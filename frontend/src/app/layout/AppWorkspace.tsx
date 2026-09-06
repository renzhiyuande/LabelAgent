import { memo, useMemo } from "react";
import { Navigate, matchPath, useLocation } from "react-router-dom";
import {
  isSupportedWorkspacePath,
  renderWorkspacePageByMountKey,
  resolveWorkspaceMountKey,
} from "../navigation/workspace-pages";
import { NotFoundPage } from "../../features/error/NotFoundPage";
import { cn } from "../../lib/utils";
import { useKeepAliveStore } from "../../stores/keepalive";
import { useNavigationStore } from "../../stores/navigation";
import { WorkspaceReloadProvider } from "./workspace-reload-context";

/**
 * Memoized section wrapper — prevents full VDOM rebuild of hidden pages
 * when a different tab is activated. Only re-renders when this section's own
 * visibility or version changes (i.e. when it's the one being shown/hidden
 * or force-refreshed). Custom comparator avoids re-render cascade from
 * sibling sections during tab switches.
 */
const WorkspaceSection = memo(
  ({ mountKey, visible, version }: { mountKey: string; visible: boolean; version: number }) => {
    const page = useMemo(() => renderWorkspacePageByMountKey(mountKey), [mountKey, version]);
    return (
      <section
        className={cn(
          "h-full min-h-0 flex-1",
          visible ? "block lh-workspace-pane--active" : "hidden",
        )}
      >
        <WorkspaceReloadProvider version={version}>{page}</WorkspaceReloadProvider>
      </section>
    );
  },
  (prev, next) => prev.mountKey === next.mountKey && prev.visible === next.visible && prev.version === next.version,
);

export function AppWorkspace() {
  const location = useLocation();
  const aliveKeys = useKeepAliveStore((state) => state.lruOrder);
  const versions = useKeepAliveStore((state) => state.versions);
  const routeDefinitions = useNavigationStore((state) => state.routeDefinitions);
  const pathname = location.pathname;

  if (!isSupportedWorkspacePath(pathname)) {
    return <NotFoundPage />;
  }

  const allowedPaths = new Set(routeDefinitions.map((route) => route.meta.path));
  const matchesParamPath = routeDefinitions.some(
    (route) => route.meta.path.includes(":") && matchPath({ path: route.meta.path, end: true }, pathname),
  );
  const visiblePathname = allowedPaths.has(pathname) || matchesParamPath ? pathname : "/";
  const visibleMountKey = resolveWorkspaceMountKey(visiblePathname);

  if (pathname !== visiblePathname) {
    return <Navigate to={visiblePathname} replace />;
  }

  const mountedKeys = Array.from(
    new Set(
      aliveKeys
        .filter((key) => isSupportedWorkspacePath(key))
        .concat(visibleMountKey),
    ),
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {mountedKeys.map((mountKey) => (
        <WorkspaceSection
          key={`${mountKey}:${versions[mountKey] ?? 0}`}
          mountKey={mountKey}
          visible={mountKey === visibleMountKey}
          version={versions[mountKey] ?? 0}
        />
      ))}
    </div>
  );
}
