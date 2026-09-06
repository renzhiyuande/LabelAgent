import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WorkbenchPanelShellProps {
  panelId: string;
  label: string;
  collapsed: boolean;
  isDragging?: boolean;
  dragAttributes?: DraggableAttributes;
  dragListeners?: SyntheticListenerMap;
  setNodeRef?: (node: HTMLElement | null) => void;
  dragStyle?: React.CSSProperties;
  onToggleCollapse: () => void;
  collapseEnabled?: boolean;
  reorderEnabled?: boolean;
  children: ReactNode;
  collapsedContent?: ReactNode;
  bordered?: boolean;
}

function CollapsedStrip({ label, onExpand }: { label: string; onExpand: () => void }) {
  return (
    <button
      type="button"
      className="flex h-full w-full flex-col items-center justify-center gap-2 py-4 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      title={`展开${label}`}
      onClick={onExpand}
    >
      <ChevronRight className="h-4 w-4" />
      <span className="select-none text-[11px] font-medium tracking-[0.18em] [writing-mode:vertical-rl]">{label}</span>
    </button>
  );
}

export function WorkbenchPanelShell({
  panelId,
  label,
  collapsed,
  isDragging = false,
  dragAttributes,
  dragListeners,
  setNodeRef,
  dragStyle,
  onToggleCollapse,
  collapseEnabled = true,
  reorderEnabled = true,
  children,
  collapsedContent,
  bordered = false,
}: WorkbenchPanelShellProps) {
  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      data-panel-id={panelId}
      className={cn(
        "lh-workbench-panel flex h-full min-h-0 flex-col overflow-hidden bg-card/95",
        bordered && "border-x border-border/70",
        isDragging && "z-20 shadow-lg ring-2 ring-primary/30 lh-workbench-panel--dragging",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center gap-1 border-b border-border/70 bg-muted/90 px-1.5 py-1",
          collapsed && "flex-col py-2",
        )}
      >
        {reorderEnabled ? (
          <button
            type="button"
            className={cn(
              "cursor-grab rounded p-1 text-muted-foreground transition-colors hover:bg-card hover:text-foreground active:cursor-grabbing",
              collapsed && "order-1",
            )}
            title="拖动切换位置"
            {...dragAttributes}
            {...dragListeners}
          >
            <GripVertical className="h-4 w-4 shrink-0" />
          </button>
        ) : null}

        {!collapsed ? (
          <span className="min-w-0 flex-1 truncate px-0.5 text-xs font-medium text-foreground">{label}</span>
        ) : null}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7 shrink-0 text-muted-foreground", collapsed && "order-0", !collapseEnabled && "hidden")}
          title={collapsed ? `展开${label}` : `收起${label}`}
          onClick={onToggleCollapse}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {collapsed ? collapsedContent ?? <CollapsedStrip label={label} onExpand={onToggleCollapse} /> : children}
      </div>
    </div>
  );
}
