import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useKeepAliveStore } from "./keepalive";
import {
  MAX_OPEN_TABS,
  moveKeyToFront,
  normalizeRecentKeys,
  pruneClosableTabs,
} from "./tab-policy";

export interface TabItem {
  key: string;
  title: string;
  path: string;
  closable: boolean;
  affix?: boolean;
  keepAlive?: boolean;
  cacheKey?: string;
}

interface TabWorkspaceState {
  tabs: TabItem[];
  activeKey: string;
  recentKeys: string[];
  openTab: (tab: TabItem) => void;
  closeTab: (key: string) => string | null;
  closeOthers: (key: string) => string;
  closeRight: (key: string) => string;
  setActiveKey: (key: string) => void;
}

const dashboardTab: TabItem = {
  key: "/",
  path: "/",
  title: "工作台",
  closable: false,
  affix: true,
  keepAlive: true,
};

function normalizeTabs(tabs: TabItem[]): TabItem[] {
  const hasDashboard = tabs.some((tab) => tab.key === dashboardTab.key);
  const nextTabs = hasDashboard ? tabs : [dashboardTab, ...tabs];
  return nextTabs.map((tab) => (tab.key === dashboardTab.key ? { ...dashboardTab, ...tab, closable: false, affix: true } : tab));
}

function normalizeRecentTabs(tabs: TabItem[], recentKeys: string[] | undefined): string[] {
  if (recentKeys && recentKeys.length > 0) {
    return normalizeRecentKeys(recentKeys, tabs);
  }
  return [...tabs].reverse().map((tab) => tab.key);
}

function syncKeepAliveCache(keys: string[]) {
  const keepAliveStore = useKeepAliveStore.getState();
  for (const key of keys) {
    keepAliveStore.clear(key);
  }
}

export const useTabWorkspaceStore = create<TabWorkspaceState>()(
  persist(
    (set, get) => ({
      tabs: [dashboardTab],
      activeKey: "/",
      recentKeys: [dashboardTab.key],
      openTab: (tab) => {
        const evictedTabs: TabItem[] = [];
        set((current) => {
          const existingIndex = current.tabs.findIndex((item) => item.key === tab.key);
          const nextTabs = [...current.tabs];
          if (existingIndex >= 0) {
            const currentTab = current.tabs[existingIndex];
            const sameTab =
              currentTab.path === tab.path &&
              currentTab.title === tab.title &&
              currentTab.closable === tab.closable &&
              currentTab.affix === tab.affix &&
              currentTab.keepAlive === tab.keepAlive &&
              currentTab.cacheKey === tab.cacheKey;
            if (sameTab && current.activeKey === tab.key) {
              return current;
            }
            nextTabs[existingIndex] = { ...currentTab, ...tab };
          } else {
            nextTabs.push(tab);
          }

          const nextRecent = moveKeyToFront(current.recentKeys, tab.key);
          const pruned = pruneClosableTabs(nextTabs, nextRecent, MAX_OPEN_TABS);
          evictedTabs.push(...pruned.evictedTabs);
          if (pruned.evictedTabs.length > 0) {
            return {
              tabs: pruned.tabs,
              activeKey: tab.key,
              recentKeys: pruned.recentKeys,
            };
          }

          return {
            tabs: pruned.tabs,
            activeKey: tab.key,
            recentKeys: pruned.recentKeys,
          };
        });

        for (const evictedTab of evictedTabs) {
          if (evictedTab.keepAlive) {
            useKeepAliveStore.getState().clear(evictedTab.key);
          }
        }
        if (tab.keepAlive) {
          useKeepAliveStore.getState().activate(tab.key);
        }
      },
      closeTab: (key) => {
        const current = get();
        const target = current.tabs.find((item) => item.key === key);
        if (!target || !target.closable) {
          return current.activeKey;
        }
        const nextTabs = current.tabs.filter((item) => item.key !== key);
        const nextRecent = current.recentKeys.filter((item) => item !== key);
        const nextActive =
          current.activeKey === key
            ? nextRecent.find((item) => nextTabs.some((tab) => tab.key === item)) ?? nextTabs[nextTabs.length - 1]?.key ?? dashboardTab.key
            : current.activeKey;
        set({ tabs: nextTabs, activeKey: nextActive, recentKeys: nextRecent });
        if (target.keepAlive) {
          useKeepAliveStore.getState().clear(key);
        }
        return nextActive;
      },
      closeOthers: (key) => {
        const current = get();
        const removedTabs = current.tabs.filter((tab) => tab.closable && tab.key !== key);
        const nextTabs = current.tabs.filter((tab) => !tab.closable || tab.key === key);
        const nextRecent = current.recentKeys.filter((item) => nextTabs.some((tab) => tab.key === item));
        set({ tabs: nextTabs, activeKey: key, recentKeys: nextRecent });
        syncKeepAliveCache(removedTabs.filter((tab) => tab.keepAlive).map((tab) => tab.key));
        return key;
      },
      closeRight: (key) => {
        const current = get();
        const index = current.tabs.findIndex((tab) => tab.key === key);
        const removedTabs = current.tabs.filter((tab, tabIndex) => tab.closable && tabIndex > index);
        const nextTabs = current.tabs.filter((tab, tabIndex) => !tab.closable || tabIndex <= index);
        const nextRecent = current.recentKeys.filter((item) => nextTabs.some((tab) => tab.key === item));
        set({ tabs: nextTabs, activeKey: key, recentKeys: nextRecent });
        syncKeepAliveCache(removedTabs.filter((tab) => tab.keepAlive).map((tab) => tab.key));
        return key;
      },
      setActiveKey: (key) =>
        set((current) => ({
          activeKey: key,
          recentKeys: moveKeyToFront(current.recentKeys, key),
        })),
    }),
    {
      name: "labelhub.tabWorkspace",
      partialize: (state) => ({
        tabs: state.tabs,
        activeKey: state.activeKey,
        recentKeys: state.recentKeys,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<TabWorkspaceState> | undefined;
        const tabs = normalizeTabs(persistedState?.tabs ?? current.tabs);
        const recentKeys = normalizeRecentTabs(tabs, persistedState?.recentKeys);
        const pruned = pruneClosableTabs(tabs, recentKeys, MAX_OPEN_TABS);
        const activeKey = pruned.tabs.some((tab) => tab.key === persistedState?.activeKey)
          ? (persistedState?.activeKey as string)
          : pruned.tabs[pruned.tabs.length - 1]?.key ?? dashboardTab.key;
        return {
          ...current,
          ...persistedState,
          tabs: pruned.tabs,
          activeKey,
          recentKeys: pruned.recentKeys,
        };
      },
    },
  ),
);
