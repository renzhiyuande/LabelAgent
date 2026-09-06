import { AlignLeft, Braces, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SchemaDataViewMode } from "./SchemaDataView";

const VIEW_OPTIONS: Array<{ mode: SchemaDataViewMode; label: string; icon: typeof AlignLeft }> = [
  { mode: "inline", label: "紧凑", icon: AlignLeft },
  { mode: "cards", label: "卡片", icon: LayoutGrid },
  { mode: "json", label: "JSON", icon: Braces },
];

interface SchemaDataViewToggleProps {
  value: SchemaDataViewMode;
  onChange: (mode: SchemaDataViewMode) => void;
  className?: string;
  compact?: boolean;
}

export function SchemaDataViewToggle({ value, onChange, className, compact = false }: SchemaDataViewToggleProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded-lg border border-slate-200/80 bg-slate-50/80 p-0.5 dark:border-slate-700 dark:bg-slate-900/60",
        className,
      )}
    >
      {VIEW_OPTIONS.map(({ mode, label, icon: Icon }) => (
        <Button
          key={mode}
          type="button"
          size="sm"
          variant={value === mode ? "default" : "ghost"}
          className={cn("h-7 gap-1 px-2 text-xs", compact && "h-6 px-1.5 text-[11px]")}
          onClick={() => onChange(mode)}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </Button>
      ))}
    </div>
  );
}
