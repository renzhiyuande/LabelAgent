import { createContext, useContext, type ReactNode } from "react";

const WorkspaceReloadContext = createContext(0);

export function WorkspaceReloadProvider({
  version,
  children,
}: {
  version: number;
  children: ReactNode;
}) {
  return <WorkspaceReloadContext.Provider value={version}>{children}</WorkspaceReloadContext.Provider>;
}

/** keepAlive 强制刷新时递增，用于列表 queryKey 换 key，避免复用 stale 缓存且无需 invalidate。 */
export function useWorkspaceReloadToken() {
  return useContext(WorkspaceReloadContext);
}
