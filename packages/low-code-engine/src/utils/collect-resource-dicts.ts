import type { FormFieldSchema, ResourceMeta } from "../schema/types";
import { resolveFieldDictCode } from "./resolve-field-dict";

function collectFormFieldDicts(fields: FormFieldSchema[] | undefined, result: Set<string>): void {
  for (const field of fields ?? []) {
    if (field.dict) {
      result.add(field.dict);
    }
    if (field.fields?.length) {
      collectFormFieldDicts(field.fields, result);
    }
  }
}

export function collectResourceDictCodes(resource: ResourceMeta): string[] {
  const dictCodes = new Set<string>();

  for (const field of resource.filters?.fields ?? []) {
    if (field.dict) {
      dictCodes.add(field.dict);
    }
  }

  for (const section of resource.form?.sections ?? []) {
    collectFormFieldDicts(section.fields, dictCodes);
  }

  for (const column of resource.table?.columns ?? []) {
    if (column.dict) {
      dictCodes.add(column.dict);
    }
  }

  for (const section of resource.detail?.sections ?? []) {
    for (const field of section.fields) {
      const dictCode = resolveFieldDictCode(field, resource);
      if (dictCode) {
        dictCodes.add(dictCode);
      }
    }
  }

  for (const badge of resource.page?.card?.badges ?? []) {
    if (badge.dict) {
      dictCodes.add(badge.dict);
    }
  }

  return Array.from(dictCodes);
}
