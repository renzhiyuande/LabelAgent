import { useMemo } from "react";
import { LHDrawerShell } from "@/low-code/components/drawers/LHDrawerShell";
import { AuditPoolGroupBrowsePanel, type AuditPoolGroupBrowsePanelProps } from "./AuditPoolGroupBrowsePanel";
import type { AuditPoolGroupResponse } from "../api/reviewer-workbench-api";
import { auditPoolGroupKey, type AuditPoolGroupBy, type AuditPoolQueueScope } from "../types";
import { buildQueueScope, scopeItemFromGroup } from "../utils/audit-pool-scope";

export interface AuditPoolQueueBrowseDrawerProps extends Omit<AuditPoolGroupBrowsePanelProps, "onApplySelection"> {
  open: boolean;
  onClose: () => void;
  activeScope: AuditPoolQueueScope | null;
  onApplyScopes: (scope: AuditPoolQueueScope) => void;
  title?: string;
  description?: string;
}

export function AuditPoolQueueBrowseDrawer({
  open,
  onClose,
  activeScope,
  onApplyScopes,
  title = "选择审核范围",
  description = "支持多选与全选本页；确认后由服务端按 scopeIds 分页加载队列。",
  groupBy,
  ...panelProps
}: AuditPoolQueueBrowseDrawerProps) {
  const initialSelectedKeys = useMemo(() => {
    if (!activeScope || activeScope.type !== groupBy) {
      return [];
    }
    return activeScope.items.map((item) => auditPoolGroupKey(groupBy, item.id));
  }, [activeScope, groupBy]);

  function handleApplySelection(selectedGroups: AuditPoolGroupResponse[]) {
    if (selectedGroups.length === 0) {
      return;
    }
    const scope = buildQueueScope(
      groupBy as AuditPoolGroupBy,
      selectedGroups.map(scopeItemFromGroup),
    );
    onApplyScopes(scope);
    onClose();
  }

  return (
    <LHDrawerShell
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      width="lg"
      placement="left"
    >
      <AuditPoolGroupBrowsePanel
        {...panelProps}
        groupBy={groupBy}
        initialSelectedKeys={initialSelectedKeys}
        onApplySelection={handleApplySelection}
      />
    </LHDrawerShell>
  );
}
