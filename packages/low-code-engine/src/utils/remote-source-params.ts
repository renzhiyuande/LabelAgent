import type { RemoteParamBinding } from "../schema/types";

/** 各数据源允许的声明式 query 参数名；未列出的 searchable / dict 来源不允许带 params */
const SOURCE_PARAM_ALLOWLIST: Record<string, readonly string[]> = {
  collaborators: ["role"],
  assignableTaskItems: ["taskId"],
  exportFields: ["taskId"],
  dataScopeScopeTypes: ["resourceType"],
  scopeTypes: ["resourceType"],
};

const SEARCHABLE_SOURCES = new Set([
  "tasks",
  "users",
  "roles",
  "menus",
  "rewardRules",
  "distributeStrategies",
  "dataScopeResourceTypes",
  "resourceTypes",
  "systemClients",
  "dictTypes",
]);

export function filterRemoteParamsForSource(
  source: string | undefined,
  params: Record<string, RemoteParamBinding> | undefined,
): Record<string, RemoteParamBinding> | undefined {
  if (!source || !params) {
    return undefined;
  }
  if (source.startsWith("dict:") || SEARCHABLE_SOURCES.has(source)) {
    return undefined;
  }
  const allowlist = SOURCE_PARAM_ALLOWLIST[source];
  if (!allowlist) {
    return params;
  }
  const next: Record<string, RemoteParamBinding> = {};
  for (const key of allowlist) {
    if (params[key] != null) {
      next[key] = params[key];
    }
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

export function isBlankRemoteParamValue(raw: unknown): boolean {
  if (raw == null || raw === "") {
    return true;
  }
  if (typeof raw === "number") {
    return !Number.isFinite(raw) || raw === 0;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed === "" || trimmed === "0";
  }
  return false;
}
