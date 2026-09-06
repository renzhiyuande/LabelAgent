export type { AppRouteDefinition, AppRouteMeta } from "./types";
export { buildMenuRoutes } from "./build-menu-routes";
export { resolveResourceKeyFromComponentPath } from "./component-resolver";
export { localWorkspaceRoutes } from "./local-routes";
export {
  getRegisteredSystemRoutePaths,
  getRouteMetaByPath,
  getWorkspaceRouteDefinitions,
  isSupportedWorkspacePath,
  renderWorkspacePage,
  renderWorkspacePageByMountKey,
  resolveRoutePermission,
  resolveWorkspaceMountKey,
} from "./registry";
