import type { ConditionOperator } from "@/low-code/schema/types";

export const CONDITION_OPERATORS: Array<{ value: ConditionOperator; label: string }> = [
  { value: "eq", label: "等于" },
  { value: "ne", label: "不等于" },
  { value: "in", label: "属于列表" },
  { value: "notIn", label: "不属于列表" },
  { value: "contains", label: "包含" },
];

export function isArrayOperator(operator?: ConditionOperator): boolean {
  return operator === "in" || operator === "notIn";
}

export function formatConditionValue(value: unknown, operator?: ConditionOperator): string {
  if (isArrayOperator(operator)) {
    if (Array.isArray(value)) {
      return JSON.stringify(value);
    }
    return "";
  }
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }
  return JSON.stringify(value);
}

export function parseConditionValue(raw: string, operator?: ConditionOperator): unknown {
  const trimmed = raw.trim();
  if (isArrayOperator(operator)) {
    if (!trimmed) {
      return [];
    }
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .map((item) => coerceScalar(item));
  }
  return coerceScalar(trimmed);
}

function coerceScalar(raw: string): unknown {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    return Number(raw);
  }
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'")) ||
    raw.startsWith("{") ||
    raw.startsWith("[")
  ) {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return raw;
    }
  }
  return raw;
}

export function resolveConditionFieldPath(path?: string, key?: string): string {
  return (path && path.trim()) || key || "";
}
