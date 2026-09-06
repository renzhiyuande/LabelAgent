import { useEffect } from "react";
import { matchPath, Outlet, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useAppShellStore } from "../../stores/app-shell";
import { useSettingsStore } from "../../stores/settings";
import { useTabWorkspaceStore } from "../../stores/tab-workspace";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { AppTabsBar } from "./AppTabsBar";
import { isFlushWorkbenchPath, isWorkbenchShellPath } from "./flush-workbench-path";
import { repairActiveMenuTabs, syncTabWithLocation } from "./tab-sync";

export function AppLayout() {
  const location = useLocation();
  const enableMultiTabs = useSettingsStore((state) => state.enableMultiTabs);
  const focusMode = useAppShellStore((state) => state.focusMode);
  const exitFocusMode = useAppShellStore((state) => state.exitFocusMode);
  const isFlushWorkbenchPage = isFlushWorkbenchPath(location.pathname);
  const isAiReviewObservabilityPage = Boolean(
    matchPath({ path: "/owner/ai-review-observability", end: true }, location.pathname)
      || matchPath({ path: "/system/ai-review-observability", end: true }, location.pathname),
  );
  const flushMainPadding = focusMode || isFlushWorkbenchPage;

  useEffect(() => {
    repairActiveMenuTabs();
  }, []);

  useEffect(() => {
    if (enableMultiTabs) {
      syncTabWithLocation(location.pathname, location.search);
    }
  }, [enableMultiTabs, location.pathname, location.search]);

  useEffect(() => {
    if (enableMultiTabs) {
      return;
    }
    const tabState = useTabWorkspaceStore.getState();
    const closableCount = tabState.tabs.filter((tab) => tab.closable).length;
    if (closableCount > 0) {
      tabState.closeOthers(tabState.activeKey);
    }
  }, [enableMultiTabs]);

  // KeepAlive 切 tab 时组件不卸载，需在路由层退出禅模式，避免侧栏/顶栏与 padding 状态泄漏
  useEffect(() => {
    if (!isWorkbenchShellPath(location.pathname) && focusMode) {
      exitFocusMode();
    }
  }, [exitFocusMode, focusMode, location.pathname]);

  return (
    <div className="lh-app-shell flex h-screen overflow-hidden">
      {!focusMode ? <AppSidebar /> : null}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {!focusMode ? <AppHeader /> : null}
        {!focusMode && enableMultiTabs ? <AppTabsBar /> : null}
        <main
          className={cn(
            "lh-app-main min-h-0 flex-1",
            flushMainPadding
              ? "flex min-h-0 flex-1 flex-col overflow-hidden !p-0"
              : isAiReviewObservabilityPage
                ? "flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-5 lg:px-7"
                : "overflow-y-auto overflow-x-hidden px-6 py-5 lg:px-7",
          )}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
