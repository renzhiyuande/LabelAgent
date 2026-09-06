import type { FormDynamicTableMeta } from "../schema/types";
import { getValueAtPath } from "./object-path";

export interface DynamicTableFormContext {
  scope?: { field: string; value: string | number };
  taskId?: string | number;
}

export function resolveDynamicTableScope(
  meta: FormDynamicTableMeta,
  formContext?: DynamicTableFormContext,
  values?: Record<string, unknown>,
): { field: string; value: string | number } | null {
  const scopeMeta = meta.scope;
  if (!scopeMeta) {
    return null;
  }
  const from = scopeMeta.from ?? "context.scope";
  if (from === "context.scope" && formContext?.scope) {
    return formContext.scope;
  }
  if (from === "context.taskId" && formContext?.taskId != null) {
    return { field: scopeMeta.field, value: formContext.taskId };
  }
  if (from.startsWith("values.")) {
    const path = from.slice("values.".length);
    const value = getValueAtPath(values ?? {}, path);
    if (value != null && value !== "") {
      return { field: scopeMeta.field, value: value as string | number };
    }
  }
  const scopedValue = getValueAtPath(values ?? {}, scopeMeta.field);
  if (scopedValue != null && scopedValue !== "") {
    return { field: scopeMeta.field, value: scopedValue as string | number };
  }
  return null;
}
