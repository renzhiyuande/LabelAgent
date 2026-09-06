import type { FormFieldSchema, FormSchema, ResourceMeta } from "../../schema/types";
import { setValueAtPath } from "../object-path";
import { mergeFormValues, normalizeArrayDefaultValue } from "../form-values";
import { generateFieldKey, generateSectionKey } from "./id-generator";

export function createEmptyFormSchema(): FormSchema {
  const sectionKey = generateSectionKey();
  return {
    sections: [
      {
        key: sectionKey,
        title: "基本信息",
        fields: [],
      },
    ],
    actions: [{ key: "submit", label: "提交", kind: "submit" }],
  };
}

export function collectFieldKeys(formSchema: FormSchema): string[] {
  const keys: string[] = [];
  const visit = (fields: FormFieldSchema[]) => {
    fields.forEach((field) => {
      keys.push(field.key);
      if (field.fields?.length) {
        visit(field.fields);
      }
    });
  };

  formSchema.sections.forEach((section) => {
    visit(section.fields);
  });

  return keys;
}

export function generateUniqueFieldKey(formSchema: FormSchema): string {
  const existing = new Set(collectFieldKeys(formSchema));
  let index = 1;
  let key = `field_${index}`;
  while (existing.has(key)) {
    index += 1;
    key = `field_${index}`;
  }
  return key;
}

export function generateUniqueSectionKey(formSchema: FormSchema): string {
  const existing = new Set(formSchema.sections.map((s) => s.key));
  let index = 1;
  let key = `section_${index}`;
  while (existing.has(key)) {
    index += 1;
    key = `section_${index}`;
  }
  return key;
}

export function buildResourceMeta(
  formSchema: FormSchema,
  templateName: string,
  resourceKey = "preview",
): ResourceMeta {
  return {
    resource: resourceKey,
    label: templateName,
    idKey: "id",
    api: { query: "", detail: "", create: "", update: "" },
    table: { columns: [] },
    filters: { fields: [] },
    form: formSchema,
    actions: [],
  };
}

function defaultValueForField(field: FormFieldSchema): unknown {
  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }
  if (field.component === "imageUpload") {
    return field.upload?.multiple ? [] : null;
  }
  if (field.component === "fileUpload") {
    return null;
  }
  if (field.component === "multiSelect" || field.component === "treeMultiSelect" || field.component === "tags" || field.component === "array") {
    return [];
  }
  if (field.component === "switch") {
    return false;
  }
  return "";
}

function applyFieldDefaults(target: Record<string, unknown>, field: FormFieldSchema): Record<string, unknown> {
  const path = field.path ?? field.key;
  if (field.component === "array") {
    const arrayValue =
      field.defaultValue !== undefined
        ? normalizeArrayDefaultValue(field, field.defaultValue)
        : [];
    return setValueAtPath(target, path, arrayValue);
  }
  return setValueAtPath(target, path, defaultValueForField(field));
}

export function buildFormDefaultValues(formSchema: FormSchema): Record<string, unknown> {
  return formSchema.sections.reduce<Record<string, unknown>>((accumulator, section) => {
    let next = accumulator;
    section.fields.forEach((field) => {
      next = applyFieldDefaults(next, field);
    });
    return next;
  }, {});
}

const FORM_SCHEMA_FORMAT = "form_schema_v1";

export function exportFormSchemaJson(formSchema: FormSchema): string {
  const payload = {
    schemaFormat: FORM_SCHEMA_FORMAT,
    ...formSchema,
  };
  return JSON.stringify(payload, null, 2);
}

export function countFormFields(formSchema: FormSchema): number {
  let count = 0;
  const visit = (fields: FormFieldSchema[]) => {
    fields.forEach((field) => {
      count += 1;
      if (field.fields?.length) {
        visit(field.fields);
      }
    });
  };
  formSchema.sections.forEach((section) => {
    visit(section.fields);
  });
  return count;
}

export function parseFormSchemaJson(schemaJson: string | undefined): FormSchema {
  if (!schemaJson?.trim()) {
    return createEmptyFormSchema();
  }
  try {
    const parsed = JSON.parse(schemaJson) as FormSchema & { schemaFormat?: string };
    if (parsed.schemaFormat && parsed.schemaFormat !== FORM_SCHEMA_FORMAT) {
      console.warn(`Unexpected schemaFormat: ${parsed.schemaFormat}`);
    }
    const { schemaFormat: _ignored, ...formSchema } = parsed;
    if (!formSchema.sections?.length) {
      return createEmptyFormSchema();
    }
    return formSchema as FormSchema;
  } catch {
    return createEmptyFormSchema();
  }
}
