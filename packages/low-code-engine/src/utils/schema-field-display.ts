import type { FormFieldSchema, OptionItem } from "../schema/types";
import { getValueAtPath } from "./object-path";
import { findDictOption, resolveDictLabel } from "./dict-display";

export function resolveSchemaFieldDictCode(field: FormFieldSchema): string | undefined {
  return field.dict;
}

/** 字段是否可能在展示时需要字典/静态选项映射（Reviewer 只读场景） */
export function schemaFieldMayNeedOptionMapping(field: FormFieldSchema): boolean {
  if (field.options?.length) {
    return true;
  }
  return Boolean(resolveSchemaFieldDictCode(field));
}

function findStaticOptionByValue(options: OptionItem[], value: unknown): OptionItem | undefined {
  const normalized = String(value ?? "");
  return options.find((item) => String(item.value) === normalized);
}

function findStaticOptionByLabel(options: OptionItem[], value: unknown): OptionItem | undefined {
  const normalized = String(value ?? "");
  return options.find((item) => item.label === normalized);
}

function findDictOptionByLabel(options: OptionItem[] | undefined, value: unknown): OptionItem | undefined {
  if (!options?.length) {
    return undefined;
  }
  const normalized = String(value ?? "");
  return options.find((item) => item.label === normalized);
}

/**
 * Reviewer 只读展示：提交的是 label 则原样显示；提交的是 value 则用已加载选项映射为 label。
 * 静态 options 走 schema 内联，不发起远程请求。
 */
export function resolveSchemaFieldDisplayLabel(
  field: FormFieldSchema,
  value: unknown,
  dictOptions: Record<string, OptionItem[]> = {},
): string {
  if (value == null || value === "") {
    return "—";
  }

  if (field.component === "switch" && typeof value === "boolean") {
    return value ? "是" : "否";
  }

  if (field.component === "array" && Array.isArray(value)) {
    const itemFields = field.fields ?? [];
    if (itemFields.length === 0) {
      return value.length === 0 ? "—" : `${value.length} 项`;
    }
    return value
      .map((item, index) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          return `第 ${index + 1} 项`;
        }
        const record = item as Record<string, unknown>;
        const parts = itemFields
          .map((childField) => {
            const childValue = getValueAtPath(record, childField.path ?? childField.key);
            const childLabel = resolveSchemaFieldDisplayLabel(childField, childValue, dictOptions);
            if (childLabel === "—") {
              return null;
            }
            return `${childField.label}：${childLabel}`;
          })
          .filter((part): part is string => Boolean(part));
        return parts.length > 0 ? `${index + 1}. ${parts.join(" · ")}` : `第 ${index + 1} 项`;
      })
      .join("\n");
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => resolveSchemaFieldDisplayLabel(field, item, dictOptions))
      .join(", ");
  }

  if (field.options?.length) {
    const byValue = findStaticOptionByValue(field.options, value);
    if (byValue) {
      return byValue.label;
    }
    if (findStaticOptionByLabel(field.options, value)) {
      return String(value);
    }
    return String(value);
  }

  const dictCode = resolveSchemaFieldDictCode(field);
  if (dictCode) {
    const options = dictOptions[dictCode] ?? [];
    const byValue = findDictOption(options, value);
    if (byValue) {
      return resolveDictLabel(byValue, value);
    }
    if (findDictOptionByLabel(options, value)) {
      return String(value);
    }
    return String(value);
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  return String(value);
}
