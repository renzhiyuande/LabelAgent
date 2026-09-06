import type { CardBadgeBinding, CardFieldBinding, CardMetricBinding, OptionItem } from "../schema/types";
import { formatFieldValue } from "./formatters";
import { getValueAtPath } from "./object-path";
import { findDictOption } from "./dict-display";

function readBindingValue(record: Record<string, unknown>, binding: CardFieldBinding): unknown {
  const raw = binding.path ? getValueAtPath(record, binding.path) : record[binding.field];
  if (raw == null || raw === "") {
    return binding.fallback ?? null;
  }
  return raw;
}

export function resolveCardFieldText(
  record: Record<string, unknown>,
  binding: CardFieldBinding,
): string {
  const value = readBindingValue(record, binding);
  if (value == null || value === "") {
    return binding.fallback ?? "-";
  }
  return formatFieldValue(
    { type: binding.formatter === "datetime" ? "datetime" : "text", formatter: binding.formatter },
    value,
  );
}

export function resolveCardBadgeLabel(
  record: Record<string, unknown>,
  binding: CardBadgeBinding,
  dictOptions?: Record<string, OptionItem[]>,
): { label: string; tone?: "default" | "success" | "warning" | "destructive" } {
  const value = readBindingValue(record, binding);
  if (binding.dict) {
    const matched = findDictOption(dictOptions?.[binding.dict], value);
    if (matched) {
      return {
        label: matched.label,
        tone: (matched.tone as "default" | "success" | "warning" | "destructive" | undefined) ?? "default",
      };
    }
  }
  const matched = binding.enum?.find((item) => item.value === value);
  if (matched) {
    return { label: matched.label, tone: matched.tone };
  }
  if (binding.enum?.length) {
    if (value == null || value === "") {
      return { label: binding.fallback ?? "-", tone: "default" };
    }
    return { label: String(value), tone: "default" };
  }
  if (value == null || value === "") {
    return { label: binding.fallback ?? "-", tone: "default" };
  }
  return { label: String(value), tone: "default" };
}

export function resolveCardMetricText(
  record: Record<string, unknown>,
  binding: CardMetricBinding,
): string {
  const value = binding.path ? getValueAtPath(record, binding.path) : record[binding.field];
  if (value == null || value === "") {
    return "-";
  }
  return formatFieldValue(
    { type: binding.formatter === "datetime" ? "datetime" : "text", formatter: binding.formatter },
    value,
  );
}
