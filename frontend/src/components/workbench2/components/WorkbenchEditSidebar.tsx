import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WorkbenchEditSidebarProps {
  tabManager?: ReactNode;
  widgetPalette?: ReactNode;
  className?: string;
}

export function WorkbenchEditSidebar({ tabManager, widgetPalette, className }: WorkbenchEditSidebarProps) {
  const hasTabManager = Boolean(tabManager);
  const hasWidgetPalette = Boolean(widgetPalette);
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div
        className={cn(
          "absolute right-0 top-0 z-30 flex shrink-0 flex-col border-l border-border/80 bg-card/90 shadow-[-8px_0_24px_hsl(var(--foreground)/0.06)]",
          className,
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="m-1 h-8 w-8 rounded-xl"
          aria-label="展开编辑侧栏"
          onClick={() => setCollapsed(false)}
        >
          <PanelRightOpen className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "absolute inset-y-0 right-0 z-30 flex h-full max-h-full w-[280px] shrink-0 flex-col border-l border-border/80 bg-card/95 shadow-[-8px_0_24px_hsl(var(--foreground)/0.06)]",
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border/80 px-3 py-2">
        <p className="text-xs font-semibold text-foreground">布局编辑</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-lg"
          aria-label="收起编辑侧栏"
          onClick={() => setCollapsed(true)}
        >
          <PanelRightClose className="h-4 w-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-3">
        {hasTabManager ? tabManager : null}
        {hasTabManager && hasWidgetPalette ? (
          <div className="border-t border-border/80 pt-4">{widgetPalette}</div>
        ) : hasWidgetPalette ? (
          widgetPalette
        ) : null}
      </div>
    </aside>
  );
}
