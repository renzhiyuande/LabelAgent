import { Braces, LayoutGrid, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WidgetViewMode } from "@/components/workbench2/components/EditableWidgetBoard";

const options: Array<{ mode: WidgetViewMode; label: string; icon: typeof Table2 }> = [
  { mode: "inline", label: "紧凑", icon: Table2 },
  { mode: "cards", label: "卡片", icon: LayoutGrid },
  { mode: "json", label: "JSON", icon: Braces },
];

export function WidgetViewModeToggle({
  activeMode,
  onChange,
}: {
  activeMode: WidgetViewMode;
  onChange: (mode: WidgetViewMode) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-900">
      {options.map(({ mode, label, icon: Icon }) => (
        <Button
          key={mode}
          type="button"
          variant={activeMode === mode ? "default" : "ghost"}
          size="icon"
          className="h-7 w-7 rounded-full"
          title={label}
          onClick={() => onChange(mode)}
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      ))}
    </div>
  );
}
