import { LayoutGrid, Table2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";

export type LHDetailViewMode = "grid" | "table";

const VIEW_OPTIONS: Array<{ mode: LHDetailViewMode; label: string; icon: typeof LayoutGrid }> = [
  { mode: "grid", label: "卡片", icon: LayoutGrid },
  { mode: "table", label: "表格", icon: Table2 },
];

const STORAGE_KEY = "lh-detail-view-mode";

export function normalizeDetailViewMode(mode: string | undefined): LHDetailViewMode {
  return mode === "table" ? "table" : "grid";
}

export function readStoredDetailViewMode(): LHDetailViewMode {
  if (typeof window === "undefined") {
    return "grid";
  }
  return normalizeDetailViewMode(window.localStorage.getItem(STORAGE_KEY) ?? undefined);
}

export function writeStoredDetailViewMode(mode: LHDetailViewMode): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, mode);
}

interface LHDetailViewToggleProps {
  value: LHDetailViewMode;
  onChange: (mode: LHDetailViewMode) => void;
  className?: string;
}

export function LHDetailViewToggle({ value, onChange, className }: LHDetailViewToggleProps) {
  return (
    <div
      className={cn(
        "lh-detail-view-toggle",
        className,
      )}
      role="group"
      aria-label="详情视图切换"
    >
      {VIEW_OPTIONS.map(({ mode, label, icon: Icon }) => (
        <Button
          key={mode}
          type="button"
          size="sm"
          variant={value === mode ? "default" : "ghost"}
          className="lh-detail-view-toggle-button"
          onClick={() => onChange(mode)}
        >
          <Icon className="h-3.5 w-3.5" />
          <span>{label}</span>
        </Button>
      ))}
    </div>
  );
}
