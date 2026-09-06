"use client";

import { ArrowDown, ArrowUp, GripVertical, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import type { FormFieldSchema } from "@/low-code/schema/types";
import { useDesignerEditorStore } from "../../stores/designer-editor-store";
import type { DndDragData } from "../../types";
import { fieldDndId } from "../../utils/dnd";

interface CanvasFieldWrapperProps {
  field: FormFieldSchema;
  index: number;
  totalFields: number;
  children: React.ReactNode;
}

export function CanvasFieldWrapper({ field, index, totalFields, children }: CanvasFieldWrapperProps) {
  const selectedId = useDesignerEditorStore((state) => state.selectedId);
  const activeSectionKey = useDesignerEditorStore((state) => state.activeSectionKey);
  const select = useDesignerEditorStore((state) => state.select);
  const removeField = useDesignerEditorStore((state) => state.removeField);
  const moveFieldUp = useDesignerEditorStore((state) => state.moveFieldUp);
  const moveFieldDown = useDesignerEditorStore((state) => state.moveFieldDown);

  const dragData: DndDragData = {
    type: "field",
    fieldKey: field.key,
    sectionKey: activeSectionKey,
    label: field.label,
  };

  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: fieldDndId(field.key),
    data: dragData,
  });

  const isSelected = selectedId === field.key;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={(event) => {
        event.stopPropagation();
        select(field.key);
      }}
      className={`group relative mb-3 rounded-lg border-2 bg-card p-4 transition-colors
        ${
          isSelected
            ? "border-primary shadow-lg shadow-primary/10"
            : "border-transparent hover:border-border"
        }
        ${isOver ? "border-primary/60 bg-primary/10" : ""}
        ${isDragging ? "z-10 opacity-50" : ""}
      `}
    >
      <div
        className="absolute -left-1 bottom-0 top-0 flex flex-col items-center justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
        {...attributes}
      >
        <button
          type="button"
          className="cursor-grab touch-none p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="拖拽排序"
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      <div className="absolute -top-3 right-2 flex items-center gap-1 rounded-md border border-border bg-card p-0.5 opacity-0 shadow-sm transition-all group-hover:opacity-100">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={index === 0}
          onClick={(event) => {
            event.stopPropagation();
            moveFieldUp(field.key);
          }}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={index >= totalFields - 1}
          onClick={(event) => {
            event.stopPropagation();
            moveFieldDown(field.key);
          }}
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
        <div className="h-5 w-px bg-border" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-950"
          onClick={(event) => {
            event.stopPropagation();
            removeField(field.key);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="pl-2">{children}</div>
    </div>
  );
}
