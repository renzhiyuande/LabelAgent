import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight, RefreshCw, X } from "lucide-react";
import { matchPath, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { cn } from "../../lib/utils";
import { useTabWorkspaceStore } from "../../stores/tab-workspace";
import { useSettingsStore } from "../../stores/settings";
import { refreshCurrentWorkspacePage } from "./workspace-refresh";

/** Tab 的 key 为 pathname，导航需使用带 query 的 path */
function resolveTabNavigatePath(keyOrPath: string): string {
  const tab = useTabWorkspaceStore.getState().tabs.find((item) => item.key === keyOrPath);
  return tab?.path ?? keyOrPath;
}

function isTabActive(tabKey: string, pathname: string): boolean {
  if (tabKey.includes(":")) {
    return Boolean(matchPath({ path: tabKey, end: true }, pathname));
  }
  return tabKey === pathname;
}

export function AppTabsBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tabs = useTabWorkspaceStore((state) => state.tabs);
  const activeKey = useTabWorkspaceStore((state) => state.activeKey);
  const closeTab = useTabWorkspaceStore((state) => state.closeTab);
  const closeOthers = useTabWorkspaceStore((state) => state.closeOthers);
  const closeRight = useTabWorkspaceStore((state) => state.closeRight);
  const tabStyle = useSettingsStore((state) => state.tabStyle);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  const scrollBy = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.clientWidth * 0.6;
    el.scrollBy({ left: direction === "left" ? -distance : distance, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [tabs.length, updateScrollState]);

  function resolveTabActive(tabKey: string) {
    return tabKey === activeKey || isTabActive(tabKey, location.pathname);
  }

  const activeTab = tabs.find((tab) => resolveTabActive(tab.key));

  function handleCloseTab(key: string) {
    const next = closeTab(key);
    if (next) {
      navigate(resolveTabNavigatePath(next));
    }
  }

  function handleCloseOthers(key: string) {
    const next = closeOthers(key);
    navigate(resolveTabNavigatePath(next));
  }

  function handleCloseRight(key: string) {
    const next = closeRight(key);
    navigate(resolveTabNavigatePath(next));
  }

  return (
    <div className="lh-app-tabs flex items-center gap-2 border-b border-border/80 bg-muted/35 px-5 py-2.5 backdrop-blur transition-colors lg:px-7">
      <button
        type="button"
        className={cn(
          "lh-app-tabs-arrow lh-app-tabs-arrow--left",
          !canScrollLeft && "lh-app-tabs-arrow--hidden",
        )}
        onClick={() => scrollBy("left")}
        aria-label="向左滚动标签"
        tabIndex={canScrollLeft ? 0 : -1}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div ref={scrollRef} className="flex flex-1 items-center gap-0.5 overflow-hidden">
        {tabs.map((tab) => {
          const active = resolveTabActive(tab.key);
          return (
            <div
              key={tab.key}
              className={cn(
                "group relative flex min-w-fit items-center gap-1.5 px-3 py-2 text-sm transition-colors duration-100",
                tabStyle === "line"
                  ? active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                  : active
                    ? "rounded-md border border-primary/25 bg-background text-primary shadow-[0_4px_12px_hsl(var(--primary)/0.08)]"
                    : "rounded-md text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              )}
            >
              {/* Active indicator */}
              <span
                className={cn(
                  "absolute inset-x-2 h-0.5 rounded-full transition-all duration-150",
                  tabStyle === "line"
                    ? active
                      ? "bottom-0 bg-primary"
                      : "bottom-0 bg-transparent"
                    : active
                      ? "bottom-0.5 bg-primary"
                      : "bottom-0.5 bg-transparent group-hover:bg-border",
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto rounded px-0 py-0 text-inherit hover:bg-transparent"
                onClick={() => {
                  useTabWorkspaceStore.getState().setActiveKey(tab.key);
                  navigate(tab.path);
                }}
              >
                {tab.title}
              </Button>
              {tab.closable ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 rounded p-0 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                  onClick={() => handleCloseTab(tab.key)}
                >
                  <X className="h-3 w-3" />
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className={cn(
          "lh-app-tabs-arrow lh-app-tabs-arrow--right",
          !canScrollRight && "lh-app-tabs-arrow--hidden",
        )}
        onClick={() => scrollBy("right")}
        aria-label="向右滚动标签"
        tabIndex={canScrollRight ? 0 : -1}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      {activeTab ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-muted-foreground"
              aria-label="标签操作"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleCloseOthers(activeTab.key)}>关闭其他</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCloseRight(activeTab.key)}>关闭右侧</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full text-muted-foreground"
        aria-label="刷新当前页"
        onClick={() => refreshCurrentWorkspacePage(queryClient, location.pathname)}
      >
        <RefreshCw className="h-4 w-4" />
      </Button>
    </div>
  );
}
