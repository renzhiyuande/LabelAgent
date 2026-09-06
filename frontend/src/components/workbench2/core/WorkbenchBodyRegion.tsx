import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface WorkbenchBodyRegionProps {
  regionId: "left" | "center" | "right";
  editing: boolean;
  width?: number;
  className?: string;
  children: ReactNode;
}

export function WorkbenchBodyRegion({
  regionId,
  editing,
  width,
  className,
  children,
}: WorkbenchBodyRegionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: regionId,
    disabled: !editing,
    data: {
      type: "workbench-body-region",
      regionId,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn("relative min-h-0", width != null && "overflow-hidden", className, isDragging && "z-30")}
      style={{
        width,
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        transition,
      }}
    >
      {editing ? (
        <button
          type="button"
          className="absolute left-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/90 text-muted-foreground shadow-sm"
          aria-label={`拖动区域 ${regionId}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      ) : null}
      {children}
    </div>
  );
}
