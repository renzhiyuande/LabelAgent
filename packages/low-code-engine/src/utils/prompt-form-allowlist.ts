import type { FormFieldSchema, PromptFormSchema } from "../schema/types";

export const PROMPT_MAX_FIELDS = 3;

export const PROMPT_ALLOWED_COMPONENTS = new Set([
  "text",
  "number",
  "select",
  "remoteSelect",
  "radioGroup",
  "checkboxGroup",
  "switch",
  "datetime",
  "tags",
]);

function fieldHasForbiddenMeta(field: FormFieldSchema): boolean {
  return Boolean(
    field.fields?.length ||
      field.dynamicTable ||
      field.assignment ||
      field.upload ||
      field.llm ||
      field.richText ||
      field.showItem ||
      field.showImage ||
      field.showFile ||
      field.showVideo,
  );
}

export function assertPromptFormSchema(schema: PromptFormSchema): void {
  if (schema.fields.length === 0) {
    throw new Error("Prompt 表单至少需要一个字段");
  }
  if (schema.fields.length > PROMPT_MAX_FIELDS) {
    throw new Error(`Prompt 表单最多支持 ${PROMPT_MAX_FIELDS} 个字段`);
  }
  for (const field of schema.fields) {
    if (!PROMPT_ALLOWED_COMPONENTS.has(field.component)) {
      throw new Error(`Prompt 表单不支持组件「${field.component}」`);
    }
    if (fieldHasForbiddenMeta(field)) {
      throw new Error(`Prompt 表单字段「${field.key}」包含不支持的嵌套或扩展配置`);
    }
  }
}

export function isPromptFormSchemaValid(schema: PromptFormSchema): boolean {
  try {
    assertPromptFormSchema(schema);
    return true;
  } catch {
    return false;
  }
}
