import type { RemoteParamBinding } from "@/low-code/schema/types";

export type ParamRow = {
  key: string;
  mode: "static" | "field";
  staticValue: string;
  fieldPath: string;
  required: boolean;
};

export function rowsFromParams(params?: Record<string, RemoteParamBinding>): ParamRow[] {
  if (!params) {
    return [];
  }
  return Object.entries(params).map(([key, binding]) => {
    if (typeof binding === "string") {
      return { key, mode: "static" as const, staticValue: binding, fieldPath: "", required: false };
    }
    return {
      key,
      mode: "field" as const,
      staticValue: "",
      fieldPath: binding.from,
      required: binding.required ?? true,
    };
  });
}

export function paramsFromRows(rows: ParamRow[]): Record<string, RemoteParamBinding> | undefined {
  const params: Record<string, RemoteParamBinding> = {};
  for (const row of rows) {
    const name = row.key.trim();
    if (!name) {
      continue;
    }
    if (row.mode === "static") {
      if (row.staticValue.trim()) {
        params[name] = row.staticValue.trim();
      }
      continue;
    }
    if (row.fieldPath.trim()) {
      params[name] = row.required
        ? { from: row.fieldPath.trim() }
        : { from: row.fieldPath.trim(), required: false };
    }
  }
  return Object.keys(params).length > 0 ? params : undefined;
}

/** 用于比较 props / emit 是否一致，忽略 required 默认值差异 */
export function serializeRemoteParams(params?: Record<string, RemoteParamBinding>): string {
  if (!params) {
    return "{}";
  }
  const normalized: Record<string, RemoteParamBinding> = {};
  for (const [key, binding] of Object.entries(params).sort(([a], [b]) => a.localeCompare(b))) {
    if (typeof binding === "string") {
      normalized[key] = binding;
      continue;
    }
    normalized[key] =
      binding.required === false
        ? { from: binding.from, required: false }
        : { from: binding.from };
  }
  return JSON.stringify(normalized);
}

export function hasDraftParamRows(rows: ParamRow[]): boolean {
  return rows.some((row) => {
    if (!row.key.trim()) {
      return true;
    }
    if (row.mode === "static") {
      return !row.staticValue.trim();
    }
    return !row.fieldPath.trim();
  });
}
