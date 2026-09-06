import type { ActionSchema, CardPageSchema, ResourceMeta } from "../schema/types";
import { evaluateConditions } from "./visibility";
import { hasPermission } from "./permissions";
import { isActionBlockedForRecord } from "./action-guards";
import type { AuthenticatedUser } from "../lib/types";

function resolveAction(resource: ResourceMeta, key: string): ActionSchema | undefined {
  return resource.actions?.find((action) => action.key === key);
}

export function resolveCardVisibleActions(
  resource: ResourceMeta,
  record: Record<string, unknown>,
  currentUser: AuthenticatedUser | null,
): ActionSchema[] {
  return (resource.actions ?? []).filter((action) => {
    if (!hasPermission(currentUser, action.permission)) {
      return false;
    }
    if (!evaluateConditions(record, action.visibleWhen)) {
      return false;
    }
    if (isActionBlockedForRecord(resource.resource, action.key, record, currentUser, resource.idKey)) {
      return false;
    }
    return true;
  });
}

export function resolveCardPrimaryAction(
  resource: ResourceMeta,
  card: CardPageSchema,
  record: Record<string, unknown>,
  currentUser: AuthenticatedUser | null,
): ActionSchema | undefined {
  const visible = resolveCardVisibleActions(resource, record, currentUser);
  if (card.primaryAction) {
    const matched = visible.find((action) => action.key === card.primaryAction);
    if (matched) {
      return matched;
    }
    const configured = resolveAction(resource, card.primaryAction);
    if (!configured && import.meta.env.DEV) {
      console.warn(
        `[card] primaryAction "${card.primaryAction}" not found on resource "${resource.resource}"`,
      );
    }
  }
  return visible.find((action) => action.kind === "request" || action.kind === "link") ?? visible[0];
}

export function resolveCardOverflowActions(
  resource: ResourceMeta,
  card: CardPageSchema,
  record: Record<string, unknown>,
  currentUser: AuthenticatedUser | null,
  primary?: ActionSchema,
): ActionSchema[] {
  if (card.showOverflowMenu === false) {
    return [];
  }
  const visible = resolveCardVisibleActions(resource, record, currentUser);
  const reserved = new Set<string>(
    [primary?.key, card.primaryAction, ...(card.secondaryActions ?? [])].filter(Boolean) as string[],
  );
  const secondary = (card.secondaryActions ?? [])
    .map((key) => resolveAction(resource, key))
    .filter((action): action is ActionSchema => Boolean(action))
    .filter((action) => visible.some((item) => item.key === action.key));
  const overflow = visible.filter((action) => !reserved.has(action.key));
  return [...secondary, ...overflow];
}
