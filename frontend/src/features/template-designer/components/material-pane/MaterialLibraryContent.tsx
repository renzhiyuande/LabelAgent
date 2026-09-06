"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useMaterialGroupCollapse } from "../../hooks/use-material-group-collapse";
import { MATERIAL_CATEGORIES } from "../../utils/material-catalog";
import { MaterialLibraryCategory } from "./MaterialLibraryCategory";

export function MaterialLibraryContent() {
  const { isExpanded, toggle } = useMaterialGroupCollapse();

  return (
    <ScrollArea className="min-h-0 flex-1">
      <nav className="space-y-1 px-2 py-3" aria-label="物料库分类">
        {MATERIAL_CATEGORIES.map((category) => (
          <MaterialLibraryCategory
            key={category.category}
            title={category.title}
            items={category.items}
            expanded={isExpanded(category.category)}
            onToggle={() => toggle(category.category)}
          />
        ))}
      </nav>
    </ScrollArea>
  );
}
