import { request } from "./lowcode-utils";
import type {
  EngineActionRequest,
  EngineBulkActionRequest,
  EngineListQuery,
  EngineListResult,
  ResourcePageResponse,
} from "../types";
import type {
  FormSchema,
  HeaderActionSchema,
  OptionItem,
  OptionSourceItem,
  RemoteSchemaMeta,
  RemoteOptionMeta,
  RemoteOptionQuery,
  ResourceMeta,
} from "../schema/types";
import {
  filterTreeOptions,
  flattenLeafTreeOptions,
  mapApiTreeNodes,
  mapMenuTreeNodes,
  resolveRemoteTreeApi,
  type ApiTreeOptionNode,
  type TreeOptionNode,
} from "./tree-options";
import { resolveDefaultRemoteOptionPath } from "../utils/remote-option-endpoints";
import { normalizeSnowflakeId } from "../lib/id-utils";
import { applyPathParams, buildParamsFromValues, buildPathParamsFromRecord } from "./path";
import { usesLegacyCreateApi, usesLegacyDetailApi, usesLegacyUpdateApi } from "../utils/resolve-legacy-action-api";
import { getValueAtPath } from "../utils/object-path";
import { applyRemoteSchemaBindingsToRecord, applyRemoteSchemaBindingsToValues } from "../utils/remote-schema";

export const REMOTE_SCHEMA_CACHE_TTL_MS = 5 * 60 * 1000;
export const REMOTE_SCHEMA_CACHE_MAX_ENTRIES = 100;

function buildQueryString(query: Record<string, string>): string {
  const params = new URLSearchParams(query);
  const value = params.toString();
  return value ? `?${value}` : "";
}

function normalizeResourceRecord(
  resource: ResourceMeta,
  record: Record<string, unknown>,
): Record<string, unknown> {
  const boundRecord = applyRemoteSchemaBindingsToRecord(record, resource);
  return resource.normalizeRecord ? resource.normalizeRecord(boundRecord) : boundRecord;
}

function prepareResourceValues(
  resource: ResourceMeta,
  values: Record<string, unknown>,
): Record<string, unknown> {
  const prepared = resource.prepareValues ? resource.prepareValues(values) : values;
  return applyRemoteSchemaBindingsToValues(prepared, values, resource);
}

export function buildLegacyListPath(
  resource: ResourceMeta,
  query: EngineListQuery,
  pathParams: Record<string, string | number> = {},
): string {
  const listApi = resource.api.query ?? resource.api.list;
  if (!listApi) {
    throw new Error(`Resource "${resource.resource}" does not define api.query`);
  }
  if (listApi.includes("{")) {
    return buildLegacyListPathFromTemplate(listApi, pathParams, query);
  }
  const params: Record<string, string> = {
    page: String(query.page),
    pageSize: String(query.pageSize),
  };
  if (query.keyword) {
    params.keyword = query.keyword;
  }
  for (const filter of query.filters ?? []) {
    if (filter.field === "keyword" || Array.isArray(filter.value) || typeof filter.value === "object") {
      continue;
    }
    params[filter.field] = String(filter.value);
  }
  return `${listApi}${buildQueryString(params)}`;
}

export function buildLegacyListPathFromTemplate(
  pathTemplate: string,
  params: Record<string, string | number>,
  query: EngineListQuery,
): string {
  const basePath = applyPathParams(pathTemplate, params);
  const queryParams: Record<string, string> = {
    page: String(query.page),
    pageSize: String(query.pageSize),
  };
  if (query.keyword) {
    queryParams.keyword = query.keyword;
  }
  for (const filter of query.filters ?? []) {
    if (
      filter.field === "keyword" ||
      filter.field in params ||
      Array.isArray(filter.value) ||
      typeof filter.value === "object"
    ) {
      continue;
    }
    queryParams[filter.field] = String(filter.value);
  }
  return `${basePath}${buildQueryString(queryParams)}`;
}

