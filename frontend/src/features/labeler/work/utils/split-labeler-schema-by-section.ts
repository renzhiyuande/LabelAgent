import { resolveImportRole, visitFormFields } from "@/low-code/schema/import-field-meta";
import type { FormFieldSchema, FormSchema } from "@/low-code/schema/types";

function collectRuntimeAssistFields(schema: FormSchema): FormFieldSchema[] {
  const fields: FormFieldSchema[] = [];
  visitFormFields(schema, (field) => {
    if (resolveImportRole(field) !== "runtime") {
      return;
    }
    if (field.component === "showItem" && field.showItem?.contentSource !== "payload") {
      return;
    }
    if (field.component === "showImage" && field.showImage?.contentSource !== "payload") {
      return;
    }
    if (field.component === "showFile" && field.showFile?.contentSource !== "payload") {
      return;
    }
    if (field.component === "showVideo" && field.showVideo?.contentSource !== "payload") {
      return;
    }
    fields.push(field);
  });
  return fields;
}

export function splitLabelerFormSchemaBySection(
  schema: FormSchema,
  sectionSlots: Record<string, "payload" | "annotate">,
): {
  displaySchema: FormSchema;
  annotateSchema: FormSchema;
} {
  const payloadSections = schema.sections.filter((section) => sectionSlots[section.key] === "payload");
  const annotateSections = schema.sections.filter((section) => sectionSlots[section.key] === "annotate");

  const annotateSchema: FormSchema = {
    ...schema,
    title: "标注作答",
    sections: [...annotateSections],
    actions: schema.actions,
  };

  const runtimeFields = collectRuntimeAssistFields(schema);
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
    displaySchema: {
      ...schema,
      title: "题目内容",
      sections: payloadSections,
      actions: [],
    },
    annotateSchema,
  };
}
