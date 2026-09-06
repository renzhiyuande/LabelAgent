import { useMemo, useRef } from "react";
import { normalizeRemoteOptionQuery } from "../adapters/request";
import type { OptionItem, RemoteOptionQuery } from "../schema/types";

export function useRemoteOptionsCache(
  loadRemoteOptions?: (source: string, query?: string | RemoteOptionQuery) => Promise<OptionItem[]>,
) {
  const remoteOptionsCache = useRef<Record<string, Promise<OptionItem[]>>>({});

  return useMemo(() => {
    if (!loadRemoteOptions) return undefined;
    return async (source: string, query?: string | RemoteOptionQuery) => {
      const normalized = normalizeRemoteOptionQuery(query);
      const cacheKey = [
        source,
        normalized.keyword ? `keyword=${normalized.keyword}` : "",
        normalized.role ? `role=${normalized.role}` : "",
      ]
        .filter(Boolean)
        .join("?");
      if (!remoteOptionsCache.current[cacheKey]) {
        remoteOptionsCache.current[cacheKey] = loadRemoteOptions(source, normalized);
      }
      return remoteOptionsCache.current[cacheKey];
    };
  }, [loadRemoteOptions]);
}
