import type { ImportColumnConfig, ImportColumnRole } from "./infer-form-schema-from-import";

export interface TaskImportPayloadContract {
  schemaVersion?: number;
  requiredKeys: string[];
  optionalKeys: string[];
  forbiddenKeys?: string[];
  lockedAt?: string | null;
  source?: string | null;
}

export interface ImportColumnBindingPayload {
  key: string;
  role: ImportColumnRole;
}

export function buildContractFromColumnConfigs(
  configs: ImportColumnConfig[],
): TaskImportPayloadContract | null {
  const requiredKeys: string[] = [];
  const optionalKeys: string[] = [];
  for (const config of configs) {
    if (config.role === "display") {
      requiredKeys.push(config.key);
    } else if (config.role === "input") {
      optionalKeys.push(config.key);
    }
  }
  if (requiredKeys.length === 0 && optionalKeys.length === 0) {
    return null;
  }
  return {
    schemaVersion: 1,
    requiredKeys: [...requiredKeys].sort((a, b) => a.localeCompare(b)),
    optionalKeys: [...optionalKeys].sort((a, b) => a.localeCompare(b)),
    forbiddenKeys: [],
    lockedAt: new Date().toISOString(),
    source: "FIRST_IMPORT",
  };
}

export function buildColumnBindings(configs: ImportColumnConfig[]): ImportColumnBindingPayload[] {
  return configs.map((config) => ({ key: config.key, role: config.role }));
}

export function parseImportContract(raw: unknown): TaskImportPayloadContract | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const requiredKeys = readKeyList(record.requiredKeys);
  const optionalKeys = readKeyList(record.optionalKeys);
  if (requiredKeys.length === 0 && optionalKeys.length === 0) {
    return null;
  }
  return {
    schemaVersion: typeof record.schemaVersion === "number" ? record.schemaVersion : 1,
    requiredKeys,
    optionalKeys,
    forbiddenKeys: readKeyList(record.forbiddenKeys),
    lockedAt: typeof record.lockedAt === "string" ? record.lockedAt : null,
    source: typeof record.source === "string" ? record.source : null,
  };
}

function readKeyList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .sort((a, b) => a.localeCompare(b));
}

export function allowedImportKeys(contract: TaskImportPayloadContract): string[] {
  return [...new Set([...contract.requiredKeys, ...contract.optionalKeys])].sort((a, b) =>
    a.localeCompare(b),
  );
}
