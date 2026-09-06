import { useCallback, useEffect, useState } from "react";
import { MATERIAL_CATEGORIES } from "../utils/material-catalog";

const STORAGE_KEY = "labelhub.designer.material-groups.v3";

function defaultCategory(): string {
  return MATERIAL_CATEGORIES[0]?.category ?? "basic";
}

function readActiveCategory(): string | null {
  if (typeof window === "undefined") {
    return defaultCategory();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultCategory();
    }
    const parsed = JSON.parse(raw) as { activeCategory?: string | null };
    if (parsed.activeCategory == null) {
      return null;
    }
    const exists = MATERIAL_CATEGORIES.some((category) => category.category === parsed.activeCategory);
    return exists ? String(parsed.activeCategory) : defaultCategory();
  } catch {
    return defaultCategory();
  }
}

export function useMaterialGroupCollapse() {
  const [activeCategory, setActiveCategory] = useState<string | null>(readActiveCategory);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ activeCategory }));
  }, [activeCategory]);

  const isExpanded = useCallback((category: string) => activeCategory === category, [activeCategory]);

  const toggle = useCallback((category: string) => {
    setActiveCategory((current) => (current === category ? null : category));
  }, []);

  return { isExpanded, toggle };
}
