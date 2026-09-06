import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LabelHubLogo } from "@/components/brand/LabelHubLogo";
import { Button } from "../../components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../../components/ui/hover-card";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../components/ui/tooltip";
import { cn } from "../../lib/utils";
import { hasPermission } from "@/low-code/utils/permissions";
import { useAppShellStore } from "../../stores/app-shell";
import { useAuthStore } from "../../stores/auth";
import { useNavigationStore } from "../../stores/navigation";

import type { AppMenuItem } from "../navigation/menu-config";
import { AppSidebarEdgeToggle } from "./AppSidebarEdgeToggle";
import { AppSidebarMenuNode, CollapsedSidebarMenuTree } from "./AppSidebarMenuNode";
import { SidebarRevealText } from "./sidebar-reveal";
import {
  collectExpandedMenuKeys,
  isMenuBranchActive,
  menuItemHasVisibleChildren,
  resolveDeepestActiveMenuPath,
  toggleAccordionExpandedKeys,
} from "./sidebar-menu-utils";

interface CollapsedParentMenuProps {
  menu: AppMenuItem;
  active: boolean;
  currentUser: ReturnType<typeof useAuthStore.getState>["currentUser"];
  pathname: string;
  activePath: string | null;
}

function CollapsedParentMenu({ menu, active, currentUser, pathname, activePath }: CollapsedParentMenuProps) {
  const Icon = menu.icon;
  const branchActive = active || isMenuBranchActive(pathname, menu, currentUser);
  const [flyoutExpandedKeys, setFlyoutExpandedKeys] = useState<Set<string>>(() => new Set());

  const handleFlyoutOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        return;
      }
      const autoExpanded = collectExpandedMenuKeys(pathname, menu.children ?? [], currentUser);
      setFlyoutExpandedKeys(new Set(autoExpanded));
    },
    [pathname, menu.children, currentUser],
  );

  const toggleFlyoutExpanded = useCallback(
    (menuKey: string) => {
      setFlyoutExpandedKeys((current) =>
        toggleAccordionExpandedKeys(current, menu.children ?? [], menuKey, currentUser),
      );
    },
    [currentUser, menu.children],
  );

  return (
    <HoverCard openDelay={80} closeDelay={120} onOpenChange={handleFlyoutOpenChange}>
      <HoverCardTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "relative flex h-auto w-full min-w-0 items-center justify-center rounded-2xl px-0 py-3 text-sm font-semibold transition-colors",
            branchActive
              ? "bg-primary/10 text-primary dark:bg-primary/12 dark:text-primary/80"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
          aria-label={menu.title}
        >
          {Icon ? <Icon className="h-4 w-4" /> : null}
          {branchActive ? (
            <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
          ) : null}
        </Button>
      </HoverCardTrigger>
      <HoverCardContent
        side="right"
        align="start"
        sideOffset={8}
        className={cn(
          "max-h-[min(70vh,480px)] w-56 overflow-y-auto rounded-2xl border border-border bg-card p-2 shadow-md lh-scrollbar-none",
        )}
      >
        <p className="truncate px-2 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground">{menu.title}</p>
        <div className="space-y-0.5">
          <CollapsedSidebarMenuTree
            items={menu.children ?? []}
            pathname={pathname}
            activePath={activePath}
            currentUser={currentUser}
            expandedKeys={flyoutExpandedKeys}
            onToggleExpanded={toggleFlyoutExpanded}
          />
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

interface SidebarLeafMenuProps {
  menu: AppMenuItem;
  collapsed: boolean;
}

function SidebarLeafMenu({ menu, collapsed }: SidebarLeafMenuProps) {
  const location = useLocation();
  const Icon = menu.icon;
  const isActive = location.pathname === menu.path || location.pathname.startsWith(`${menu.path}/`);

  const link = (
    <NavLink
      to={menu.path}
      className={cn(
        "relative flex min-w-0 items-center rounded-2xl text-sm font-medium transition-[colors,padding,gap] duration-150 ease-out",
        collapsed ? "justify-center gap-0 px-0 py-3" : "gap-3 px-3 py-3",
        isActive
          ? "bg-primary/10 text-primary before:absolute before:left-0 before:top-2 before:h-[calc(100%-16px)] before:w-[3px] before:rounded-r-full before:bg-primary dark:bg-primary/12 dark:text-primary/80 dark:before:bg-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
      <SidebarRevealText collapsed={collapsed}>{menu.title}</SidebarRevealText>
      {collapsed && isActive ? (
        <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
      ) : null}
    </NavLink>
  );

  if (!collapsed) {
    return link;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{menu.title}</TooltipContent>
    </Tooltip>
  );
}

export function AppSidebar() {
  const location = useLocation();
  const currentUser = useAuthStore((state) => state.currentUser);
  const menus = useNavigationStore((state) => state.menus);
  const collapsed = useAppShellStore((state) => state.sidebarCollapsed);
  const sidebarSheetOpen = useAppShellStore((state) => state.sidebarSheetOpen);
  const closeSidebarSheet = useAppShellStore((state) => state.closeSidebarSheet);
  /** 移动端抽屉打开时始终展示完整菜单，不受桌面折叠状态影响 */
  const effectiveCollapsed = collapsed && !sidebarSheetOpen;
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());
  const visibleMenus = useMemo(
    () => menus.filter((menu) => !menu.permission || hasPermission(currentUser, menu.permission)),
    [currentUser, menus],
  );
  const activePath = useMemo(
    () => resolveDeepestActiveMenuPath(location.pathname, visibleMenus),
    [location.pathname, visibleMenus],
  );
  const groupedMenus = useMemo(
    () =>
      visibleMenus.reduce<Array<{ group: string; items: typeof visibleMenus }>>((accumulator, menu) => {
        const group = menu.group ?? "工作区";
        const existing = accumulator.find((item) => item.group === group);
        if (existing) {
          existing.items.push(menu);
          return accumulator;
        }
        accumulator.push({ group, items: [menu] });
        return accumulator;
      }, []),
    [visibleMenus],
  );

  useEffect(() => {
    const autoExpanded = collectExpandedMenuKeys(location.pathname, visibleMenus, currentUser);
    setExpandedKeys(new Set(autoExpanded));
  }, [location.pathname, visibleMenus, currentUser]);

  const prevEffectiveCollapsedRef = useRef(effectiveCollapsed);
  useEffect(() => {
    if (prevEffectiveCollapsedRef.current && !effectiveCollapsed) {
      const autoExpanded = collectExpandedMenuKeys(location.pathname, visibleMenus, currentUser);
      setExpandedKeys(new Set(autoExpanded));
    }
    prevEffectiveCollapsedRef.current = effectiveCollapsed;
  }, [effectiveCollapsed, location.pathname, visibleMenus, currentUser]);

  useEffect(() => {
    closeSidebarSheet();
  }, [closeSidebarSheet, location.pathname]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const handleDesktop = () => {
      if (media.matches) {
        closeSidebarSheet();
      }
    };
    handleDesktop();
    media.addEventListener("change", handleDesktop);
    return () => media.removeEventListener("change", handleDesktop);
  }, [closeSidebarSheet]);

  const toggleExpanded = useCallback(
    (menuKey: string) => {
      setExpandedKeys((current) => toggleAccordionExpandedKeys(current, visibleMenus, menuKey, currentUser));
    },
    [currentUser, visibleMenus],
  );

  return (
    <>
      <div
        className={cn(
          "lh-app-sidebar-backdrop fixed inset-0 z-30 bg-background/40 backdrop-blur-sm transition-opacity md:hidden",
          sidebarSheetOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={closeSidebarSheet}
      />
      <div className="max-md:contents md:relative md:z-30 md:flex md:shrink-0">
        <aside
          className={cn(
            "lh-app-sidebar flex h-screen shrink-0 flex-col overflow-hidden border-r border-border/80 bg-card/92 text-foreground",
            collapsed ? "w-[84px]" : "w-[260px]",
            "max-md:fixed max-md:left-0 max-md:top-0 max-md:z-40 max-md:w-[86vw] max-md:max-w-[320px] max-md:overflow-hidden max-md:shadow-[0_24px_60px_hsl(var(--foreground)/0.18)]",
            sidebarSheetOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full",
          )}
        >
          <div
            className={cn(
              "lh-app-sidebar-brand flex h-16 min-w-0 items-center border-b border-border px-4",
              effectiveCollapsed && "justify-center px-3",
            )}
          >
            <div className={cn("flex min-w-0 items-center gap-3", effectiveCollapsed && "justify-center")}>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-[0_8px_18px_hsl(var(--primary)/0.12)] dark:bg-primary/15 dark:text-primary/80">
                <LabelHubLogo size={34} />
              </div>
              <div
                className={cn(
                  "min-w-0 overflow-hidden transition-[opacity,max-width] duration-300 ease-in-out",
                  effectiveCollapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100",
                )}
              >
                <p className="truncate text-base font-semibold text-foreground">LabelHub</p>
                <p className="truncate text-xs text-muted-foreground">任务负责人后台</p>
              </div>
            </div>
          </div>
          <ScrollArea className="lh-app-sidebar-scroll lh-scrollbar-none flex-1 min-h-0 px-3 py-4">
            <TooltipProvider delayDuration={200}>
              <nav className="space-y-5">
                {groupedMenus.map((group) => (
                  <section key={group.group} className="space-y-2">
                    <p
                      className={cn(
                        "truncate px-3 text-xs font-semibold tracking-[0.08em] text-muted-foreground transition-[opacity,max-height,margin] duration-300 ease-in-out",
                        effectiveCollapsed ? "mb-0 max-h-0 opacity-0" : "mb-0 max-h-8 opacity-100",
                      )}
                    >
                      {group.group}
                    </p>
                    <div className="space-y-1.5">
                      {group.items.map((menu) => {
                        const Icon = menu.icon;
                        const hasChildren = menuItemHasVisibleChildren(menu, currentUser);
                        const active = location.pathname === menu.path || location.pathname.startsWith(`${menu.path}/`);

                        if (!hasChildren) {
                          return <SidebarLeafMenu key={menu.key} menu={menu} collapsed={effectiveCollapsed} />;
                        }

                        if (effectiveCollapsed) {
                          return (
                            <CollapsedParentMenu
                              key={menu.key}
                              menu={menu}
                              active={active}
                              currentUser={currentUser}
                              pathname={location.pathname}
                              activePath={activePath}
                            />
                          );
                        }

                        return (
                          <div
                            key={menu.key}
                            className={cn(
                              "transition-[opacity,transform] duration-300 ease-in-out",
                              effectiveCollapsed ? "pointer-events-none scale-[0.98] opacity-0" : "scale-100 opacity-100",
                            )}
                          >
                            <AppSidebarMenuNode
                              item={menu}
                              depth={0}
                              pathname={location.pathname}
                              activePath={activePath}
                              currentUser={currentUser}
                              expandedKeys={expandedKeys}
                              onToggleExpanded={toggleExpanded}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </nav>
            </TooltipProvider>

          </ScrollArea>
        </aside>
        <AppSidebarEdgeToggle />
      </div>
    </>
  );
}


