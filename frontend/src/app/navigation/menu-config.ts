import { Activity, Beaker, Bot, CheckSquare, LayoutDashboard, Users, type LucideIcon } from "lucide-react";
import { iconForMenu } from "./menu-icons";

export interface SystemMenuNode {
  id: number;
  menuCode: string;
  menuName: string;
  menuType: string;
  parentId: number;
  path: string;
  routeName: string;
  componentPath: string;
  icon: string;
  permissionCode: string | null;
  visible: boolean;
  disabled: boolean;
  sortNo: number;
  status: string;
  keepAlive: boolean;
  affix: boolean;
  children: SystemMenuNode[];
}

export interface AppMenuItem {
  key: string;
  path: string;
  title: string;
  group?: string;
  icon?: LucideIcon;
  permission?: string | string[];
  componentPath?: string;
  children?: AppMenuItem[];
  keepAlive?: boolean;
  closable?: boolean;
  affix?: boolean;
  source?: "backend" | "local" | "dev";
}

export interface LocalMenuInjection extends AppMenuItem {
  parentPath?: string;
  mode: "always" | "dev";
  position?: "prepend" | "append";
}

const localMenuInjections: LocalMenuInjection[] = [
  {
    key: "dashboard",
    path: "/",
    title: "工作台",
    group: "数据生产",
    icon: LayoutDashboard,
    keepAlive: true,
    closable: false,
    affix: true,
    source: "local",
    mode: "always",
    position: "prepend",
  },
  {
    key: "system-low-code-lab",
    path: "/system/low-code-lab",
    title: "低代码实验场",
    icon: Beaker,
    permission: "system:admin",
    keepAlive: true,
    closable: true,
    source: "dev",
    parentPath: "/system",
    mode: "dev",
    position: "append",
  },
  {
    key: "owner-ai-review-health",
    path: "/owner/ai-review-health",
    title: "AI 预审质检大屏",
    icon: Activity,
    permission: ["system:admin", "business:submission:read"],
    keepAlive: true,
    closable: true,
    source: "local",
    mode: "always",
    parentPath: "/owner",
    position: "append",
  },
  {
    key: "owner-ai-review-observability",
    path: "/owner/ai-review-observability",
    title: "AI 审核大屏",
    icon: Activity,
    permission: ["system:admin", "business:ai-review:observe:owner", "business:submission:read"],
    keepAlive: true,
    closable: true,
    source: "local",
    mode: "always",
    parentPath: "/owner",
    position: "append",
  },
  {
    key: "admin-ai-review-observability",
    path: "/system/ai-review-observability",
    title: "AI 审核大屏",
    icon: Activity,
    permission: ["system:admin", "business:ai-review:observe:admin"],
    keepAlive: true,
    closable: true,
    source: "local",
    mode: "always",
    parentPath: "/system",
    position: "append",
  },
  {
    key: "reviewer-root",
    path: "/reviewer",
    title: "审核工作台",
    group: "审核与质检",
    icon: CheckSquare,
    permission: "business:reviewer:workbench",
    keepAlive: false,
    closable: false,
    source: "local",
    mode: "dev",
    position: "append",
    children: [
      {
        key: "reviewer-ai-queue",
        path: "/reviewer/ai-queue",
        title: "AI 审核队列",
        icon: Bot,
        permission: "business:reviewer:workbench",
        keepAlive: true,
        closable: true,
        source: "local",
      },
      {
        key: "reviewer-audit-pool",
        path: "/reviewer/audit-pool",
        title: "人工审核池",
        icon: Users,
        permission: "business:reviewer:workbench",
        keepAlive: true,
        closable: true,
        source: "local",
      },
      {
        key: "reviewer-review-results",
        path: "/reviewer/review-results",
        title: "审核结果",
        icon: CheckSquare,
        permission: "business:reviewer:workbench",
        keepAlive: true,
        closable: true,
        source: "local",
      },
    ],
  },
];

