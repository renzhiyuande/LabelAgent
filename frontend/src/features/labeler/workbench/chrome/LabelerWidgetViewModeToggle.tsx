import { Braces, LayoutGrid, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WidgetViewMode } from "@/components/workbench2/components/EditableWidgetBoard";

const options: Array<{ mode: WidgetViewMode; label: string; icon: typeof Table2 }> = [
  { mode: "inline", label: "紧凑", icon: Table2 },
  { mode: "cards", label: "卡片", icon: LayoutGrid },
  { mode: "json", label: "JSON", icon: Braces },
];

export function LabelerWidgetViewModeToggle({
  widgetId,
  activeMode,
  onChange,
}: {
  widgetId: string;
  activeMode: WidgetViewMode;
  onChange: (widgetId: string, mode: WidgetViewMode) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-border bg-muted p-0.5">
      {options.map(({ mode, label, icon: Icon }) => (
        <Button
          key={mode}
          type="button"
          variant={activeMode === mode ? "default" : "ghost"}
          size="icon"
          className="h-7 w-7 rounded-full"
          title={label}
          onClick={() => onChange(widgetId, mode)}
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      ))}
    </div>
  );
}
