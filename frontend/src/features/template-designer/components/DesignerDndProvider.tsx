"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useDesignerEditorStore } from "../stores/designer-editor-store";
import {
  isCanvasDropTarget,
  isMaterialDropTarget,
  parseFieldKeyFromDndId,
  readDndData,
} from "../utils/dnd";

/** 优先按指针位置命中，避免拖回组件库时仍被 closestCenter 判到画布 */
const designerCollisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) {
    return pointerHits;
  }
  return closestCenter(args);
};

export function DesignerDndProvider({ children }: { children: ReactNode }) {
  const addField = useDesignerEditorStore((state) => state.addField);
  const moveFieldToIndex = useDesignerEditorStore((state) => state.moveFieldToIndex);
  const getScopeFields = useDesignerEditorStore((state) => state.getScopeFields);
  const isPreviewMode = useDesignerEditorStore((state) => state.isPreviewMode);

  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const materialEnteredCanvasRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const resetMaterialDrag = () => {
    materialEnteredCanvasRef.current = false;
    setActiveLabel(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const enteredCanvas = materialEnteredCanvasRef.current;
    materialEnteredCanvasRef.current = false;
    setActiveLabel(null);

    if (isPreviewMode) {
      return;
    }

    const data = readDndData(event.active.data.current);
    if (!data) {
      return;
    }

    const overId = event.over?.id;
    if (data.type === "material") {
      if (isMaterialDropTarget(overId) || !enteredCanvas || !overId || !isCanvasDropTarget(overId)) {
        return;
      }
      const fields = getScopeFields();
      let insertIndex = fields.length;
      const overFieldKey = parseFieldKeyFromDndId(String(overId));
      if (overFieldKey) {
        const overIndex = fields.findIndex((field) => field.key === overFieldKey);
        if (overIndex >= 0) {
          insertIndex = overIndex;
        }
      }
      addField(data.materialKey, insertIndex);
      return;
    }

    if (data.type === "field" && typeof overId === "string") {
      const activeKey = data.fieldKey;
      const overKey = parseFieldKeyFromDndId(overId);
      if (!overKey || activeKey === overKey) {
        return;
      }
      const fields = getScopeFields();
      const fromIndex = fields.findIndex((field) => field.key === activeKey);
      const toIndex = fields.findIndex((field) => field.key === overKey);
      if (fromIndex < 0 || toIndex < 0) {
        return;
      }
      const reordered = arrayMove(fields, fromIndex, toIndex);
      const targetIndex = reordered.findIndex((field) => field.key === activeKey);
      if (targetIndex >= 0 && targetIndex !== fromIndex) {
        moveFieldToIndex(fromIndex, targetIndex);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={designerCollisionDetection}
      onDragStart={(event) => {
        materialEnteredCanvasRef.current = false;
        const data = readDndData(event.active.data.current);
        if (data?.type === "material") {
          setActiveLabel(data.label);
        } else if (data?.type === "field") {
          setActiveLabel(data.label);
        }
      }}
      onDragOver={(event) => {
        const data = readDndData(event.active.data.current);
        if (data?.type === "material" && isCanvasDropTarget(event.over?.id)) {
          materialEnteredCanvasRef.current = true;
        }
      }}
      onDragEnd={handleDragEnd}
      onDragCancel={resetMaterialDrag}
    >
      {children}
      <DragOverlay>
        {activeLabel ? (
          <div className="rounded-md border border-primary/40 bg-card px-3 py-2 text-sm text-foreground shadow-lg">
            {activeLabel}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
