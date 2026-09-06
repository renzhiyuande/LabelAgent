import { hasPermission } from "@/low-code/utils/permissions";
import type { useAuthStore } from "../../stores/auth";
import type { AppMenuItem } from "../navigation/menu-config";

type CurrentUser = ReturnType<typeof useAuthStore.getState>["currentUser"];

export function isMenuPathActive(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function filterVisibleMenuChildren(menu: AppMenuItem, currentUser: CurrentUser) {
  return (menu.children ?? []).filter((child) => !child.permission || hasPermission(currentUser, child.permission));
}

export function menuItemHasVisibleChildren(menu: AppMenuItem, currentUser: CurrentUser) {
  return filterVisibleMenuChildren(menu, currentUser).length > 0;
}

export function resolveDeepestActiveMenuPath(pathname: string, items: AppMenuItem[]): string | null {
  let bestMatch: string | null = null;

  const walk = (nodes: AppMenuItem[]) => {
    for (const node of nodes) {
      if (isMenuPathActive(pathname, node.path) && (!bestMatch || node.path.length > bestMatch.length)) {
        bestMatch = node.path;
      }
      if (node.children?.length) {
        walk(node.children);
      }
    }
  };

  walk(items);
  return bestMatch;
}

export function isMenuBranchActive(pathname: string, menu: AppMenuItem, currentUser: CurrentUser): boolean {
  if (!menuItemHasVisibleChildren(menu, currentUser)) {
    return false;
  }
  if (isMenuPathActive(pathname, menu.path)) {
    return true;
  }
  return filterVisibleMenuChildren(menu, currentUser).some((child) => isMenuBranchActive(pathname, child, currentUser));
}

export function collectExpandedMenuKeys(pathname: string, items: AppMenuItem[], currentUser: CurrentUser): string[] {
  const expanded = new Set<string>();

  const visit = (nodes: AppMenuItem[]): boolean => {
    let subtreeMatches = false;
    for (const node of nodes) {
      const children = filterVisibleMenuChildren(node, currentUser);
      const childMatches = children.length > 0 ? visit(children) : false;
      const selfMatches = isMenuPathActive(pathname, node.path);
      if (childMatches || selfMatches) {
        if (children.length > 0) {
          expanded.add(node.key);
        }
        subtreeMatches = true;
      }
    }
    return subtreeMatches;
  };

  visit(items);
  return [...expanded];
}

export function findMenuNodeContext(
  items: AppMenuItem[],
  targetKey: string,
  currentUser: CurrentUser,
): { item: AppMenuItem; siblings: AppMenuItem[] } | null {
  const visit = (nodes: AppMenuItem[]): { item: AppMenuItem; siblings: AppMenuItem[] } | null => {
    for (const node of nodes) {
      if (node.key === targetKey) {
        return { item: node, siblings: nodes };
      }
      const children = filterVisibleMenuChildren(node, currentUser);
      const found = visit(children);
      if (found) {
        return found;
      }
    }
    return null;
  };

  return visit(items);
}

export function collectExpandableKeysInSubtree(menu: AppMenuItem, currentUser: CurrentUser): string[] {
  if (!menuItemHasVisibleChildren(menu, currentUser)) {
    return [];
  }

  const keys = [menu.key];
  for (const child of filterVisibleMenuChildren(menu, currentUser)) {
    keys.push(...collectExpandableKeysInSubtree(child, currentUser));
  }
  return keys;
}

/** 手风琴：同级仅保留一个展开分支 */
export function toggleAccordionExpandedKeys(
  current: Set<string>,
  rootItems: AppMenuItem[],
  menuKey: string,
  currentUser: CurrentUser,
): Set<string> {
  const context = findMenuNodeContext(rootItems, menuKey, currentUser);
  if (!context) {
    return current;
  }

  const next = new Set(current);
  const subtreeKeys = collectExpandableKeysInSubtree(context.item, currentUser);

  if (next.has(menuKey)) {
    for (const key of subtreeKeys) {
      next.delete(key);
    }
    return next;
  }

  for (const sibling of context.siblings) {
    if (sibling.key === menuKey) {
      continue;
    }
    for (const key of collectExpandableKeysInSubtree(sibling, currentUser)) {
      next.delete(key);
    }
  }

  next.add(menuKey);
  return next;
}
