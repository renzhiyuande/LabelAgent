import type { EngineListQuery, EngineListResult, ResourceRecord } from "../types";
import type { ResourceMeta } from "../schema/types";
import type { ResourceListScope } from "../utils/list-scope";

export type SidePanelListLoader = (params: {
  query: EngineListQuery;
  scope: ResourceListScope;
  resource: ResourceMeta;
}) => Promise<EngineListResult<ResourceRecord>>;

const sidePanelListLoaderRegistry = new Map<string, SidePanelListLoader>();

export function registerSidePanelListLoader(code: string, loader: SidePanelListLoader) {
  sidePanelListLoaderRegistry.set(code, loader);
}

export function resolveSidePanelListLoader(code?: string): SidePanelListLoader | undefined {
  if (!code) {
    return undefined;
  }
  return sidePanelListLoaderRegistry.get(code);
}

