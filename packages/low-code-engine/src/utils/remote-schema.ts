import type { FormFieldSchema, FormSchema, ResourceMeta } from "../schema/types";
import { getValueAtPath, setValueAtPath } from "./object-path";

export interface RemoteSchemaBindingState {
  mode?: string;
  config?: Record<string, unknown>;
}

interface ResolvedRemoteSchemaBinding {
  payloadField: string;
  modeField?: string;
  configField: string;
  discriminatorKey: string;
  stripSourceFields: boolean;
}

export function isRecordObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseJsonFieldValue(raw: unknown): unknown {
  if (typeof raw !== "string") {
    return raw;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return raw;
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return raw;
  }
}

export function splitRemoteSchemaBinding(
  value: unknown,
  discriminatorKey = "mode",
): RemoteSchemaBindingState {
  if (!isRecordObject(value)) {
    return {};
  }
  const { [discriminatorKey]: discriminator, ...config } = value;
  return {
    mode: typeof discriminator === "string" && discriminator.trim() ? discriminator : undefined,
    config,
  };
}

export function mergeRemoteSchemaBinding(
  mode: unknown,
  config: unknown,
  discriminatorKey = "mode",
): Record<string, unknown> | null {
  const normalizedMode = typeof mode === "string" ? mode.trim() : "";
  if (!normalizedMode) {
    return null;
  }
  const normalizedConfig = isRecordObject(config) ? config : {};
  const { [discriminatorKey]: _ignored, ...rest } = normalizedConfig;
  return {
    ...rest,
    [discriminatorKey]: normalizedMode,
  };
}

export function normalizeRemoteSchema(schema: Partial<FormSchema> | null | undefined): FormSchema {
  return {
    ...schema,
    sections: schema?.sections ?? [],
    actions: schema?.actions ?? [],
  };
}

function unsetValueAtPath(source: Record<string, unknown>, path: string): Record<string, unknown> {
  const segments = path.split(".").filter(Boolean);
  if (segments.length === 0) {
    return source;
  }
  const next = { ...source };
  let current: Record<string, unknown> | unknown[] = next;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    const nested: unknown = Array.isArray(current) ? current[Number(segment)] : current[segment];
    if (!nested || typeof nested !== "object") {
      return next;
    }
    const cloned: Record<string, unknown> | unknown[] = Array.isArray(nested)
      ? [...nested]
      : { ...(nested as Record<string, unknown>) };
    if (Array.isArray(current)) {
      current[Number(segment)] = cloned;
    } else {
      current[segment] = cloned;
    }
    current = cloned;
  }
  const finalSegment = segments[segments.length - 1];
  if (Array.isArray(current)) {
    current.splice(Number(finalSegment), 1);
  } else {
    delete current[finalSegment];
  }
  return next;
}

function visitFormFields(fields: FormFieldSchema[], visitor: (field: FormFieldSchema) => void) {
  for (const field of fields) {
    visitor(field);
    if (field.fields?.length) {
      visitFormFields(field.fields, visitor);
    }
  }
}

function resolveRemoteSchemaBindings(resource: ResourceMeta): ResolvedRemoteSchemaBinding[] {
  const bindings: ResolvedRemoteSchemaBinding[] = [];
  visitFormFields(
    resource.form?.sections?.flatMap((section) => section.fields) ?? [],
    (field) => {
      if (field.component !== "remoteSchema" || !field.remoteSchema?.binding) {
        return;
      }
      bindings.push({
        payloadField: field.remoteSchema.binding.payloadField,
        modeField: field.remoteSchema.binding.modeField ?? field.remoteSchema.dependsOn,
        configField: field.path ?? field.key,
        discriminatorKey: field.remoteSchema.binding.discriminatorKey ?? "mode",
        stripSourceFields: field.remoteSchema.binding.stripSourceFields !== false,
      });
    },
  );
  return bindings;
}

export function applyRemoteSchemaBindingsToRecord(
  record: Record<string, unknown>,
  resource: ResourceMeta,
): Record<string, unknown> {
  const bindings = resolveRemoteSchemaBindings(resource);
  if (!bindings?.length) {
    return record;
  }
  return bindings.reduce<Record<string, unknown>>((current, binding) => {
    const payload = parseJsonFieldValue(current[binding.payloadField]);
    if (binding.modeField) {
      const state = splitRemoteSchemaBinding(payload, binding.discriminatorKey);
      return setValueAtPath(
        setValueAtPath(current, binding.modeField, state.mode),
        binding.configField,
        state.config,
      );
    }
    return setValueAtPath(current, binding.configField, payload);
  }, record);
}

export function applyRemoteSchemaBindingsToValues(
  preparedValues: Record<string, unknown>,
  rawValues: Record<string, unknown>,
  resource: ResourceMeta,
): Record<string, unknown> {
  const bindings = resolveRemoteSchemaBindings(resource);
  if (!bindings?.length) {
    return preparedValues;
  }
  let next = { ...preparedValues };
  for (const binding of bindings) {
    const configValue = getValueAtPath(preparedValues, binding.configField) ?? getValueAtPath(rawValues, binding.configField);
    const merged = binding.modeField
      ? mergeRemoteSchemaBinding(
          getValueAtPath(preparedValues, binding.modeField) ?? getValueAtPath(rawValues, binding.modeField),
          configValue,
          binding.discriminatorKey,
        )
      : (configValue as Record<string, unknown> | null | undefined) ?? null;
    next = setValueAtPath(next, binding.payloadField, merged);
    if (binding.stripSourceFields !== false) {
      if (binding.modeField) {
        next = unsetValueAtPath(next, binding.modeField);
      }
      if (binding.configField !== binding.payloadField) {
        next = unsetValueAtPath(next, binding.configField);
      }
    }
  }
  return next;
}
