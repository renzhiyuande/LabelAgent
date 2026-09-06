import type { LabelerMyWorkRow } from "../../api/labeler-work-api";

export interface QueueNeighbors {
  prevId: string | null;
  nextId: string | null;
  index: number;
  total: number;
}

export function resolveQueueNeighbors(rows: LabelerMyWorkRow[], currentAssignmentId: string): QueueNeighbors {
  const ids = rows.map((row) => String(row.assignmentId));
  const index = ids.indexOf(currentAssignmentId);
  if (index < 0) {
    return { prevId: null, nextId: null, index: -1, total: ids.length };
  }
  return {
    prevId: index > 0 ? ids[index - 1] : null,
    nextId: index < ids.length - 1 ? ids[index + 1] : null,
    index,
    total: ids.length,
  };
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }
  if (target.isContentEditable) {
    return true;
  }
  return Boolean(target.closest("[contenteditable='true']"));
}

export function shouldIgnoreNavigationHotkey(target: EventTarget | null): boolean {
  return isEditableTarget(target);
}
