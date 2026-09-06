import type { EngineListQuery } from "../types";
import type { FilterSchema } from "../schema/types";

export function normalizeKeyword(filters: Record<string, unknown>, schema: FilterSchema): string | undefined {
  const keywordField = schema.fields.find((field) => field.key === "keyword");
  const rawValue = keywordField ? filters[keywordField.key] : undefined;
  if (typeof rawValue === "string" && rawValue.trim()) {
    return rawValue.trim();
  }
  return undefined;
}

function normalizeRangeValue(value: unknown): [unknown, unknown] | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }
  const [start, end] = value;
  const normalizedStart = typeof start === "string" ? start.trim() : start;
  const normalizedEnd = typeof end === "string" ? end.trim() : end;
  if (
    (normalizedStart === "" || normalizedStart == null) &&
    (normalizedEnd === "" || normalizedEnd == null)
  ) {
    return undefined;
  }
  return [
    normalizedStart === "" ? null : normalizedStart,
    normalizedEnd === "" ? null : normalizedEnd,
  ];
}

function normalizeFilterValue(
  field: FilterSchema["fields"][number],
  value: unknown,
): unknown {
  if (
    field.component === "dateRange" ||
    field.component === "dateTimeRange" ||
    field.component === "numberRange"
  ) {
    return normalizeRangeValue(value);
  }
  if (Array.isArray(value)) {
    const items = value.filter((item) => item !== "" && item != null);
    return items.length > 0 ? items : undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  return value;
}

export function toListQuery(
  page: number,
  pageSize: number,
  filters: Record<string, unknown>,
  schema: FilterSchema,
  sort: Array<{ field: string; order: "asc" | "desc" }> = [],
): EngineListQuery {
  const normalizedFilters = schema.fields
    .map((field) => {
      const normalizedValue = normalizeFilterValue(field, filters[field.key]);
      if (normalizedValue === undefined) {
        return null;
      }
      return {
        field: field.field ?? field.key,
        op: field.operator ?? (Array.isArray(normalizedValue) ? "in" : "eq"),
        value: normalizedValue,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return {
    page,
    pageSize,
    keyword: normalizeKeyword(filters, schema),
    filters: normalizedFilters,
    sort,
  };
}
