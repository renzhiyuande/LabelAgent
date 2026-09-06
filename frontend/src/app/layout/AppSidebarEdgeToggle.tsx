import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAppShellStore } from "../../stores/app-shell";

export function AppSidebarEdgeToggle() {
  const collapsed = useAppShellStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useAppShellStore((state) => state.toggleSidebar);

  return (
    <button
      type="button"
      aria-label={collapsed ? "展开侧栏菜单" : "收起侧栏菜单"}
      title={collapsed ? "展开侧栏" : "收起侧栏"}
      onClick={toggleSidebar}
      className={cn(
        "absolute right-0 top-0 z-10 hidden h-full w-6 translate-x-1/2 md:block",
        "cursor-col-resize border-0 bg-transparent p-0",
        "group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 h-10 w-px -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-200/90 opacity-0 transition-all duration-200",
          "group-hover:h-14 group-hover:w-0.5 group-hover:bg-primary/70 group-hover:opacity-100",
          "group-focus-visible:opacity-100",
          "dark:bg-slate-700/90 dark:group-hover:bg-primary/80",
        )}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-500 shadow-sm opacity-0 transition-all duration-200",
          "group-hover:opacity-100",
          "group-focus-visible:opacity-100",
          "dark:border-border dark:bg-muted dark:text-foreground dark:shadow-[0_4px_12px_rgba(2,6,23,0.35)]",
          "group-hover:border-primary/20 group-hover:text-primary dark:group-hover:border-primary/40 dark:group-hover:text-primary/80",
        )}
      >
        <span className="relative flex h-3.5 w-3.5 items-center justify-center">
          <ChevronLeft
            className={cn(
              "absolute h-3.5 w-3.5 transition-[opacity,transform] duration-300 ease-in-out",
              collapsed ? "scale-75 opacity-0" : "scale-100 opacity-100",
            )}
            strokeWidth={2.5}
          />
          <ChevronRight
            className={cn(
              "absolute h-3.5 w-3.5 transition-[opacity,transform] duration-300 ease-in-out",
              collapsed ? "scale-100 opacity-100" : "scale-75 opacity-0",
            )}
            strokeWidth={2.5}
          />
        </span>
      </span>
    </button>
  );
}
