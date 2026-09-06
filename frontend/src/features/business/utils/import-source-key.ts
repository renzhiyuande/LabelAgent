/** 与后端 TaskItemImportDedupeSupport.CONTENT_HASH_SOURCE_KEY 一致 */
export const CONTENT_HASH_SOURCE_KEY = "__content_hash__";

const DEFAULT_SOURCE_KEY_CANDIDATES = [
  "id",
  "Id",
  "ID",
  "sourceItemKey",
  "source_item_key",
  "sample_id",
  "sampleId",
  "sample_ID",
  "doc_id",
  "docId",
  "item_id",
  "itemId",
  "uuid",
  "UUID",
] as const;

function stringifyKeyValue(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return String(value).trim();
}

function hasColumn(items: Array<Record<string, unknown>>, key: string): boolean {
  return items.some((item) => Object.prototype.hasOwnProperty.call(item, key));
}

function hasNonEmptyValue(items: Array<Record<string, unknown>>, key: string): boolean {
  return items.some((item) => stringifyKeyValue(item[key]).length > 0);
}

/** 按优先级识别默认业务 ID 列 */
export function detectDefaultSourceKeyField(items: Array<Record<string, unknown>>): string | null {
  if (items.length === 0) {
    return null;
  }
  for (const candidate of DEFAULT_SOURCE_KEY_CANDIDATES) {
    if (hasColumn(items, candidate) && hasNonEmptyValue(items, candidate)) {
      return candidate;
    }
  }
  return null;
}

export function requiresExplicitSourceKeySelection(items: Array<Record<string, unknown>>): boolean {
  return detectDefaultSourceKeyField(items) == null;
}

export function isContentHashSourceKey(field: string | null | undefined): boolean {
  return field === CONTENT_HASH_SOURCE_KEY;
}

export function describeSourceKeyField(field: string): string {
  if (isContentHashSourceKey(field)) {
    return "按行内容 SHA256（稳定 JSON 序列化）";
  }
  return field;
}