export async function fetchLegacyList<TRecord>(
  resource: ResourceMeta,
  query: EngineListQuery,
  pathParams: Record<string, string | number> = {},
): Promise<EngineListResult<TRecord>> {
  const page = await request<ResourcePageResponse<TRecord>>(buildLegacyListPath(resource, query, pathParams));
  return {
    data: page.list.map((record: TRecord) => normalizeResourceRecord(resource, record as Record<string, unknown>)) as TRecord[],
    total: page.total,
    page: page.page,
    pageSize: page.pageSize,
  };
}

export async function fetchEngineList<TRecord>(
  resource: ResourceMeta,
  query: EngineListQuery,
): Promise<EngineListResult<TRecord>> {
  const page = await request<ResourcePageResponse<TRecord>>(
    `/api/v1/engine/resources/${encodeURIComponent(resource.resource)}/query`,
    {
      method: "POST",
      body: JSON.stringify({
        page: query.page,
        pageSize: query.pageSize,
        sort: query.sort ?? [],
        filters: query.filters ?? [],
      }),
    },
  );
  return {
    data: page.list.map((record: TRecord) => normalizeResourceRecord(resource, record as Record<string, unknown>)) as TRecord[],
    total: page.total,
    page: page.page,
    pageSize: page.pageSize,
  };
}

export async function fetchDetail<TRecord>(
  resource: ResourceMeta,
  id: string | number,
  pathParams: Record<string, string | number> = {},
): Promise<TRecord> {
  if (usesLegacyDetailApi(resource)) {
    const record = await request<TRecord>(applyPathParams(resource.api.detail!, { ...pathParams, id }));
    return normalizeResourceRecord(resource, record as Record<string, unknown>) as TRecord;
  }
  // 引擎默认: GET /api/v1/engine/resources/{resource}/{id}
  const url = `/api/v1/engine/resources/${encodeURIComponent(resource.resource)}/${encodeURIComponent(String(id))}`;
  const record = await request<TRecord>(url);
  return normalizeResourceRecord(resource, record as Record<string, unknown>) as TRecord;
}

