import type { FormFieldSchema, FormSectionSchema } from "../schema/types";
import { getValueAtPath, setValueAtPath } from "./object-path";

/** 将顶层 flat path（如 field_1.0.field_6）展开为嵌套对象 */
export function expandFlatFormPaths(values: Record<string, unknown>): Record<string, unknown> {
  let nested: Record<string, unknown> = {};
  let hasFlatPath = false;

  for (const [key, value] of Object.entries(values)) {
    if (key.includes(".")) {
      hasFlatPath = true;
      nested = setValueAtPath(nested, key, value);
      continue;
    }
    const existing = nested[key];
    if (existing === undefined) {
      nested[key] = value;
      continue;
    }
    if (
      hasFlatPath &&
      typeof existing === "object" &&
      existing !== null &&
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(existing) &&
      !Array.isArray(value)
    ) {
      nested[key] = { ...(existing as Record<string, unknown>), ...(value as Record<string, unknown>) };
      continue;
    }
    nested[key] = value;
  }

  return nested;
}

function defaultValueForArrayItem(field: FormFieldSchema): Record<string, unknown> {
  return (field.fields ?? []).reduce<Record<string, unknown>>((accumulator, childField) => {
    const childPath = childField.path ?? childField.key;
    const childDefault =
      childField.defaultValue !== undefined
        ? childField.defaultValue
        : childField.component === "switch"
          ? false
          : "";
    return setValueAtPath(accumulator, childPath, childDefault);
  }, {});
}

export function defaultValueForField(field: FormFieldSchema): unknown {
  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }
  if (field.component === "remoteSelect" && field.key.endsWith("Ids")) {
    return [];
  }
  if (field.component === "imageUpload") {
    return field.upload?.multiple ? [] : null;
  }
  if (field.component === "fileUpload") {
    return null;
  }
  if (field.component === "multiSelect" || field.component === "treeMultiSelect" || field.component === "tags" || field.component === "array") {
    return [];
  }
  if (field.component === "dynamicTable" && field.dynamicTable?.selectionPath) {
    return [];
  }
  if (field.component === "remoteSchema") {
    return {};
  }
  if (field.component === "switch") {
    return false;
  }
  return "";
}

export function applyFieldDefault(target: Record<string, unknown>, field: FormFieldSchema): Record<string, unknown> {
  const path = field.path ?? field.key;
  if (field.component === "array") {
    const arrayValue =
      field.defaultValue !== undefined
        ? normalizeArrayDefaultValue(field, field.defaultValue)
        : [];
    return setValueAtPath(target, path, arrayValue);
  }
  return setValueAtPath(target, path, defaultValueForField(field));
}

export function collectFormDefaults(fields: FormFieldSchema[]): Record<string, unknown> {
  return fields.reduce<Record<string, unknown>>((accumulator, field) => applyFieldDefault(accumulator, field), {});
}

export function collectSectionDefaults(sections: FormSectionSchema[]): Record<string, unknown> {
  return sections.reduce<Record<string, unknown>>(
    (accumulator, section) => ({ ...accumulator, ...collectFormDefaults(section.fields) }),
    {},
  );
}

/** 将 array 字段 defaultValue（数组 / flat object / JSON 字符串）归一化为对象数组 */
export function normalizeArrayDefaultValue(field: FormFieldSchema, raw: unknown): unknown[] {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      return [];
    }
    try {
      return normalizeArrayDefaultValue(field, JSON.parse(trimmed) as unknown);
    } catch {
      return [];
    }
  }

  if (Array.isArray(raw)) {
    return raw.map((item) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        return { ...defaultValueForArrayItem(field), ...(item as Record<string, unknown>) };
      }
      return defaultValueForArrayItem(field);
    });
  }

  if (raw && typeof raw === "object") {
    const fromFlatObject = parseFlatObjectAsArrayItems(field, raw as Record<string, unknown>);
    if (fromFlatObject.length > 0) {
      return fromFlatObject;
    }
    const arrayKey = field.path ?? field.key;
    const nested = getValueAtPath({ [arrayKey]: raw }, arrayKey);
    if (Array.isArray(nested)) {
      return normalizeArrayDefaultValue(field, nested);
    }
  }

  return [];
}

function parseFlatObjectAsArrayItems(field: FormFieldSchema, obj: Record<string, unknown>): unknown[] {
  const arrayKey = field.path ?? field.key;
  const prefix = `${arrayKey}.`;
  const items: Record<string, unknown>[] = [];

  for (const [key, value] of Object.entries(obj)) {
    let relativePath = key;
    if (key.startsWith(prefix)) {
      relativePath = key.slice(prefix.length);
    }
    const match = /^(\d+)\.(.+)$/.exec(relativePath);
    if (!match) {
      continue;
    }
    const index = Number(match[1]);
    const childPath = match[2];
    const current = items[index] ?? defaultValueForArrayItem(field);
    items[index] = setValueAtPath(current, childPath, value) as Record<string, unknown>;
  }

  return items.filter((item) => item != null);
}

export function mergeFormValues(
  defaults: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  return { ...defaults, ...expandFlatFormPaths(incoming) };
}
