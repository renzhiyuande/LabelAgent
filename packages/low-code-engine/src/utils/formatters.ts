import { formatUploadedFileLabel, isUploadedFileRef, normalizeUploadedFiles } from "../components/fields/upload-types";
import { formatBytes } from "../components/fields/upload-types";
import type { DetailArrayColumnSchema, DetailFieldSchema, TableColumnSchema } from "../schema/types";

type FieldValueFormatInput = Pick<
  TableColumnSchema | DetailFieldSchema | DetailArrayColumnSchema,
  "type" | "formatter"
> & {
  enum?: DetailFieldSchema["enum"];
  dict?: string;
};

function formatDateTime(value: unknown): string {
  if (!value) {
    return "-";
  }
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** 详情/表格展示 JSON：若已是字符串则先 parse 再排版，避免 \" 转义套娃 */
export function formatJsonForDisplay(value: unknown): string {
  if (value == null || value === "") {
    return "-";
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "-";
    }
    try {
      return JSON.stringify(JSON.parse(trimmed) as unknown, null, 2);
    } catch {
      return value;
    }
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function formatPayloadPreview(value: unknown): string {
  if (value == null || value === "") {
    return "-";
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    return formatJsonForDisplay(value);
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) {
    return "-";
  }
  return entries
    .slice(0, 4)
    .map(([key, item]) => `${key}: ${typeof item === "object" ? formatJsonForDisplay(item) : String(item ?? "-")}`)
    .join(" · ");
}

function resolveEnumLabel(
  enumOptions: NonNullable<DetailFieldSchema["enum"]>,
  value: unknown,
): string | undefined {
  const matched =
    enumOptions.find((item) => String(item.value) === String(value ?? ""))
    ?? enumOptions.find((item) => item.label === String(value ?? ""));
  return matched?.label;
}

export function formatFieldValue(field: FieldValueFormatInput, value: unknown): string {
  if (value == null || value === "") {
    return "-";
  }
  if (field.enum?.length) {
    const label = resolveEnumLabel(field.enum, value);
    if (label) {
      return label;
    }
  }
  if (field.formatter === "json") {
    return formatJsonForDisplay(value);
  }
  if (field.formatter === "payloadPreview") {
    return formatPayloadPreview(value);
  }
  if (field.formatter === "bytes") {
    return typeof value === "number" ? formatBytes(value) : String(value);
  }
  if (field.formatter === "boolean") {
    if (value === true || value === 1 || value === "1" || value === "true") {
      return "是";
    }
    if (value === false || value === 0 || value === "0" || value === "false") {
      return "否";
    }
    return String(value);
  }
  if (field.formatter === "versionNo") {
    if (value == null || value === "" || value === 0) {
      return "-";
    }
    return `v${value}`;
  }
  switch (field.type) {
    case "datetime":
    case "date":
      return formatDateTime(value);
    case "tags":
      return Array.isArray(value) ? value.join(", ") : String(value);
    case "richText":
      return typeof value === "string" ? value.replace(/<[^>]+>/g, "").trim() || "-" : String(value);
    case "file":
    case "fileUpload":
      return isUploadedFileRef(value) ? formatUploadedFileLabel(value) : "-";
    case "image":
    case "imageUpload": {
      const files = normalizeUploadedFiles(value);
      if (files.length === 0) {
        return "-";
      }
      if (files.length === 1) {
        return formatUploadedFileLabel(files[0]);
      }
      return `${files.length} 张图片`;
    }
    case "json":
      return formatJsonForDisplay(value);
    default:
      if (typeof value === "object") {
        return formatPayloadPreview(value);
      }
      return String(value);
  }
}