export async function createRecord<TRecord>(
  resource: ResourceMeta,
  values: Record<string, unknown>,
): Promise<TRecord> {
  const payload = prepareResourceValues(resource, values);
  if (usesLegacyCreateApi(resource)) {
    if (resource.api.createViaQuery) {
      const queryParams: Record<string, string> = {};
      for (const [key, value] of Object.entries(payload)) {
        if (value === null || value === undefined || value === "") {
          continue;
        }
        queryParams[key] = String(value);
      }
      const record = await request<TRecord>(`${resource.api.create!}${buildQueryString(queryParams)}`, {
        method: "POST",
      });
      return normalizeResourceRecord(resource, record as Record<string, unknown>) as TRecord;
    }
    const record = await request<TRecord>(resource.api.create!, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return normalizeResourceRecord(resource, record as Record<string, unknown>) as TRecord;
  }
  // 引擎默认: POST /api/v1/engine/resources/{resource}
  const url = `/api/v1/engine/resources/${encodeURIComponent(resource.resource)}`;
  const record = await request<TRecord>(url, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeResourceRecord(resource, record as Record<string, unknown>) as TRecord;
}

export async function updateRecord<TRecord>(
  resource: ResourceMeta,
  id: string | number,
  values: Record<string, unknown>,
): Promise<TRecord> {
  const payload = prepareResourceValues(resource, values);
  if (usesLegacyUpdateApi(resource)) {
    const record = await request<TRecord>(applyPathParams(resource.api.update!, { id }), {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return normalizeResourceRecord(resource, record as Record<string, unknown>) as TRecord;
  }
  // 引擎默认: PUT /api/v1/engine/resources/{resource}/{id}
  const url = `/api/v1/engine/resources/${encodeURIComponent(resource.resource)}/${encodeURIComponent(String(id))}`;
  const record = await request<TRecord>(url, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return normalizeResourceRecord(resource, record as Record<string, unknown>) as TRecord;
}

export async function deleteRecord(
  resource: ResourceMeta,
  id: string | number,
): Promise<void> {
  if (!resource.api.delete) {
    throw new Error(`Missing delete api for ${resource.resource}`);
  }
  await request<void>(applyPathParams(resource.api.delete, { id }), {
    method: "DELETE",
  });
}

export async function runResourceAction(
  requestInput: EngineActionRequest,
): Promise<Record<string, unknown> | void> {
  const { resource, action, record } = requestInput;
  const recordId = record[resource.idKey] as string | number;
  const pathTemplate = action.api ?? resource.api.actions?.[action.key];
  if (!pathTemplate) {
    await runEngineAction(resource.resource, recordId, action.key);
    return;
  }
  const pathParams = buildPathParamsFromRecord(record, resource.idKey);
  const response = await request<Record<string, unknown>>(
    applyPathParams(pathTemplate, pathParams),
    {
      method: "POST",
      body: buildActionRequestBody(action.requestBody, record),
    },
  );
  if (response && typeof response === "object") {
    return normalizeResourceRecord(resource, response);
  }
  return undefined;
}

function buildActionRequestBody(
  template: Record<string, unknown> | undefined,
  record: Record<string, unknown>,
): string | undefined {
  if (!template) {
    return undefined;
  }
  const resolvedEntries = Object.entries(template).map(([key, value]) => [key, resolveActionRequestValue(value, record)]);
  return JSON.stringify(Object.fromEntries(resolvedEntries));
}

function resolveActionRequestValue(value: unknown, record: Record<string, unknown>): unknown {
  if (typeof value === "string" && value.startsWith("$record.")) {
    return record[value.slice("$record.".length)];
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveActionRequestValue(item, record));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
        key,
        resolveActionRequestValue(nestedValue, record),
      ]),
    );
  }
  return value;
}

export function resolveHeaderActionApi(resource: ResourceMeta, action: HeaderActionSchema): string | undefined {
  return action.api ?? resource.api.actions?.[action.key];
}

export async function runHeaderRequestAction(
  resource: ResourceMeta,
  action: HeaderActionSchema,
  values: Record<string, unknown>,
): Promise<Record<string, unknown> | void> {
  const pathTemplate = resolveHeaderActionApi(resource, action);
  if (!pathTemplate) {
    throw new Error(`Missing api for header action: ${action.key}`);
  }
  const response = await request<Record<string, unknown>>(
    applyPathParams(pathTemplate, buildParamsFromValues(values)),
    { method: "POST" },
  );
  if (response && typeof response === "object") {
    return normalizeResourceRecord(resource, response);
  }
  return undefined;
}

export function buildEngineActionPath(resource: string, id: string | number, actionKey: string): string {
  return `/api/v1/engine/resources/${encodeURIComponent(resource)}/${encodeURIComponent(String(id))}/actions/${encodeURIComponent(actionKey)}`;
}

export function buildEngineBatchActionPath(resource: string, actionKey: string): string {
  return `/api/v1/engine/resources/${encodeURIComponent(resource)}/actions/${encodeURIComponent(actionKey)}/batch`;
}

function normalizeEngineBatchIds(ids: Array<string | number>): string[] {
  return ids
    .map((id) => normalizeSnowflakeId(id))
    .filter((id): id is string => {
      if (!id) {
        return false;
      }
      return /^\d+$/.test(id) && !/^0+$/.test(id);
    });
}

export async function runEngineAction(
  resource: string,
  id: string | number,
  actionKey: string,
): Promise<void> {
  await request<void>(buildEngineActionPath(resource, id, actionKey), { method: "POST" });
}

export async function runBatchAction(
  resource: string,
  actionKey: string,
  ids: Array<string | number>,
): Promise<void> {
  const normalizedIds = normalizeEngineBatchIds(ids);
  if (normalizedIds.length === 0) {
    return;
  }
  await request<void>(buildEngineBatchActionPath(resource, actionKey), {
    method: "POST",
    body: JSON.stringify({ ids: normalizedIds }),
  });
}

/** @deprecated Use {@link runBatchAction} */
export const runEngineBatchAction = runBatchAction;

export async function runBulkResourceAction(requestInput: EngineBulkActionRequest): Promise<void> {
  const { resource, action, ids, scope, values } = requestInput;
  const customApi = action.bulkApi ?? action.api;
  if (customApi) {
    const normalizedIds = normalizeEngineBatchIds(ids);
    if (normalizedIds.length === 0) {
      return;
    }
    const fixedBody = action.requestBody
      ? Object.fromEntries(
          Object.entries(action.requestBody).map(([key, value]) => [key, resolveActionRequestValue(value, {})]),
        )
      : {};
    const body = { ids: normalizedIds, ...fixedBody, ...(values ?? {}) };
    await request<void>(applyPathParams(customApi, {}), {
      method: "POST",
      body: JSON.stringify(body),
    });
    return;
  }
  await runBatchAction(resource.resource, action.key, ids);
}

export async function fetchOptionSources(): Promise<OptionSourceItem[]> {
  return request<OptionSourceItem[]>("/api/v1/engine/options");
}

export function normalizeRemoteOptionQuery(query?: string | RemoteOptionQuery): RemoteOptionQuery {
  if (typeof query === "string") {
    return query ? { keyword: query } : {};
  }
  return query ?? {};
}

/** 统一远程选项 value 为字符串，避免雪花 ID 与 Combobox 严格相等失败 */
export function normalizeRemoteOptionItems(options: OptionItem[]): OptionItem[] {
  return options.map((option) => {
    const normalizedValue = normalizeSnowflakeId(option.value) ?? (option.value == null ? "" : String(option.value));
    return normalizedValue === option.value ? option : { ...option, value: normalizedValue };
  });
}

function buildRemoteOptionQueryString(query?: string | RemoteOptionQuery): string {
  const normalized = normalizeRemoteOptionQuery(query);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(normalized)) {
    if (value != null && value !== "") {
      params.set(key, value);
    }
  }
  const value = params.toString();
  return value ? `?${value}` : "";
}

