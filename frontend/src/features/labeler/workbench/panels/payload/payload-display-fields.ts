import { getFieldBinding, resolveImportRole, visitFormFields } from "@/low-code/schema/import-field-meta";
import { resolveShowItemContentSource } from "@/low-code/components/fields/show-item-utils";
import type { FormFieldSchema, FormSchema } from "@/low-code/schema/types";

function isTemplateDisplayField(field: FormFieldSchema): boolean {
  if (resolveImportRole(field) === "display") {
    return true;
  }
  return field.component === "showItem" && resolveShowItemContentSource(field) !== "payload";
}

/** 模板展示字段：按 schema 顺序收集题面展示字段（含静态/模板 showItem） */
export function collectTemplateDisplayFields(schema: FormSchema): FormFieldSchema[] {
  const fields: FormFieldSchema[] = [];
  visitFormFields(schema, (field) => {
    if (isTemplateDisplayField(field)) {
      fields.push(field);
    }
  });
  return fields;
}

/** 展示列文案：优先 template.label */
export function resolveTemplateFieldLabel(field: FormFieldSchema): string {
  const binding = getFieldBinding(field);
  const label = field.label?.trim();
  if (label) {
    return label;
  }
  return binding ?? field.key;
}

/** payload 绑定键（如 lang），用于表格「键」列 */
export function resolveTemplateFieldBinding(field: FormFieldSchema): string {
  return getFieldBinding(field) ?? field.key;
}
