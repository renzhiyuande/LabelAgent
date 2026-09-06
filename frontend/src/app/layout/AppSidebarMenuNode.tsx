import { ChevronDown } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import type { useAuthStore } from "../../stores/auth";
import type { AppMenuItem } from "../navigation/menu-config";
import { filterVisibleMenuChildren, isMenuBranchActive } from "./sidebar-menu-utils";

type CurrentUser = ReturnType<typeof useAuthStore.getState>["currentUser"];

const NEST_INDENT_PX = 12;

interface AppSidebarMenuNodeProps {
  item: AppMenuItem;
  depth: number;
  pathname: string;
  activePath: string | null;
  currentUser: CurrentUser;
  expandedKeys: Set<string>;
  onToggleExpanded: (menuKey: string) => void;
}

export function AppSidebarMenuNode({
  item,
  depth,
  pathname,
  activePath,
  currentUser,
  expandedKeys,
  onToggleExpanded,
}: AppSidebarMenuNodeProps) {
  const Icon = item.icon;
  const visibleChildren = filterVisibleMenuChildren(item, currentUser);
  const hasChildren = visibleChildren.length > 0;
  const paddingLeft = 12 + depth * NEST_INDENT_PX;

  if (!hasChildren) {
    const isActive = activePath === item.path;
    return (
      <NavLink
        to={item.path}
        style={{ paddingLeft }}
        className={cn(
          "relative flex min-w-0 items-center gap-3 rounded-2xl py-2.5 pr-3 text-sm transition-colors duration-100",
          depth === 0 ? "py-3" : "py-2.5",
          isActive
            ? "bg-primary/10 font-medium text-primary before:absolute before:left-0 before:top-2 before:h-[calc(100%-16px)] before:w-[3px] before:rounded-r-full before:bg-primary dark:bg-primary/12 dark:text-primary/80 dark:before:bg-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
        <span className="truncate">{item.title}</span>
      </NavLink>
    );
  }

  const isExpanded = expandedKeys.has(item.key);
  const branchActive = isMenuBranchActive(pathname, item, currentUser);

  return (
    <div className={cn(depth > 0 && "mt-0.5")}>
      <Button
        type="button"
        variant="ghost"
        aria-expanded={isExpanded}
        style={{ paddingLeft }}
        className={cn(
          "flex h-auto w-full min-w-0 items-center justify-between rounded-2xl py-2.5 pr-3 text-sm font-semibold transition-colors duration-150",
          depth === 0 ? "py-3" : "py-2.5 text-[13px] font-medium",
          branchActive
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
        onClick={() => onToggleExpanded(item.key)}
      >
        <div className="flex min-w-0 items-center gap-3">
          {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
          <span className="truncate">{item.title}</span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-[transform,opacity] duration-300 ease-in-out",
            isExpanded ? "rotate-0" : "-rotate-90",
          )}
          aria-hidden
        />
      </Button>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-in-out",
          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              "space-y-0.5 transition-[padding] duration-200 ease-in-out",
              isExpanded ? "pb-0.5 pt-0.5" : "pt-0",
              !isExpanded && "pointer-events-none",
              depth > 0 && "ml-2 border-l border-border/80 pl-1",
            )}
          >
            {visibleChildren.map((child) => (
              <AppSidebarMenuNode
                key={child.key}
                item={child}
                depth={depth + 1}
                pathname={pathname}
                activePath={activePath}
                currentUser={currentUser}
                expandedKeys={expandedKeys}
                onToggleExpanded={onToggleExpanded}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface CollapsedSidebarMenuTreeProps {
  items: AppMenuItem[];
  pathname: string;
  activePath: string | null;
  currentUser: CurrentUser;
  expandedKeys: Set<string>;
  onToggleExpanded: (menuKey: string) => void;
  depth?: number;
  onNavigate?: () => void;
}

export function CollapsedSidebarMenuTree({
  items,
  pathname,
  activePath,
  currentUser,
  expandedKeys,
  onToggleExpanded,
  depth = 0,
  onNavigate,
}: CollapsedSidebarMenuTreeProps) {
  return (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        const visibleChildren = filterVisibleMenuChildren(item, currentUser);
        const hasChildren = visibleChildren.length > 0;
        const paddingLeft = 10 + depth * NEST_INDENT_PX;

        if (!hasChildren) {
          const isActive = activePath === item.path;
          return (
            <NavLink
              key={item.key}
              to={item.path}
              onClick={onNavigate}
              style={{ paddingLeft }}
              className={cn(
                "flex min-w-0 items-center gap-2.5 rounded-xl py-2 text-sm transition-colors duration-100",
                isActive
                  ? "bg-primary/10 font-medium text-primary dark:bg-primary/12 dark:text-primary/80"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
              <span className="truncate">{item.title}</span>
            </NavLink>
          );
        }

        const isExpanded = expandedKeys.has(item.key);
        const branchActive = isMenuBranchActive(pathname, item, currentUser);

        return (
          <div key={item.key} className={cn(depth > 0 && "mt-0.5")}>
            <Button
              type="button"
              variant="ghost"
              aria-expanded={isExpanded}
              style={{ paddingLeft }}
              className={cn(
                "flex h-auto w-full min-w-0 items-center justify-between rounded-xl py-2 pr-2 text-sm font-medium transition-colors duration-150",
                branchActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              onClick={() => onToggleExpanded(item.key)}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
                <span className="truncate">{item.title}</span>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform duration-200 ease-in-out",
                  isExpanded ? "rotate-0" : "-rotate-90",
                )}
                aria-hidden
              />
            </Button>

            <div
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-200 ease-in-out",
                isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <div
                  className={cn(
                    "space-y-0.5 transition-[padding] duration-200 ease-in-out",
                    isExpanded ? "pb-0.5 pt-0.5" : "pt-0",
                    !isExpanded && "pointer-events-none",
                    depth > 0 && "ml-2 border-l border-border/80 pl-1",
                  )}
                >
                  <CollapsedSidebarMenuTree
                    items={visibleChildren}
                    pathname={pathname}
                    activePath={activePath}
                    currentUser={currentUser}
                    expandedKeys={expandedKeys}
                    onToggleExpanded={onToggleExpanded}
                    depth={depth + 1}
                    onNavigate={onNavigate}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
