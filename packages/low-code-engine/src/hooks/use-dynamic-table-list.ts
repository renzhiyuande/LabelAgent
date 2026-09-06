import { useMemo, useState } from "react";
import { normalizeSnowflakeId } from "../lib/id-utils";
import type { FormFieldSchema, ResourceMeta } from "../schema/types";
import type { DynamicTableFormContext } from "../utils/resolve-dynamic-table-scope";
import { resolveDynamicTableScope } from "../utils/resolve-dynamic-table-scope";
import { applyScopeToListQuery } from "../utils/list-scope";
import { useResourceList } from "./use-resource-list";
import type { ResourceRecord } from "../types";

export function useDynamicTableList<TRecord extends ResourceRecord>(
  field: FormFieldSchema,
  listResource: ResourceMeta,
  formContext?: DynamicTableFormContext,
  values?: Record<string, unknown>,
) {
  const meta = field.dynamicTable!;
  const defaultPageSize = meta.pageSize ?? 10;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);

  function setPageSize(nextSize: number) {
    if (!Number.isFinite(nextSize) || nextSize <= 0) {
      return;
    }
    setPageSizeState(nextSize);
    setPage(1);
  }
  const scope = resolveDynamicTableScope(meta, formContext, values);
  const listPathParams = useMemo(() => {
    if (!scope) {
      return undefined;
    }
    const scopeValue = normalizeSnowflakeId(scope.value);
    return scopeValue ? { [scope.field]: scopeValue } : undefined;
  }, [scope]);

  const listQuery = useMemo(() => {
    const defaultSort = listResource.table?.defaultSort;
    const base = {
      page,
      pageSize,
      filters: [...(meta.listFilters ?? [])],
      sort: defaultSort
        ? [
            {
              field: defaultSort.field,
              order: defaultSort.order,
            },
          ]
        : [],
    };
    return scope ? applyScopeToListQuery(base, scope) : base;
  }, [listResource.table?.defaultSort, meta.listFilters, page, pageSize, scope]);

  const enabled = meta.dataSource !== "static" && Boolean(scope && listResource.api.query);

  const { records, total, initialLoading, refreshing, refetch } = useResourceList<TRecord>(
    listResource,
    listQuery,
    { listPathParams, enabled },
  );

  return {
    records,
    total,
    loading: initialLoading,
    refreshing,
    page,
    pageSize,
    setPage,
    setPageSize,
    refetch,
    scopeReady: Boolean(scope),
  };
}
