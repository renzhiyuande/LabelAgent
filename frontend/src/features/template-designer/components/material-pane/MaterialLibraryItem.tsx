"use client";

import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { useDesignerEditorStore } from "../../stores/designer-editor-store";
import type { MaterialItemConfig } from "../../types";
import { materialDndId } from "../../utils/dnd";
import { resolveMaterialIcon } from "./resolve-material-icon";

interface MaterialLibraryItemProps {
  item: MaterialItemConfig;
}

export function MaterialLibraryItem({ item }: MaterialLibraryItemProps) {
  const isPreviewMode = useDesignerEditorStore((state) => state.isPreviewMode);
  const Icon = resolveMaterialIcon(item.icon);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: materialDndId(item.key),
    data: { type: "material", materialKey: item.key, label: item.label } as const,
    disabled: isPreviewMode,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "flex select-none items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-[border-color,background-color,box-shadow,opacity]",
        "border-border bg-card hover:border-primary/30 hover:bg-muted",
        isDragging && "border-primary/50 bg-primary/10 shadow-sm ring-1 ring-primary/30",
        isPreviewMode && "pointer-events-none opacity-45",
      )}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground">
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-foreground">{item.label}</span>
        {item.description ? (
          <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
        ) : null}
      </span>
    </div>
  );
}
