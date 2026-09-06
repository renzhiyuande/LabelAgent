import type { ResourceMeta } from "../schema/types";

export function resolveFieldDictCode(
  field: { key: string; dict?: string },
  resource?: ResourceMeta,
): string | undefined {
  if (field.dict) {
    return field.dict;
  }
  return resource?.table?.columns?.find((column) => column.key === field.key)?.dict;
}
