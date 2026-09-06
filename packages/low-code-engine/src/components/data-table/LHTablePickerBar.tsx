import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";

interface LHTablePickerBarProps {
  visible: boolean;
  count: number;
  confirmLabel?: string;
  onConfirm: () => void;
  onClearSelection: () => void;
}

export function LHTablePickerBar({
  visible,
  count,
  confirmLabel = "确认选择",
  onConfirm,
  onClearSelection,
}: LHTablePickerBarProps) {
  return (
    <div
      className={cn("lh-table-bulk-bar lh-table-picker-bar", visible && "is-visible")}
      aria-hidden={!visible}
    >
      <div className="lh-table-bulk-bar-left">
        <Button type="button" variant="ghost" size="sm" onClick={onClearSelection}>
          取消选择
        </Button>
      </div>
      <div className="lh-table-bulk-bar-actions">
        <span className="lh-table-bulk-bar-count">已选 {count} 项</span>
        <Button type="button" size="sm" disabled={count === 0} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
