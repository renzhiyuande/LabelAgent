import type { DndDragData } from "../types";

export const DESIGNER_CANVAS_DROP_ID = "designer-canvas-drop";
export const DESIGNER_MATERIAL_DROP_ID = "designer-material-drop";

export function materialDndId(materialKey: string) {
  return `designer-material:${materialKey}`;
}

export function fieldDndId(fieldKey: string) {
  return `designer-field:${fieldKey}`;
}

export function parseFieldKeyFromDndId(id: string): string | null {
  if (!id.startsWith("designer-field:")) {
    return null;
  }
  return id.slice("designer-field:".length);
}

export function parseMaterialKeyFromDndId(id: string): string | null {
  if (!id.startsWith("designer-material:")) {
    return null;
  }
  return id.slice("designer-material:".length);
}

/** 物料仅允许落入画布容器或画布内字段 */
export function isCanvasDropTarget(id: unknown): id is string {
  if (typeof id !== "string") {
    return false;
  }
  return id === DESIGNER_CANVAS_DROP_ID || id.startsWith("designer-field:");
}

/** 落回组件库面板时取消添加 */
export function isMaterialDropTarget(id: unknown): boolean {
  return id === DESIGNER_MATERIAL_DROP_ID;
}

export function readDndData(raw: unknown): DndDragData | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const data = raw as DndDragData;
  if (data.type === "material" && data.materialKey) {
    return data;
  }
  if (data.type === "field" && data.fieldKey) {
    return data;
  }
  return null;
}
