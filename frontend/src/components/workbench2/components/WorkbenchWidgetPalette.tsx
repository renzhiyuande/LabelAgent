import { useDraggable } from "@dnd-kit/core";
import { GripVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface WorkbenchWidgetPaletteItem {
  id: string;
  title: string;
  description?: string;
  placed: boolean;
  hidden: boolean;
  onTab?: boolean;
}

interface WorkbenchWidgetPaletteProps {
  title?: string;
  widgets: WorkbenchWidgetPaletteItem[];
  onAddWidget: (widgetId: string) => void;
  className?: string;
}

function PaletteDraggableWidget({
  widget,
  onAddWidget,
}: {
  widget: WorkbenchWidgetPaletteItem;
  onAddWidget: (widgetId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: widget.id,
    disabled: false,
    data: { type: "workbench-widget-item", widgetId: widget.id, source: "palette" },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-2 rounded-xl border border-border/80 bg-card/95 px-2.5 py-2",
        isDragging && "opacity-50",
      )}
    >
      <button
        type="button"
        className="cursor-grab rounded p-0.5 text-muted-foreground active:cursor-grabbing"
        aria-label={`拖动 ${widget.title}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-foreground">{widget.title}</p>
        {widget.description ? (
          <p className="truncate text-[10px] text-muted-foreground">{widget.description}</p>
        ) : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 rounded-lg"
        aria-label={`添加 ${widget.title}`}
        onClick={() => onAddWidget(widget.id)}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function WorkbenchWidgetPalette({
  title = "组件库",
  widgets,
  onAddWidget,
  className,
}: WorkbenchWidgetPaletteProps) {
  const pool = widgets.filter((widget) => widget.hidden || (!widget.placed && !widget.onTab));

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div>
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">拖入区域或 Tab 栏，或点击 + 恢复</p>
      </div>

      {pool.length > 0 ? (
        <div className="space-y-1.5">
          {pool.map((widget) => (
            <PaletteDraggableWidget key={widget.id} widget={widget} onAddWidget={onAddWidget} />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border px-2 py-3 text-center text-[11px] text-muted-foreground">
          所有组件已放置
        </p>
      )}
    </div>
  );
}
