import { getFieldBinding, visitFormFields } from "@/low-code/schema/import-field-meta";
import type { FormSchema } from "@/low-code/schema/types";
import { setValueAtPath } from "@/low-code/utils/object-path";

function mapPayloadToFormValues(schema: FormSchema, payload: Record<string, unknown>): Record<string, unknown> {
  let values: Record<string, unknown> = { ...payload };
  visitFormFields(schema, (field) => {
    const binding = getFieldBinding(field);
    if (binding && binding in payload) {
      values = setValueAtPath(values, binding, payload[binding]);
    }
  });
  return values;
}

/** 将 taskItem payload 合并进预览表单值（保留标注字段默认值） */
export function buildPreviewValuesWithPayload(
  formSchema: FormSchema,
  baseValues: Record<string, unknown>,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const mapped = mapPayloadToFormValues(formSchema, payload);
  return { ...baseValues, ...mapped };
}
