import { resolveImportRole, visitFormFields } from "@/low-code/schema/import-field-meta";
import type { FormFieldSchema, FormSchema } from "@/low-code/schema/types";

function isDisplaySurfaceField(field: FormFieldSchema): boolean {
  if (resolveImportRole(field) === "display") {
    return true;
  }
  if (field.component === "showItem") {
    return field.showItem?.contentSource !== "payload";
  }
  if (field.component === "showImage" || field.component === "showFile" || field.component === "showVideo") {
    const source =
      field.component === "showImage"
        ? field.showImage?.contentSource
        : field.component === "showVideo"
          ? field.showVideo?.contentSource
          : field.showFile?.contentSource;
    return source != null && source !== "payload";
  }
  return false;
}

function filterFieldsByRole(fields: FormFieldSchema[], role: "display" | "input"): FormFieldSchema[] {
  if (role === "display") {
    return fields.filter((field) => isDisplaySurfaceField(field));
  }
  return fields.filter((field) => resolveImportRole(field) === role);
}

function collectFieldsByRole(schema: FormSchema, role: "display" | "input" | "runtime"): FormFieldSchema[] {
  const fields: FormFieldSchema[] = [];
  visitFormFields(schema, (field) => {
    if (role === "display" && isDisplaySurfaceField(field)) {
      fields.push(field);
      return;
    }
    if (role !== "display" && resolveImportRole(field) === role) {
      fields.push(field);
    }
  });
  return fields;
}

function cloneSchemaWithFields(schema: FormSchema, pickRole: "display" | "input"): FormSchema {
  const sections = schema.sections
    .map((section) => ({
      ...section,
      fields: filterFieldsByRole(section.fields, pickRole),
    }))
    .filter((section) => section.fields.length > 0);

  return {
    ...schema,
    title: pickRole === "display" ? "题目内容" : "标注作答",
    sections,
    actions: pickRole === "input" ? schema.actions : [],
  };
}

export function splitLabelerFormSchema(schema: FormSchema): {
  displaySchema: FormSchema;
  annotateSchema: FormSchema;
} {
  const runtimeFields = collectFieldsByRole(schema, "runtime").filter((field) => {
    if (field.component === "showItem" && field.showItem?.contentSource !== "payload") {
      return false;
    }
    if (field.component === "showImage" && field.showImage?.contentSource !== "payload") {
      return false;
    }
    if (field.component === "showFile" && field.showFile?.contentSource !== "payload") {
      return false;
    }
    if (field.component === "showVideo" && field.showVideo?.contentSource !== "payload") {
      return false;
    }
    return true;
  });
  const annotateSchema = cloneSchemaWithFields(schema, "input");

  if (runtimeFields.length > 0) {
    annotateSchema.sections = [
      ...annotateSchema.sections,
      {
        key: "__runtime_assist",
        title: "智能辅助",
        description: "运行时生成，不参与标注提交。",
        fields: runtimeFields,
      },
    ];
  }

  return {
    displaySchema: cloneSchemaWithFields(schema, "display"),
    annotateSchema,
  };
}

export function countSchemaFields(schema: FormSchema): number {
  let count = 0;
  for (const section of schema.sections) {
    count += section.fields.length;
  }
  return count;
}
