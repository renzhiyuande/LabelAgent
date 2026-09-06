import type { EngineListQuery } from "../types";

export function resourceListRootKey(resource: string) {
  return ["resource-list", resource] as const;
}

export function resourceListQueryKey(resource: string, listQuery: EngineListQuery, reloadToken: number) {
  return [...resourceListRootKey(resource), listQuery, reloadToken] as const;
}
