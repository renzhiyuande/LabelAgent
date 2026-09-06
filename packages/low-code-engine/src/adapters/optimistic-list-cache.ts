import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { resourceListRootKey } from "./query-keys";
import type { EngineListQuery } from "../types";
import type { ResourceMeta } from "../schema/types";
import type { ResourceRecord } from "../types";

export interface OptimisticListSnapshot {
  queryKey: QueryKey;
  data: unknown;
}

export interface OptimisticRecordPatch {
  field: string;
  value: unknown;
  removeFromList: boolean;
}

type ListCacheData = {
  data?: ResourceRecord[];
  total?: number;
};

export function resolveOptimisticRecordPatch(
  actionKey: string,
  listQuery: EngineListQuery,
  options?: {
    field?: string;
    activeValue?: unknown;
    inactiveValue?: unknown;
  },
): OptimisticRecordPatch | null {
  const field = options?.field ?? "status";
  const activeValue = options?.activeValue ?? "ACTIVE";
  const inactiveValue = options?.inactiveValue ?? "DISABLED";
  const nextValue =
    actionKey === "enable" ? activeValue : actionKey === "disable" ? inactiveValue : null;
  if (nextValue == null) {
    return null;
  }

  const fieldFilter = listQuery.filters?.find((item) => item.field === field && item.op === "eq");
  const removeFromList = fieldFilter != null && String(fieldFilter.value) !== nextValue;

  return { field, value: nextValue, removeFromList };
}

function matchesRecordId(record: ResourceRecord, idKey: string, recordId: string | number): boolean {
  const value = record[idKey];
  return value === recordId || String(value) === String(recordId);
}

export function applyOptimisticListPatch(
  queryClient: QueryClient,
  resource: ResourceMeta,
  recordId: string | number,
  patch: OptimisticRecordPatch,
): OptimisticListSnapshot[] {
  const snapshots: OptimisticListSnapshot[] = [];

  for (const [queryKey, cached] of queryClient.getQueriesData<ListCacheData>({
    queryKey: resourceListRootKey(resource.resource),
  })) {
    if (!cached || !Array.isArray(cached.data)) {
      continue;
    }

    snapshots.push({ queryKey, data: cached });

    const nextData = patch.removeFromList
      ? cached.data.filter((record) => !matchesRecordId(record, resource.idKey, recordId))
      : cached.data.map((record) =>
          matchesRecordId(record, resource.idKey, recordId)
            ? { ...record, [patch.field]: patch.value }
            : record,
        );

    const removedCount = patch.removeFromList
      ? cached.data.length - nextData.length
      : 0;

    queryClient.setQueryData<ListCacheData>(queryKey, {
      ...cached,
      data: nextData,
      total: removedCount > 0 ? Math.max(0, (cached.total ?? cached.data.length) - removedCount) : cached.total,
    });
  }

  return snapshots;
}

export function rollbackOptimisticListPatches(
  queryClient: QueryClient,
  snapshots: OptimisticListSnapshot[],
) {
  for (const snapshot of snapshots) {
    queryClient.setQueryData(snapshot.queryKey, snapshot.data);
  }
}
