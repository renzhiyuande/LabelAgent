import type { ActionSchema, ResourceMeta } from "../schema/types";

const BULK_CAPABLE_ACTION_KEYS = ["enable", "disable", "delete"] as const;

function injectBulkCount(text: string): string {
  if (text.includes("{count}")) {
    return text;
  }
  const trimmed = text.replace(/[？?]\s*$/, "");
  return `${trimmed} {count} 项？`;
}

function adaptRowActionForBulk(action: ActionSchema): ActionSchema {
  if (!action.confirm && action.kind !== "danger" && action.key !== "disable") {
    return action;
  }

  return {
    ...action,
    confirm: {
      title: action.confirm?.title
        ? injectBulkCount(action.confirm.title)
        : `确认${action.label}选中的 {count} 项？`,
      description: action.confirm?.description
        ? injectBulkCount(action.confirm.description)
        : action.confirm?.description,
      confirmText: action.confirm?.confirmText,
      cancelText: action.confirm?.cancelText,
    },
  };
}

export function resolveResourceBulkActions(resource: ResourceMeta): ActionSchema[] {
  const rowActions = resource.actions ?? [];
  const table = resource.table;
  if (!table) return [];

  const configuredActions = table.bulkActions;

  if (configuredActions !== undefined) {
    return configuredActions;
  }

  if (!table.selectable) {
    return [];
  }

  return BULK_CAPABLE_ACTION_KEYS.map((key) => rowActions.find((action) => action.key === key))
    .filter((action): action is ActionSchema => Boolean(action))
    .map(adaptRowActionForBulk);
}
