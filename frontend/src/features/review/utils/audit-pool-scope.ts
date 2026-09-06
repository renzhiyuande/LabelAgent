import type { AuditPoolGroupResponse } from "../api/reviewer-workbench-api";
import type { AuditPoolGroupBy, AuditPoolQueueScope, AuditPoolScopeItem } from "../types";

export function scopeItemFromGroup(group: AuditPoolGroupResponse): AuditPoolScopeItem {
  return {
    id: String(group.scopeId),
    label: group.scopeLabel,
    subtitle: group.scopeSubtitle ?? undefined,
  };
}

export function buildQueueScope(type: AuditPoolGroupBy, items: AuditPoolScopeItem[]): AuditPoolQueueScope {
  return { type, items };
}

export function parseScopeIdsParam(scopeIdsParam: string | null): string[] {
  if (!scopeIdsParam?.trim()) {
    return [];
  }
  return [...new Set(scopeIdsParam.split(",").map((part) => part.trim()).filter(Boolean))];
}

export function serializeScopeIds(items: AuditPoolScopeItem[]): string {
  return items.map((item) => item.id).join(",");
}

export function auditPoolQueueScopeKey(scope: AuditPoolQueueScope | null): string {
  if (!scope || scope.items.length === 0) {
    return "";
  }
  const ids = scope.items.map((item) => item.id).sort().join(",");
  return `${scope.type}:${ids}`;
}

export function isSameAuditPoolQueueScope(
  left: AuditPoolQueueScope | null,
  right: AuditPoolQueueScope | null,
): boolean {
  return auditPoolQueueScopeKey(left) === auditPoolQueueScopeKey(right);
}

/** 单任务 scope 时用于 audit-pool/meta 与 workflow 对齐 */
export function resolveAuditPoolMetaTaskId(scope: AuditPoolQueueScope | null): number | undefined {
  if (!scope || scope.type !== "task" || scope.items.length !== 1) {
    return undefined;
  }
  const taskId = Number(scope.items[0].id);
  return Number.isFinite(taskId) ? taskId : undefined;
}
