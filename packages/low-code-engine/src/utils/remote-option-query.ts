import type { RemoteOptionMeta, RemoteParamBinding, RemoteOptionQuery } from "../schema/types";
import { getValueAtPath } from "./object-path";
import { filterRemoteParamsForSource, isBlankRemoteParamValue } from "./remote-source-params";

export interface RemoteOptionBuildContext {
  values: Record<string, unknown>;
  searchText?: string;
}

type LegacyRemoteOptionMeta = RemoteOptionMeta & {
  dependsOn?: string;
  role?: string;
  roleFrom?: string;
};

interface NormalizedParamBinding {
  from?: string;
  staticValue?: string;
  required: boolean;
}

export function normalizeRemoteParamBinding(binding: RemoteParamBinding): NormalizedParamBinding {
  if (typeof binding === "string") {
    return { staticValue: binding, required: false };
  }
  return {
    from: binding.from,
    required: binding.required ?? true,
  };
}

function resolveParamBinding(binding: RemoteParamBinding, values: Record<string, unknown>): string | undefined {
  const normalized = normalizeRemoteParamBinding(binding);
  if (normalized.staticValue != null) {
    return normalized.staticValue;
  }
  if (!normalized.from) {
    return undefined;
  }
  const raw = getValueAtPath(values, normalized.from);
  if (isBlankRemoteParamValue(raw)) {
    return undefined;
  }
  return String(raw).trim() || undefined;
}

/** 将历史 remote 配置（dependsOn/role/roleFrom）归一化为 params */
export function resolveRemoteOptionParams(
  remote: RemoteOptionMeta | undefined,
): Record<string, RemoteParamBinding> | undefined {
  if (!remote) {
    return undefined;
  }
  if (remote.params) {
    return filterRemoteParamsForSource(remote.source, remote.params);
  }
  const legacy = remote as LegacyRemoteOptionMeta;
  const params: Record<string, RemoteParamBinding> = {};
  if (legacy.role) {
    params.role = legacy.role;
  }
  if (legacy.roleFrom) {
    params.role = { from: legacy.roleFrom };
  }
  if (legacy.dependsOn && legacy.dependsOn !== legacy.roleFrom) {
    const paramName =
      remote.source === "assignableTaskItems" || remote.source === "exportFields"
        ? "taskId"
        : remote.source === "dataScopeScopeTypes" || remote.source === "scopeTypes"
          ? "resourceType"
          : "keyword";
    params[paramName] = { from: legacy.dependsOn };
  }
  return filterRemoteParamsForSource(remote.source, Object.keys(params).length > 0 ? params : undefined);
}

/** 远程选项依赖的表单字段 path（用于监听变化、校验是否可请求） */
export function collectRemoteParamSourcePaths(remote: RemoteOptionMeta | undefined): string[] {
  const params = resolveRemoteOptionParams(remote);
  if (!params) {
    return [];
  }
  const paths = new Set<string>();
  for (const binding of Object.values(params)) {
    const normalized = normalizeRemoteParamBinding(binding);
    if (normalized.from) {
      paths.add(normalized.from);
    }
  }
  return [...paths];
}

export function isRemoteOptionQueryReady(
  remote: RemoteOptionMeta | undefined,
  values: Record<string, unknown>,
): boolean {
  const params = resolveRemoteOptionParams(remote);
  if (!params) {
    return true;
  }
  for (const binding of Object.values(params)) {
    const normalized = normalizeRemoteParamBinding(binding);
    if (normalized.required && normalized.from && !resolveParamBinding(binding, values)) {
      return false;
    }
  }
  return true;
}

export function buildRemoteOptionQuery(
  remote: RemoteOptionMeta | undefined,
  context: RemoteOptionBuildContext,
): RemoteOptionQuery {
  if (!remote) {
    return {};
  }

  const query: RemoteOptionQuery = {};
  const params = resolveRemoteOptionParams(remote);
  if (params) {
    for (const [param, binding] of Object.entries(params)) {
      const value = resolveParamBinding(binding, context.values);
      if (value) {
        query[param] = value;
      }
    }
  }

  const searchText = context.searchText?.trim();
  if (searchText) {
    const searchParam = remote.searchParam ?? "keyword";
    if (!query[searchParam]) {
      query[searchParam] = searchText;
    }
  }

  return query;
}

/** 模板设计器保存前清理 legacy 字段 */
export function normalizeRemoteOptionMeta(remote: RemoteOptionMeta | undefined): RemoteOptionMeta | undefined {
  if (!remote) {
    return undefined;
  }
  const params = resolveRemoteOptionParams(remote);
  const next: RemoteOptionMeta = {
    source: remote.source,
    labelKey: remote.labelKey,
    valueKey: remote.valueKey,
    searchParam: remote.searchParam,
    variant: remote.variant,
    treeApi: remote.treeApi,
    params,
  };
  return next;
}
