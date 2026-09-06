import type { DetailFieldSchema, DetailTemplateFormMeta, FormFieldSchema, FormSchema } from "../schema/types";
import { getValueAtPath } from "./object-path";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function resolveDetailTemplateFormMeta(
  field: Pick<DetailFieldSchema, "templateForm">,
): Required<Pick<DetailTemplateFormMeta, "schemaField" | "dataField" | "role">> {
  return {
    schemaField: field.templateForm?.schemaField ?? "templateSchemaJson",
    dataField: field.templateForm?.dataField ?? "submitData",
    role: field.templateForm?.role ?? "input",
  };
}

export function resolveDetailTemplateFormValues(
  record: Record<string, unknown>,
  meta: ReturnType<typeof resolveDetailTemplateFormMeta>,
): Record<string, unknown> {
  if (meta.role === "display") {
    return {
      ...asRecord(getValueAtPath(record, "itemPayload")),
      ...asRecord(getValueAtPath(record, "payloadPreview")),
      ...asRecord(getValueAtPath(record, meta.dataField)),
    };
  }
  return asRecord(getValueAtPath(record, meta.dataField));
}

export function cloneReadonlyFormSchema(schema: FormSchema): FormSchema {
  const sections = schema.sections.map((section) => ({
    ...section,
    fields: section.fields.map((field) => cloneReadonlyField(field)),
  }));
  return { ...schema, sections, actions: [] };
}

function cloneReadonlyField(field: FormFieldSchema): FormFieldSchema {
  const next: FormFieldSchema = { ...field, readonly: true };
  if (field.fields?.length) {
    next.fields = field.fields.map((child) => cloneReadonlyField(child));
  }
  if (field.component === "array" && field.fields?.length) {
    next.fields = field.fields.map((child) => cloneReadonlyField(child));
  }
  if (field.component === "fileUpload") {
    return {
      ...next,
      component: "showFile",
      showFile: field.showFile ?? { contentSource: "payload", showSize: true },
    };
  }
  if (field.component === "imageUpload") {
    const multiple = field.upload?.multiple === true;
    return {
      ...next,
      component: "showImage",
      showImage: field.showImage ?? {
        contentSource: "payload",
        multiple,
        showFileName: field.upload?.showFileName !== false,
      },
    };
  }
  return next;
}
