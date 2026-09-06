import { useCallback, useEffect, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";

export type LeadingTabId = "materials" | "preview";

const STORAGE_KEY = "labelhub.designer.leading-tabs.v1";
const DEFAULT_ORDER: LeadingTabId[] = ["materials", "preview"];

function normalizeOrder(raw: unknown): LeadingTabId[] {
  if (!Array.isArray(raw)) {
    return DEFAULT_ORDER;
  }
  const allowed = new Set<LeadingTabId>(["materials", "preview"]);
  const seen = new Set<LeadingTabId>();
  const next: LeadingTabId[] = [];
  for (const item of raw) {
    if (item === "materials" || item === "preview") {
      if (!seen.has(item)) {
        seen.add(item);
        next.push(item);
      }
    }
  }
  for (const item of DEFAULT_ORDER) {
    if (!seen.has(item)) {
      next.push(item);
    }
  }
  return next;
}

function readTabOrder(): LeadingTabId[] {
  if (typeof window === "undefined") {
    return DEFAULT_ORDER;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_ORDER;
    }
    return normalizeOrder(JSON.parse(raw));
  } catch {
    return DEFAULT_ORDER;
  }
}

export function useLeadingTabOrder() {
  const [tabOrder, setTabOrder] = useState<LeadingTabId[]>(readTabOrder);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tabOrder));
  }, [tabOrder]);

  const reorderTabs = useCallback((activeId: LeadingTabId, overId: LeadingTabId) => {
    setTabOrder((current) => {
      const oldIndex = current.indexOf(activeId);
      const newIndex = current.indexOf(overId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
        return current;
      }
      return arrayMove(current, oldIndex, newIndex);
    });
  }, []);

  return { tabOrder, reorderTabs };
}
