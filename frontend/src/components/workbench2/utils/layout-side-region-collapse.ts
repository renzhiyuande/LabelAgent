import type { WorkbenchRegionDefinition, WorkbenchRegionId, WorkbenchRegionState } from "../types";

function clampSize(definition: WorkbenchRegionDefinition, size: number) {
  return Math.min(Math.max(size, definition.minSize), definition.maxSize);
}

export function isWorkbenchSideRegionId(
  regionId: WorkbenchRegionId,
): regionId is Extract<WorkbenchRegionId, "left" | "right"> {
  return regionId === "left" || regionId === "right";
}

/** 侧栏展开时使用的宽度：优先保留已存储的合法宽度，否则回退 defaultSize */
export function resolveExpandedSideRegionSize(
  definition: WorkbenchRegionDefinition,
  stored: WorkbenchRegionState,
): number {
  const candidate =
    typeof stored.size === "number" && stored.size >= definition.minSize
      ? stored.size
      : definition.defaultSize;
  return clampSize(definition, candidate);
}

/** 从 localStorage 恢复时规范化左右侧栏折叠状态与展开宽度 */
export function normalizeSideRegionCollapse(
  definition: WorkbenchRegionDefinition,
  stored: WorkbenchRegionState,
): WorkbenchRegionState {
  if (definition.collapsible === false) {
    return {
      ...stored,
      collapsed: false,
      size: clampSize(definition, typeof stored.size === "number" ? stored.size : definition.defaultSize),
    };
  }

  if (stored.collapsed) {
    return {
      ...stored,
      collapsed: true,
      size: resolveExpandedSideRegionSize(definition, stored),
    };
  }

  return {
    ...stored,
    collapsed: false,
    size: clampSize(definition, typeof stored.size === "number" ? stored.size : definition.defaultSize),
  };
}

export function applySideRegionSizeUpdate(
  definition: WorkbenchRegionDefinition,
  stored: WorkbenchRegionState,
  size: number,
): WorkbenchRegionState {
  const nextSize = clampSize(definition, size);
  if (stored.collapsed) {
    return { ...stored, size: nextSize };
  }
  return { ...stored, size: nextSize };
}

export function applySideRegionResizeDelta(
  definition: WorkbenchRegionDefinition,
  stored: WorkbenchRegionState,
  delta: number,
): WorkbenchRegionState {
  if (stored.collapsed || delta === 0) {
    return stored;
  }
  return {
    ...stored,
    size: clampSize(definition, stored.size + delta),
  };
}
