import type { PromptFormSchema, ResourceMeta } from "../schema/types";

export function buildPromptInitialValues(schema: PromptFormSchema): Record<string, unknown> {
  const values = { ...(schema.initialValues ?? {}) };
  for (const field of schema.fields) {
    if (!(field.key in values) && field.defaultValue !== undefined) {
      values[field.key] = field.defaultValue;
    }
  }
  return values;
}

export function buildSyntheticPromptResource(schema: PromptFormSchema): ResourceMeta {
  return {
    resource: "__prompt__",
    idKey: "id",
    api: { query: "" },
    table: { columns: [] },
    filters: { fields: [] },
    form: {
      sections: [{ key: "main", fields: schema.fields }],
      actions: [{ key: "submit", label: schema.confirmLabel ?? "确认", kind: "submit" }],
    },
  };
}
