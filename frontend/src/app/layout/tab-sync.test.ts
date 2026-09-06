import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../stores/navigation", () => ({
  useNavigationStore: {
    getState: () => ({
      menus: [
        {
          key: "reviewer-audit-pool",
          path: "/reviewer/audit-pool",
          title: "人工审核池",
          closable: true,
          keepAlive: true,
        },
      ],
      routeDefinitions: [],
    }),
  },
}));

vi.mock("../../lib/route-meta", () => ({
  getRouteMetaByPath: (pathname: string) => {
    if (pathname === "/reviewer/audit-pool/review-1") {
      return {
        name: "reviewer-audit-pool-work",
        path: "/reviewer/audit-pool/:reviewId?",
        title: "人工审核池",
        activeMenu: "/reviewer/audit-pool",
        closable: true,
        keepAlive: true,
        cacheKey: "/reviewer/audit-pool/:reviewId?",
      };
    }
    if (pathname === "/owner/ai-review-health/910231000001") {
      return {
        name: "owner-ai-review-health",
        path: "/owner/ai-review-health/:templateId?",
        title: "AI 预审质检大屏",
        activeMenu: "/owner/ai-review-health",
        closable: true,
        keepAlive: true,
        cacheKey: "/owner/ai-review-health",
      };
    }
    return null;
  },
}));

import { useTabWorkspaceStore } from "../../stores/tab-workspace";
import { syncTabWithLocation } from "./tab-sync";

const dashboardTab = {
  key: "/",
  path: "/",
  title: "工作台",
  closable: false,
  affix: true,
  keepAlive: true,
};

beforeEach(() => {
  localStorage.clear();
  useTabWorkspaceStore.setState({ tabs: [dashboardTab], activeKey: "/", recentKeys: ["/"] });
});

describe("syncTabWithLocation", () => {
  it("reuses the list tab key when opening a parameterized work route", () => {
    useTabWorkspaceStore.getState().openTab({
      key: "/reviewer/audit-pool",
      path: "/reviewer/audit-pool",
      title: "人工审核池",
      closable: true,
      keepAlive: true,
    });

    syncTabWithLocation("/reviewer/audit-pool/review-1");

    const { tabs, activeKey } = useTabWorkspaceStore.getState();
    expect(tabs).toHaveLength(2);
    expect(tabs.map((tab) => tab.key)).toEqual(["/", "/reviewer/audit-pool"]);
    expect(activeKey).toBe("/reviewer/audit-pool");
    expect(tabs.find((tab) => tab.key === "/reviewer/audit-pool")?.path).toBe("/reviewer/audit-pool/review-1");
  });

  it("reuses the menu tab key when opening AI review health with templateId", () => {
    useTabWorkspaceStore.getState().openTab({
      key: "/owner/ai-review-health",
      path: "/owner/ai-review-health",
      title: "AI 预审质检大屏",
      closable: true,
      keepAlive: true,
    });

    syncTabWithLocation(
      "/owner/ai-review-health/910231000001",
      "?taskId=910230000001&suggestionId=9",
    );

    const { tabs, activeKey } = useTabWorkspaceStore.getState();
    expect(tabs).toHaveLength(2);
    expect(tabs.map((tab) => tab.key)).toEqual(["/", "/owner/ai-review-health"]);
    expect(activeKey).toBe("/owner/ai-review-health");
    expect(tabs.find((tab) => tab.key === "/owner/ai-review-health")?.path).toBe(
      "/owner/ai-review-health/910231000001?taskId=910230000001&suggestionId=9",
    );
  });
});
