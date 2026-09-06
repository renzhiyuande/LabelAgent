import { getFieldBinding } from "@/low-code/schema/import-field-meta";
import type { FormSchema } from "@/low-code/schema/types";
import { setValueAtPath } from "@/low-code/utils/object-path";

/** 将 flat payload 按 schema 字段 binding 映射为展示用 values */
export function buildSchemaDisplayValues(
  schema: FormSchema,
  data: Record<string, unknown>,
): Record<string, unknown> {
  let values: Record<string, unknown> = { ...data };

  for (const section of schema.sections) {
    for (const field of section.fields) {
      const binding = getFieldBinding(field);
      if (!binding) {
        continue;
      }
      if (binding in data) {
        values = setValueAtPath(values, binding, data[binding]);
      }
    }
  }

  return values;
}
