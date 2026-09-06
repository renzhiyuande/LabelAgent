"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MaterialItemConfig } from "../../types";
import { MaterialLibraryItem } from "./MaterialLibraryItem";

interface MaterialLibraryCategoryProps {
  title: string;
  items: MaterialItemConfig[];
  expanded: boolean;
  onToggle: () => void;
}

export function MaterialLibraryCategory({
  title,
  items,
  expanded,
  onToggle,
}: MaterialLibraryCategoryProps) {
  return (
    <section className="w-full">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={cn(
          "flex w-full items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
          "text-foreground hover:bg-muted hover:text-foreground",
          expanded && "bg-muted/80",
        )}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
        )}
        <span className="truncate">{title}</span>
        <span className="ml-auto text-xs font-normal tabular-nums text-slate-400 dark:text-slate-500">
          {items.length}
        </span>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity,margin] duration-200 ease-in-out",
          expanded ? "mt-2 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <ul className="flex flex-col gap-2 px-2 pb-1">
            {items.map((item) => (
              <li key={item.key}>
                <MaterialLibraryItem item={item} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
