import { lazy, Suspense, type ReactNode } from "react";
import { AppWorkspaceLoading } from "../../app/layout/AppWorkspaceLoading";
import type { SystemMenuNode } from "../../app/navigation/menu-config";
import { getResourceMeta } from "@/low-code";
import { isRenderableComponentPath, resolveResourceKeyFromComponentPath } from "./component-resolver";
import type { AppRouteDefinition } from "./types";

const LabelerResourcePage = lazy(() => import("@/features/labeler").then((m) => ({ default: m.LabelerResourcePage })));
const ReviewAiQueuePage = lazy(() => import("../../features/review").then((m) => ({ default: m.ReviewAiQueuePage })));
const ReviewAuditPoolPage = lazy(() => import("../../features/review").then((m) => ({ default: m.ReviewAuditPoolPage })));
const SystemDictWorkbenchPage = lazy(() => import("../../features/system/SystemDictWorkbenchPage").then((m) => ({ default: m.SystemDictWorkbenchPage })));
const SystemLlmWorkbenchPage = lazy(() => import("../../features/system/SystemLlmWorkbenchPage").then((m) => ({ default: m.SystemLlmWorkbenchPage })));
const SystemResourcePage = lazy(() => import("../../features/system/SystemResourcePage").then((m) => ({ default: m.SystemResourcePage })));

function LazyWrap({ children }: { children: ReactNode }) {
  return <Suspense fallback={<AppWorkspaceLoading />}>{children}</Suspense>;
}

const LABELER_RESOURCE_KEYS = new Set([
  "labelerMarket",
  "labelerMyWorks",
  "labelerMyTasks",
  "labelerSubmissions",
  "labelerMyDrafts",
  "labelerMySubmitted",
  "labelerMyRewards",
]);

const CUSTOM_PAGE_RENDERERS: Record<string, () => ReactNode> = {
  "pages/dicts": () => <LazyWrap><SystemDictWorkbenchPage /></LazyWrap>,
  "pages/llm-catalog": () => <LazyWrap><SystemLlmWorkbenchPage /></LazyWrap>,
  "pages/llm-providers": () => <LazyWrap><SystemLlmWorkbenchPage /></LazyWrap>,
  "pages/reviewer/ai-queue": () => <LazyWrap><ReviewAiQueuePage /></LazyWrap>,
  "pages/reviewer/audit-pool": () => <LazyWrap><ReviewAuditPoolPage /></LazyWrap>,
};

function renderResourcePage(resourceKey: string): ReactNode {
  if (LABELER_RESOURCE_KEYS.has(resourceKey)) {
    return <LazyWrap><LabelerResourcePage resourceKey={resourceKey} /></LazyWrap>;
  }
  return <LazyWrap><SystemResourcePage resourceKey={resourceKey} /></LazyWrap>;
}

function flattenSystemMenuNodes(nodes: SystemMenuNode[]): SystemMenuNode[] {
  return nodes.flatMap((node) => [node, ...flattenSystemMenuNodes(node.children ?? [])]);
}

function createRouteFromMenuNode(node: SystemMenuNode): AppRouteDefinition | null {
  if (!node.path || !isRenderableComponentPath(node.componentPath)) {
    return null;
  }

  const componentPath = node.componentPath;
  const resourceKey = resolveResourceKeyFromComponentPath(componentPath);
  const customRender = CUSTOM_PAGE_RENDERERS[componentPath];

  if (!resourceKey && !customRender) {
    return null;
  }

  const meta = {
    name: node.routeName || node.menuCode || node.path,
    path: node.path,
    title: node.menuName,
    menuCode: node.menuCode,
    permission: node.permissionCode ?? (resourceKey ? getResourceMeta(resourceKey)?.permissions?.page : undefined),
    keepAlive: true,
    closable: true,
    resourceKey: resourceKey ?? undefined,
  };

  if (customRender) {
    return {
      meta,
      render: customRender,
    };
  }

  if (resourceKey) {
    return {
      meta,
      render: () => renderResourcePage(resourceKey),
    };
  }

  return null;
}

export function buildMenuRoutes(backendMenus: SystemMenuNode[]): AppRouteDefinition[] {
  return flattenSystemMenuNodes(backendMenus)
    .filter((node) => node.visible && !node.disabled && node.status === "ACTIVE")
    .map((node) => createRouteFromMenuNode(node))
    .filter((route): route is AppRouteDefinition => route != null);
}
