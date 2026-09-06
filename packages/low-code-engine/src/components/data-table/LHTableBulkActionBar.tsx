import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import type { ActionSchema } from "../../schema/types";
import type { AuthenticatedUser } from "../../lib/types";
import { hasPermission } from "../../utils/permissions";

interface LHTableBulkActionBarProps {
  visible: boolean;
  count: number;
  actions: ActionSchema[];
  currentUser?: AuthenticatedUser | null;
  onAction: (action: ActionSchema) => void;
  onClearSelection: () => void;
}

export function LHTableBulkActionBar({
  visible,
  count,
  actions,
  currentUser = null,
  onAction,
  onClearSelection,
}: LHTableBulkActionBarProps) {
  return (
    <div
      className={cn("lh-table-bulk-bar", visible && "is-visible")}
      aria-hidden={!visible}
    >
      <div className="lh-table-bulk-bar-left">
        <Button type="button" variant="ghost" size="sm" onClick={onClearSelection}>
          取消选择
        </Button>
      </div>
      <div className="lh-table-bulk-bar-actions">
        {actions.map((action) => {
          if (!hasPermission(currentUser, action.permission)) {
            return null;
          }
          return (
            <Button
              key={action.key}
              type="button"
              variant={action.kind === "danger" ? "destructive" : "outline"}
              size="sm"
              onClick={() => onAction(action)}
            >
              {action.label}
            </Button>
          );
        })}
        <span className="lh-table-bulk-bar-count">已选 {count} 项</span>
      </div>
    </div>
  );
}
