import { useEffect, useMemo, useRef, useState } from "react";
import { toListQuery } from "../adapters/filters";
import type { ActionSchema, ResourceMeta } from "../schema/types";
import type { ResourceRecord } from "../types";

export function useResourcePage(resource: ResourceMeta, pageSize: number) {
  const initialFilters = useMemo(
    () =>
      resource.filters.fields.reduce<Record<string, unknown>>((accumulator, field) => {
        accumulator[field.key] = field.defaultValue ?? "";
        return accumulator;
      }, {}),
    [resource],
  );

  const [page, setPage] = useState(1);
  const [pageSizeState, setPageSizeState] = useState(pageSize);
  const [filters, setFilters] = useState<Record<string, unknown>>(initialFilters);
  const [queryFilters, setQueryFilters] = useState<Record<string, unknown>>(initialFilters);
  const initialSort = resource.table?.defaultSort;
  const [sort, setSort] = useState<Array<{ field: string; order: "asc" | "desc" }>>(
    initialSort ? [initialSort] : [],
  );
  const [selectedRowKeys, setSelectedRowKeys] = useState<Array<string | number>>([]);
  const [selectedRecord, setSelectedRecord] = useState<ResourceRecord | null>(null);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit" | "detail" | null>(null);
  const [pendingAction, setPendingAction] = useState<ActionSchema | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const skipInitialResourceResetRef = useRef(true);

  useEffect(() => {
    if (skipInitialResourceResetRef.current) {
      skipInitialResourceResetRef.current = false;
      return;
    }
    setFilters(initialFilters);
    setQueryFilters(initialFilters);
    setPage(1);
    setPageSizeState(pageSize);
    const sortReset = resource.table?.defaultSort;
    setSort(sortReset ? [sortReset] : []);
    setSelectedRowKeys([]);
    setSelectedRecord(null);
    setDrawerMode(null);
    setPendingAction(null);
  }, [initialFilters, pageSize, resource]);

  const listQuery = useMemo(
    () => toListQuery(page, pageSizeState, queryFilters, resource.filters, sort),
    [page, pageSizeState, queryFilters, resource, sort],
  );

  return {
    page,
    pageSize: pageSizeState,
    filters,
    queryFilters,
    sort,
    selectedRowKeys,
    setFilters,
    submitFilters: (nextFilters?: Record<string, unknown>) => {
      const applied = nextFilters ?? filters;
      if (nextFilters) {
        setFilters(nextFilters);
      }
      setQueryFilters(applied);
      setPage(1);
    },
    reload: () => {
      setReloadToken((current) => current + 1);
    },
    listQuery,
    reloadToken,
    setPage,
    setPageSize: (nextPageSize: number) => {
      setPageSizeState(nextPageSize);
      setPage(1);
    },
    setSort,
    setSelectedRowKeys,
    selectedRecord,
    setSelectedRecord,
    drawerMode,
    setDrawerMode,
    pendingAction,
    setPendingAction,
  };
}
