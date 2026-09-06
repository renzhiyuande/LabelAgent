import { getRouteMetaByPath, getWorkspaceRouteDefinitions } from "../../lib/route-meta";
import { findMenuByPath, type AppMenuItem } from "../navigation/menu-config";
import { useNavigationStore } from "../../stores/navigation";
import { useSettingsStore } from "../../stores/settings";
import { useTabWorkspaceStore, type TabItem } from "../../stores/tab-workspace";

function buildActiveMenuKeyMap(): Map<string, string> {
  const activeMenuByRoutePattern = new Map<string, string>();
  for (const route of getWorkspaceRouteDefinitions()) {
    if (route.meta.activeMenu) {
      activeMenuByRoutePattern.set(route.meta.path, route.meta.activeMenu);
    }
  }
  return activeMenuByRoutePattern;
}

/** 合并历史持久化产生的「列表页 + 工作台」重复标签 */
export function repairActiveMenuTabs() {
  const activeMenuByRoutePattern = buildActiveMenuKeyMap();
  if (activeMenuByRoutePattern.size === 0) {
    return;
  }

  const state = useTabWorkspaceStore.getState();
  const merged = new Map<string, TabItem>();
  for (const tab of state.tabs) {
    const canonicalKey = activeMenuByRoutePattern.get(tab.key) ?? tab.key;
    const nextTab = canonicalKey === tab.key ? tab : { ...tab, key: canonicalKey };
    const existing = merged.get(canonicalKey);
    if (!existing) {
      merged.set(canonicalKey, nextTab);
      continue;
    }
    merged.set(canonicalKey, nextTab.path.length > existing.path.length ? nextTab : existing);
  }

  const tabs = [...merged.values()];
  const changed =
    tabs.length !== state.tabs.length ||
    tabs.some((tab, index) => tab.key !== state.tabs[index]?.key || tab.path !== state.tabs[index]?.path);
  if (!changed) {
    return;
  }

  const canonicalActiveKey = activeMenuByRoutePattern.get(state.activeKey) ?? state.activeKey;
  const activeKey = tabs.some((tab) => tab.key === canonicalActiveKey)
    ? canonicalActiveKey
    : (tabs.find((tab) => tab.key === state.activeKey)?.key ?? state.activeKey);
  const recentKeys = state.recentKeys
    .map((key) => activeMenuByRoutePattern.get(key) ?? key)
    .filter((key, index, keys) => tabs.some((tab) => tab.key === key) && keys.indexOf(key) === index);

  useTabWorkspaceStore.setState({ tabs, activeKey, recentKeys });
}

export function openTabForMenu(menu: AppMenuItem, search = "") {
  useTabWorkspaceStore.getState().openTab({
    key: menu.path,
    path: `${menu.path}${search}`,
    title: menu.title,
    closable: menu.closable ?? true,
    affix: menu.affix,
    keepAlive: menu.keepAlive,
  });
}

export function syncTabWithLocation(pathname: string, search = "") {
  if (!useSettingsStore.getState().enableMultiTabs) {
    return;
  }

  if (pathname === "/403") {
    return;
  }

  const routeMeta = getRouteMetaByPath(pathname);
  if (routeMeta?.hideInTabs) {
    return;
  }

  const fullPath = `${pathname}${search}`;
  const menus = useNavigationStore.getState().menus;
  const menu = findMenuByPath(menus, pathname);

  if (menu) {
    openTabForMenu(menu, search);
    return;
  }

  if (routeMeta) {
    const tabKey = routeMeta.activeMenu ?? routeMeta.path;
    const activeMenu = routeMeta.activeMenu ? findMenuByPath(menus, routeMeta.activeMenu) : null;
    useTabWorkspaceStore.getState().openTab({
      key: tabKey,
      path: fullPath,
      title: activeMenu?.title ?? routeMeta.title,
      closable: activeMenu?.closable ?? routeMeta.closable ?? true,
      affix: activeMenu?.affix ?? routeMeta.affix,
      keepAlive: activeMenu?.keepAlive ?? routeMeta.keepAlive,
      cacheKey: routeMeta.cacheKey,
    });
  }
}
