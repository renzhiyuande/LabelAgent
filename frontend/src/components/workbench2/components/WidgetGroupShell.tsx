import { type ReactNode } from "react";
import { Ungroup } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SchemaSectionsLayoutToggle } from "@/components/workbench/shared/schema-data/SchemaSectionsLayoutToggle";
import { cn } from "@/lib/utils";
import type { WidgetBoardGroup } from "../utils/widget-board-groups";
import type { WidgetLayoutMode } from "./EditableWidgetBoard";

interface WidgetGroupShellProps {
  group: WidgetBoardGroup;
  editing: boolean;
  onLayoutChange: (layout: WidgetLayoutMode) => void;
  onDissolve: () => void;
  children: ReactNode;
  className?: string;
}

export function WidgetGroupShell({
  group,
  editing,
  onLayoutChange,
  onDissolve,
  children,
  className,
}: WidgetGroupShellProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-none border border-primary/20 bg-primary/5 dark:border-primary/25 dark:bg-primary/10",
        className,
      )}
    >
      {editing ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-primary/20 px-2 py-1 dark:border-primary/20">
          <p className="text-[11px] font-medium text-primary/80 dark:text-primary/80">
            组合视图 · {group.widgetIds.length} 个组件
            <span className="ml-1 font-normal text-slate-500">（拖到其他组件上合并）</span>
          </p>
          <div className="flex items-center gap-1">
            <SchemaSectionsLayoutToggle value={group.layout} onChange={onLayoutChange} />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-xs"
              title="拆散组合"
              onClick={onDissolve}
            >
              <Ungroup className="h-3.5 w-3.5" />
              拆散
            </Button>
          </div>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-hidden p-0">{children}</div>
    </div>
  );
}