export async function fetchRemoteOptions(
  resource: ResourceMeta,
  source: string,
  query?: string | RemoteOptionQuery,
): Promise<OptionItem[]> {
  const queryString = buildRemoteOptionQueryString(query);
  const configuredPath = resource.api.options?.[source];
  if (configuredPath) {
    const options = await request<OptionItem[]>(`${configuredPath}${queryString}`);
    return normalizeRemoteOptionItems(options);
  }
  if (source.startsWith("dict:")) {
    const { fetchDictOptionsCached } = await import("./dict-options");
    const dictCode = source.slice("dict:".length);
    return fetchDictOptionsCached(dictCode);
  }
  const basePath = resolveDefaultRemoteOptionPath(source);
  const options = await request<OptionItem[]>(`${basePath}${queryString}`);
  return normalizeRemoteOptionItems(options);
}

export async function fetchRemoteOptionsWithSelectedValue(
  resource: ResourceMeta,
  source: string,
  query: RemoteOptionQuery | undefined,
  selectedValue: unknown,
): Promise<OptionItem[]> {
  const baseOptions = await fetchRemoteOptions(resource, source, query);
  const selectedId = normalizeSnowflakeId(selectedValue);
  if (!selectedId || baseOptions.some((option) => String(option.value) === selectedId)) {
    return baseOptions;
  }
  const resolved = await fetchRemoteOptions(resource, source, { ...query, keyword: selectedId });
  const merged = [...baseOptions];
  for (const option of resolved) {
    if (!merged.some((item) => String(item.value) === String(option.value))) {
      merged.push(option);
    }
  }
  return merged;
}

export async function fetchEngineTreeOptions(
  resource: ResourceMeta,
  source: string,
  query?: string | RemoteOptionQuery,
): Promise<TreeOptionNode[]> {
  const queryString = buildRemoteOptionQueryString(query);
  const configuredPath = resource.api.options?.[source];
  const treePath = configuredPath ? `${configuredPath}/tree` : `/api/v1/engine/options/${source}/tree`;
  const tree = await request<ApiTreeOptionNode[]>(`${treePath}${queryString}`);
  return mapApiTreeNodes(tree);
}

