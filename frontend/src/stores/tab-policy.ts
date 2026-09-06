import type { TabItem } from "./tab-workspace";

export const MAX_OPEN_TABS = 8;
/** 同时保持 KeepAlive 挂载的页面数上限（≤ MAX_OPEN_TABS）
 *  用户可打开 8 个标签，但只有最近使用的 N 个页面保持 DOM 挂载，
 *  其余标签在重新激活时 remount，避免过多后台页面累积订阅和定时器开销 */
export const MAX_KEEP_ALIVE_TABS = 5;

export function moveKeyToFront(keys: string[], key: string): string[] {
  return [key, ...keys.filter((item) => item !== key)];
}

export function dedupeKeys(keys: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const key of keys) {
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    next.push(key);
  }
  return next;
}

export function normalizeRecentKeys(keys: string[], tabs: TabItem[]): string[] {
  const validKeys = new Set(tabs.map((tab) => tab.key));
  return dedupeKeys(keys.filter((key) => validKeys.has(key)));
}

export function selectEvictionCandidate(
  tabs: TabItem[],
  recentKeys: string[],
  protectedKey?: string,
): string | null {
  for (let index = recentKeys.length - 1; index >= 0; index -= 1) {
    const key = recentKeys[index];
    if (key === protectedKey) {
      continue;
    }
    const tab = tabs.find((item) => item.key === key);
    if (tab?.closable) {
      return key;
    }
  }

  for (let index = tabs.length - 1; index >= 0; index -= 1) {
    const tab = tabs[index];
    if (tab.key === protectedKey) {
      continue;
    }
    if (tab.closable) {
      return tab.key;
    }
  }

  return null;
}

export function pruneClosableTabs(tabs: TabItem[], recentKeys: string[], limit = MAX_OPEN_TABS) {
  let nextTabs = tabs;
  let nextRecent = recentKeys;
  const evictedTabs: TabItem[] = [];

  while (nextTabs.filter((tab) => tab.closable).length > limit) {
    const victimKey = selectEvictionCandidate(nextTabs, nextRecent);
    if (!victimKey) {
      break;
    }
    const victim = nextTabs.find((item) => item.key === victimKey);
    if (!victim) {
      break;
    }
    evictedTabs.push(victim);
    nextTabs = nextTabs.filter((tab) => tab.key !== victimKey);
    nextRecent = nextRecent.filter((key) => key !== victimKey);
  }

  return { tabs: nextTabs, recentKeys: nextRecent, evictedTabs };
}
