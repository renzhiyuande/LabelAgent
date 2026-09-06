import { Columns2, LayoutList, PanelTop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SchemaSectionsLayout } from "./use-schema-section-state";

const LAYOUT_OPTIONS: Array<{ layout: SchemaSectionsLayout; label: string; icon: typeof LayoutList }> = [
  { layout: "stack", label: "上下", icon: LayoutList },
  { layout: "row", label: "左右", icon: Columns2 },
  { layout: "tabs", label: "标签", icon: PanelTop },
];

interface SchemaSectionsLayoutToggleProps {
  value: SchemaSectionsLayout;
  onChange: (layout: SchemaSectionsLayout) => void;
  className?: string;
}

export function SchemaSectionsLayoutToggle({ value, onChange, className }: SchemaSectionsLayoutToggleProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-lg border border-border/80 bg-muted/90 p-0.5",
        className,
      )}
    >
      {LAYOUT_OPTIONS.map(({ layout, label, icon: Icon }) => (
        <Button
          key={layout}
          type="button"
          size="sm"
          variant={value === layout ? "default" : "ghost"}
          className="h-7 gap-1 px-2 text-xs"
          onClick={() => onChange(layout)}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </Button>
      ))}
    </div>
  );
}
