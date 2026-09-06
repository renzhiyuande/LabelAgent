import type { EngineListQuery } from "../types";
import type { FilterOperator, FilterSchema } from "../schema/types";

export interface ResourceListScope {
  field: string;
  value: string | number;
}

export interface PinnedListFilter {
  field: string;
  op?: FilterOperator;
  value: unknown;
}

export function applyPinnedListFilters(
  query: EngineListQuery,
  pinnedFilters?: PinnedListFilter[],
): EngineListQuery {
  if (!pinnedFilters?.length) {
    return query;
  }
  const filters = [...(query.filters ?? [])];
  for (const pinned of pinnedFilters) {
    const op = pinned.op ?? "eq";
    const index = filters.findIndex((item) => item.field === pinned.field && item.op === op);
    const entry = { field: pinned.field, op, value: pinned.value };
    if (index >= 0) {
      filters[index] = entry;
    } else {
      filters.push(entry);
    }
  }
  return { ...query, filters };
}

export function applyScopeToListQuery(query: EngineListQuery, scope: ResourceListScope): EngineListQuery {
  const scopeFilter = {
    field: scope.field,
    op: "eq" as const,
    value: String(scope.value),
  };
  const filters = [
    ...(query.filters ?? []).filter((item) => item.field !== scope.field),
    scopeFilter,
  ];
  return {
    ...query,
    filters,
  };
}

export function filterResourceFilters(schema: FilterSchema, hideFilters: string[]): FilterSchema {
  if (hideFilters.length === 0) {
    return schema;
  }
  const hidden = new Set(hideFilters);
  return {
    ...schema,
    primary: (schema.primary ?? []).filter((key) => !hidden.has(key)),
    fields: schema.fields.filter((field) => !hidden.has(field.key)),
  };
}

export function filterResourceFormFields<T extends { form: { sections: Array<{ fields: Array<{ key: string; path?: string }> }> } }>(
  resource: T,
  hiddenKeys: string[],
): T {
  if (hiddenKeys.length === 0) {
    return resource;
  }
  const hidden = new Set(hiddenKeys);
  return {
    ...resource,
    form: {
      ...resource.form,
      sections: resource.form.sections.map((section) => ({
        ...section,
        fields: section.fields.filter(
          (field) => !hidden.has(field.key) && !hidden.has(field.path ?? field.key),
        ),
      })),
    },
  };
}