function buildRemoteSchemaPathParams(pathTemplate: string, values: Record<string, unknown>): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  const placeholderMatches = pathTemplate.matchAll(/\{([^}]+)\}/g);

  for (const match of placeholderMatches) {
    const key = match[1];
    const value = getValueAtPath(values, key);
    if (typeof value === "string" || typeof value === "number") {
      params[key] = value;
    }
  }

  return params;
}

type RemoteSchemaCacheEntry = {
  promise: Promise<FormSchema>;
  expiresAt: number;
};

const remoteSchemaCache = new Map<string, RemoteSchemaCacheEntry>();

export function buildRemoteSchemaRequestKey(
  remoteSchema: RemoteSchemaMeta,
  values: Record<string, unknown>,
): string {
  const pathParams = {
    ...buildParamsFromValues(values),
    ...buildRemoteSchemaPathParams(remoteSchema.api, values),
  };
  return applyPathParams(remoteSchema.api, pathParams);
}

export async function fetchRemoteSchema(
  remoteSchema: RemoteSchemaMeta,
  values: Record<string, unknown>,
): Promise<FormSchema> {
  const path = buildRemoteSchemaRequestKey(remoteSchema, values);
  const cached = remoteSchemaCache.get(path);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    remoteSchemaCache.delete(path);
    remoteSchemaCache.set(path, cached);
    return cached.promise;
  }
  if (cached) {
    remoteSchemaCache.delete(path);
  }
  const pending = request<FormSchema>(path).catch((error) => {
    remoteSchemaCache.delete(path);
    throw error;
  });
  remoteSchemaCache.set(path, {
    promise: pending,
    expiresAt: now + REMOTE_SCHEMA_CACHE_TTL_MS,
  });
  while (remoteSchemaCache.size > REMOTE_SCHEMA_CACHE_MAX_ENTRIES) {
    const oldestKey = remoteSchemaCache.keys().next().value;
    if (!oldestKey) {
      break;
    }
    remoteSchemaCache.delete(oldestKey);
  }
  return pending;
}

export function clearRemoteSchemaCache(): void {
  remoteSchemaCache.clear();
}

type MenuTreeNode = {
  id: number;
  menuName: string;
  menuCode: string;
  path: string | null;
  children?: MenuTreeNode[];
};

export async function fetchRemoteTreeOptions(
  resource: ResourceMeta,
  remote: RemoteOptionMeta,
  keyword?: string,
): Promise<TreeOptionNode[]> {
  const path = resolveRemoteTreeApi(remote);
  const tree = await request<MenuTreeNode[]>(path);
  const mapped = mapMenuTreeNodes(tree);
  return keyword ? filterTreeOptions(mapped, keyword) : mapped;
}

/** remoteTreeSelect：未显式配置 treeApi 时走 engine options；menus 等显式 admin treeApi 保持原行为。 */
export async function fetchRemoteTreeSelectOptions(
  resource: ResourceMeta,
  remote: RemoteOptionMeta,
  keyword?: string,
): Promise<TreeOptionNode[]> {
  if (!remote.treeApi) {
    return fetchEngineTreeOptions(resource, remote.source, keyword);
  }
  if (remote.treeApi.includes("/engine/options/")) {
    return fetchEngineTreeOptions(resource, remote.source, keyword);
  }
  return fetchRemoteTreeOptions(resource, remote, keyword);
}

export async function fetchRemoteTreeSelectOptionsWithSelectedValue(
  resource: ResourceMeta,
  remote: RemoteOptionMeta,
  keyword: string | undefined,
  selectedValue: unknown,
): Promise<TreeOptionNode[]> {
  const tree = await fetchRemoteTreeSelectOptions(resource, remote, keyword);
  const selectedId = normalizeSnowflakeId(selectedValue);
  if (!selectedId) {
    return tree;
  }
  const leafValues = new Set(flattenLeafTreeOptions(tree).map((item) => String(item.value)));
  if (leafValues.has(selectedId)) {
    return tree;
  }
  const resolved = await fetchRemoteOptions(resource, remote.source, selectedId);
  const matched = resolved.find((option) => String(option.value) === selectedId);
  if (!matched) {
    return tree;
  }
  return [
    ...tree,
    {
      label: matched.label,
      value: selectedId,
    },
  ];
}
