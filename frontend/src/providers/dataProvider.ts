import type {
  BaseRecord,
  CreateParams,
  CustomParams,
  DataProvider,
  DeleteOneParams,
  GetListParams,
  GetOneParams,
  UpdateParams,
} from "@refinedev/core";
import {
  createRecord as engineCreateRecord,
  deleteRecord as engineDeleteRecord,
  fetchDetail,
  fetchEngineList,
  runBulkResourceAction,
  runResourceAction,
  updateRecord as engineUpdateRecord,
} from "@labelhub/low-code-engine";
import type { ResourceMeta } from "@labelhub/low-code-engine";
import type { EngineActionRequest, EngineBulkActionRequest, EngineListQuery, EngineListResult } from "@labelhub/low-code-engine";
import type { PageResponse } from "../types";
import { request } from "../utils/apiClient";

function resourcePath(resource: string): string {
  return resource.startsWith("/") ? resource : `/api/v1/${resource}`;
}

type EngineListFetcher = (query: EngineListQuery) => Promise<EngineListResult<BaseRecord>>;

export const dataProvider: DataProvider = {
  getList: async <TData extends BaseRecord = BaseRecord>({ resource, pagination, meta }: GetListParams) => {
    const engineQuery = meta?.engineQuery as EngineListQuery | undefined;
    const resourceMeta = meta?.resourceMeta as ResourceMeta | undefined;
    const fetchList = meta?.fetchList as EngineListFetcher | undefined;

    if (engineQuery) {
      const result = fetchList
        ? await fetchList(engineQuery)
        : resourceMeta
          ? await fetchEngineList<TData>(resourceMeta, engineQuery)
          : null;
      if (result) {
        return { data: result.data as TData[], total: result.total };
      }
    }

    const current = pagination?.current ?? 1;
    const pageSize = pagination?.pageSize ?? 10;
    const url = `${resourcePath(resource)}?page=${current}&pageSize=${pageSize}`;
    const page = await request<PageResponse<TData>>(url);
    return { data: page.list, total: page.total };
  },
  getOne: async <TData extends BaseRecord = BaseRecord>({ resource, id, meta }: GetOneParams) => {
    const resourceMeta = meta?.resourceMeta as ResourceMeta | undefined;
    if (resourceMeta) {
      const data = await fetchDetail<TData>(resourceMeta, id);
      return { data };
    }
    const data = await request<TData>(`${resourcePath(resource)}/${id}`);
    return { data };
  },
  create: async <TData extends BaseRecord = BaseRecord, TVariables = object>({
    resource,
    variables,
    meta,
  }: CreateParams<TVariables>) => {
    const resourceMeta = meta?.resourceMeta as ResourceMeta | undefined;
    if (resourceMeta) {
      const data = await engineCreateRecord<TData>(resourceMeta, variables as Record<string, unknown>);
      return { data };
    }
    const data = await request<TData>(resourcePath(resource), {
      method: "POST",
      body: JSON.stringify(variables),
    });
    return { data };
  },
  update: async <TData extends BaseRecord = BaseRecord, TVariables = object>({
    resource,
    id,
    variables,
    meta,
  }: UpdateParams<TVariables>) => {
    const resourceMeta = meta?.resourceMeta as ResourceMeta | undefined;
    if (resourceMeta) {
      const data = await engineUpdateRecord<TData>(resourceMeta, id, variables as Record<string, unknown>);
      return { data };
    }
    const data = await request<TData>(`${resourcePath(resource)}/${id}`, {
      method: "PUT",
      body: JSON.stringify(variables),
    });
    return { data };
  },
  deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = object>({
    resource,
    id,
    meta,
  }: DeleteOneParams<TVariables>) => {
    const resourceMeta = meta?.resourceMeta as ResourceMeta | undefined;
    if (resourceMeta) {
      await engineDeleteRecord(resourceMeta, id);
      return { data: {} as TData };
    }
    const data = await request<TData>(`${resourcePath(resource)}/${id}`, { method: "DELETE" });
    return { data };
  },
  custom: async <TData extends BaseRecord = BaseRecord>({ meta }: CustomParams) => {
    const bulkActionRequest = meta?.bulkActionRequest as EngineBulkActionRequest | undefined;
    if (bulkActionRequest) {
      await runBulkResourceAction(bulkActionRequest);
      return { data: {} as TData };
    }
    const actionRequest = meta?.actionRequest as EngineActionRequest | undefined;
    if (actionRequest) {
      const actionData = await runResourceAction(actionRequest);
      return { data: (actionData ?? {}) as TData };
    }
    throw new Error("Unsupported custom mutation");
  },
  getApiUrl: () => import.meta.env.VITE_API_BASE_URL ?? "",
};
