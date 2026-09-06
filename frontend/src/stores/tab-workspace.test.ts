import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./tab-policy", async () => {
  const actual = await vi.importActual<typeof import("./tab-policy")>("./tab-policy");
  return {
    ...actual,
    MAX_OPEN_TABS: 3,
    MAX_KEEP_ALIVE_TABS: 3,
  };
});

import { useKeepAliveStore } from "./keepalive";
import { useTabWorkspaceStore } from "./tab-workspace";

const dashboardTab = {
  key: "/",
  path: "/",
  title: "工作台",
  closable: false,
  affix: true,
  keepAlive: true,
};

function resetStores() {
  localStorage.clear();
  useKeepAliveStore.setState({ activeKeys: [], versions: {}, lruOrder: [] } as any);
  useTabWorkspaceStore.setState({ tabs: [dashboardTab], activeKey: "/", recentKeys: ["/"] } as any);
}

function openTab(key: string) {
  useTabWorkspaceStore.getState().openTab({
    key,
    path: key,
    title: key,
    closable: true,
    keepAlive: true,
  });
}

beforeEach(() => {
  resetStores();
});

describe("tab workspace lru", () => {
  it("evicts the least recently used closable tab when the limit is exceeded", () => {
    openTab("/a");
    openTab("/b");
    openTab("/c");
    openTab("/d");

    expect(useTabWorkspaceStore.getState().tabs.map((tab) => tab.key)).toEqual(["/", "/b", "/c", "/d"]);
    expect(useKeepAliveStore.getState().lruOrder).toEqual(["/d", "/c", "/b"]);
    expect(useKeepAliveStore.getState().versions["/a"]).toBe(1);
  });

  it("prefers the most recently used tab when choosing an eviction candidate", () => {
    openTab("/a");
    openTab("/b");
    openTab("/c");

    useTabWorkspaceStore.getState().setActiveKey("/a");
    openTab("/d");

    expect(useTabWorkspaceStore.getState().tabs.map((tab) => tab.key)).toEqual(["/", "/a", "/c", "/d"]);
    expect(useKeepAliveStore.getState().lruOrder[0]).toBe("/d");
    expect(useKeepAliveStore.getState().lruOrder).toContain("/a");
    expect(useKeepAliveStore.getState().lruOrder).not.toContain("/b");
  });

  it("clears keep-alive cache when a tab is closed", () => {
    openTab("/a");
    const before = useKeepAliveStore.getState().versions["/a"] ?? 0;

    useTabWorkspaceStore.getState().closeTab("/a");

    expect(useTabWorkspaceStore.getState().tabs.map((tab) => tab.key)).toEqual(["/"]);
    expect(useKeepAliveStore.getState().lruOrder).not.toContain("/a");
    expect(useKeepAliveStore.getState().versions["/a"]).toBe(before + 1);
  });
});
