import { resolveImportRole, visitFormFields } from "@/low-code/schema/import-field-meta";
import type { FormFieldSchema, FormSchema } from "@/low-code/schema/types";

/** 模板作答字段：按 schema 顺序收集 importRole=input 的字段（含嵌套） */
export function collectTemplateInputFields(schema: FormSchema): FormFieldSchema[] {
  const fields: FormFieldSchema[] = [];
  visitFormFields(schema, (field) => {
    if (resolveImportRole(field) === "input") {
      fields.push(field);
    }
  });
  return fields;
}
