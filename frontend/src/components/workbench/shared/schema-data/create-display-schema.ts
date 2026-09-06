import type { FormFieldSchema, FormSchema } from "@/low-code/schema/types";

export interface DisplaySchemaFieldInput {
  key: string;
  label: string;
  component?: FormFieldSchema["component"];
  path?: string;
}

/** 从 key→label 映射快速构造只读展示 schema */
export function createDisplayFormSchema(
  sectionKey: string,
  sectionTitle: string,
  fields: DisplaySchemaFieldInput[],
): FormSchema {
  return {
    title: sectionTitle,
    sections: [
      {
        key: sectionKey,
        title: sectionTitle,
        fields: fields.map((field) => ({
          key: field.key,
          label: field.label,
          component: field.component ?? "text",
          path: field.path ?? field.key,
        })),
      },
    ],
    actions: [],
  };
}