function cloneMenuItem(item: AppMenuItem): AppMenuItem {
  return {
    ...item,
    children: item.children?.map(cloneMenuItem),
  };
}

function isLayoutMenu(componentPath?: string | null): boolean {
  return Boolean(componentPath?.startsWith("layouts/"));
}

function mapBackendMenu(node: SystemMenuNode, depth = 0): AppMenuItem | null {
  if (!node.visible || node.disabled || node.status !== "ACTIVE" || !node.path) {
    return null;
  }

  const children = (node.children ?? [])
    .map((child) => mapBackendMenu(child, depth + 1))
    .filter((child): child is AppMenuItem => child != null);
  const hasChildren = children.length > 0;
  const layoutMenu = isLayoutMenu(node.componentPath);

  return {
    key: node.routeName || node.menuCode || node.path,
    path: node.path,
    title: node.menuName,
    icon: iconForMenu(node.icon),
    permission: node.permissionCode ?? undefined,
    componentPath: node.componentPath || undefined,
    keepAlive: node.keepAlive || (!hasChildren && !layoutMenu),
    closable: !layoutMenu && (depth > 0 || !hasChildren),
    affix: node.affix,
    children,
    source: "backend",
  };
}

function hasMenuPath(items: AppMenuItem[], path: string): boolean {
  return items.some((item) => item.path === path || hasMenuPath(item.children ?? [], path));
}

function injectIntoTree(items: AppMenuItem[], injection: LocalMenuInjection): AppMenuItem[] {
  if (hasMenuPath(items, injection.path)) {
    return items;
  }

  const nextItem = cloneMenuItem(injection);
  delete (nextItem as { parentPath?: string }).parentPath;
  delete (nextItem as { mode?: string }).mode;
  delete (nextItem as { position?: string }).position;

  if (!injection.parentPath) {
    return injection.position === "prepend" ? [nextItem, ...items] : [...items, nextItem];
  }

  let inserted = false;
  const nextItems = items.map((item) => {
    if (item.path === injection.parentPath) {
      inserted = true;
      const children = item.children ?? [];
      return {
        ...item,
        children: injection.position === "prepend" ? [nextItem, ...children] : [...children, nextItem],
      };
    }
    if (!item.children?.length) {
      return item;
    }
    const nextChildren = injectIntoTree(item.children, injection);
    if (nextChildren !== item.children) {
      inserted = true;
      return { ...item, children: nextChildren };
    }
    return item;
  });

  // parentPath 注入：仅挂在匹配的父节点下；找不到则跳过，避免递归层误追加到每个子树
  return inserted ? nextItems : items;
}

export function buildNavigationMenus(backendMenus: SystemMenuNode[]): AppMenuItem[] {
  let menus = backendMenus
    .map((item) => mapBackendMenu(item))
    .filter((item): item is AppMenuItem => item != null);

  for (const injection of localMenuInjections) {
    if (injection.mode === "dev" && !import.meta.env.DEV) {
      continue;
    }
    menus = injectIntoTree(menus, injection);
  }

  return menus;
}

export function flattenMenus(items: AppMenuItem[]): AppMenuItem[] {
  return items.flatMap((item) => [item, ...flattenMenus(item.children ?? [])]);
}

export function findMenuByPath(items: AppMenuItem[], path: string): AppMenuItem | null {
  for (const item of items) {
    if (item.path === path) {
      return item;
    }
    const child = findMenuByPath(item.children ?? [], path);
    if (child) {
      return child;
    }
  }
  return null;
}

export function findParentMenuByPath(items: AppMenuItem[], path: string): AppMenuItem | null {
  for (const item of items) {
    if (item.children?.some((child) => child.path === path)) {
      return item;
    }
    const nested = findParentMenuByPath(item.children ?? [], path);
    if (nested) {
      return nested;
    }
  }
  return null;
}
