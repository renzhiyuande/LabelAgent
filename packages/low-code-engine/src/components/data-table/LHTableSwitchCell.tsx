import { useState } from "react";
import { Switch } from "../../components/ui/switch";
import { evaluateConditions } from "../../utils/visibility";
import { hasPermission } from "../../utils/permissions";
import { isActionBlockedForRecord } from "../../utils/action-guards";
import type { ActionSchema, ResourceMeta, TableColumnSchema, TableColumnSlotSwitchMeta } from "../../schema/types";
import type { ResourceRecord } from "../../types";
import type { AuthenticatedUser } from "../../lib/types";

function isSwitchColumn(column: TableColumnSchema): boolean {
  return column.type === "switch" || column.slot === "switch";
}

export function resolveSwitchColumnValues(column: TableColumnSchema) {
  const meta = column.slotMeta as TableColumnSlotSwitchMeta | undefined;
  const isStatusField = column.key === "status";
  return {
    checkedValue: meta?.checkedValue ?? (isStatusField ? "ACTIVE" : true),
    uncheckedValue: meta?.uncheckedValue ?? (isStatusField ? "DISABLED" : false),
    enableAction: meta?.enableAction ?? "enable",
    disableAction: meta?.disableAction ?? "disable",
  };
}

function isSwitchChecked(rawValue: unknown, checkedValue: unknown): boolean {
  return String(rawValue) === String(checkedValue);
}

interface LHTableSwitchCellProps {
  column: TableColumnSchema;
  record: ResourceRecord;
  resource: ResourceMeta;
  actions: ActionSchema[];
  currentUser: AuthenticatedUser | null;
  onSwitchAction: (action: ActionSchema, record: ResourceRecord, column: TableColumnSchema) => Promise<void>;
}

export function LHTableSwitchCell({
  column,
  record,
  resource,
  actions,
  currentUser,
  onSwitchAction,
}: LHTableSwitchCellProps) {
  const [pending, setPending] = useState(false);
  const slotMeta = column.slotMeta as TableColumnSlotSwitchMeta | undefined;
  const { checkedValue, enableAction, disableAction } = resolveSwitchColumnValues(column);
  const rawValue = record[column.key];
  const checked = isSwitchChecked(rawValue, checkedValue);

  const enableActionDef = actions.find((action) => action.key === enableAction);
  const disableActionDef = actions.find((action) => action.key === disableAction);
  const targetAction = checked ? disableActionDef : enableActionDef;

  const blocked =
    targetAction != null &&
    isActionBlockedForRecord(
      resource.resource,
      targetAction.key,
      record as Record<string, unknown>,
      currentUser,
      resource.idKey,
    );

  const disabled =
    pending ||
    !targetAction ||
    blocked ||
    !hasPermission(currentUser, slotMeta?.permission ?? targetAction.permission) ||
    (slotMeta?.disabledWhen ? evaluateConditions(record as Record<string, unknown>, slotMeta.disabledWhen) : false);

  async function handleCheckedChange(nextChecked: boolean) {
    if (disabled) {
      return;
    }
    const action = nextChecked ? enableActionDef : disableActionDef;
    if (!action) {
      return;
    }
    setPending(true);
    try {
      await onSwitchAction(action, record, column);
    } finally {
      setPending(false);
    }
  }

  return (
    <Switch
      checked={checked}
      disabled={disabled}
      aria-label={`${column.title}${checked ? "：已开启" : "：已关闭"}`}
      onCheckedChange={(nextChecked) => {
        if (nextChecked === checked) {
          return;
        }
        void handleCheckedChange(nextChecked);
      }}
    />
  );
}

export function findSwitchColumn(resource: ResourceMeta): TableColumnSchema | undefined {
  return resource.table?.columns.find(isSwitchColumn);
}
