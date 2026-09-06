import { useList } from "@refinedev/core";
import { useMemo } from "react";
import { fetchLegacyList } from "../adapters/request";
import { resourceListQueryKey } from "../adapters/query-keys";
import type { ResourceMeta } from "../schema/types";
import type { EngineListQuery, EngineListResult, ResourceRecord } from "../types";
import { listApiRequiresPathParams, usesLegacyListApi } from "../utils/resolve-legacy-action-api";
import { useResourcePageVisibleRefetch } from "./use-resource-page-visible-refetch";

interface UseResourceListOptions<TRecord extends ResourceRecord> {
  reloadToken?: number;
  fetchList?: (query: EngineListQuery) => Promise<EngineListResult<TRecord>>;
  /** 注入 api.list 中的 {taskId} 等路径占位符 */
  listPathParams?: Record<string, string | number>;
  enabled?: boolean;
  /** keepAlive 切回该资源页时自动刷新列表，LHResourcePage 默认开启 */
  visibleRefetch?: boolean;
}

export function useResourceList<TRecord extends ResourceRecord>(
  resource: ResourceMeta,
  listQuery: EngineListQuery,
  options: UseResourceListOptions<TRecord> = {},
) {
  const { reloadToken = 0, fetchList, listPathParams, enabled = true, visibleRefetch = true } = options;

  const resolvedFetchList = useMemo(() => {
    if (fetchList) {
      return fetchList;
    }
    const useLegacyList =
      usesLegacyListApi(resource) || (listApiRequiresPathParams(resource) && Boolean(listPathParams));
    if (!useLegacyList) {
      return undefined;
    }
    // 优先使用 dataProvider 传入的 query（refetch 时与 queryKey 一致）；否则回退 hook 内 listQuery
    return (query: EngineListQuery) =>
      fetchLegacyList<TRecord>(resource, query ?? listQuery, listPathParams ?? {});
  }, [fetchList, listPathParams, listQuery, resource]);

  const { data, isLoading, isFetching, refetch } = useList<TRecord>({
    resource: resource.resource,
    pagination: {
      current: listQuery.page,
      pageSize: listQuery.pageSize,
    },
    meta: {
      engineQuery: listQuery,
      resourceMeta: resource,
      fetchList: resolvedFetchList,
    },
    queryOptions: {
      queryKey: resourceListQueryKey(resource.resource, listQuery, reloadToken),
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      retry: false,
      enabled,
    },
  });

  const records = (data?.data ?? []) as TRecord[];
  const total = data?.total ?? 0;
  const hasCachedData = data !== undefined;
  const initialLoading = !hasCachedData && (isLoading || isFetching);
  const refreshing = hasCachedData && isFetching;

  useResourcePageVisibleRefetch(resource.resource, {
    enabled: visibleRefetch && enabled,
    initialLoading,
  });

  return {
    records,
    total,
    hasCachedData,
    initialLoading,
    refreshing,
    loading: initialLoading,
    refetch,
  };
}
