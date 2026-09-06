import { resolveImportRole } from "@/low-code/schema/import-field-meta";
import type { FormFieldSchema, FormSchema } from "@/low-code/schema/types";

/** 审核工作台不展示运行时辅助字段（如 llmSuggest、AI 预判参考、dictTagPreview） */
export function isReviewerVisibleField(field: FormFieldSchema): boolean {
  return resolveImportRole(field) !== "runtime";
}

/** 模板内嵌的题目只读展示控件（showItem/showImage/showFile/showVideo 读取 payload） */
export function isPayloadContextDisplayField(field: FormFieldSchema): boolean {
  if (field.component === "showItem") {
    return (field.showItem?.contentSource ?? "payload") === "payload";
  }
  if (field.component === "showImage") {
    return (field.showImage?.contentSource ?? "payload") === "payload";
  }
  if (field.component === "showFile") {
    return (field.showFile?.contentSource ?? "payload") === "payload";
  }
  if (field.component === "showVideo") {
    return (field.showVideo?.contentSource ?? "payload") === "payload";
  }
  return false;
}

/** 标注结果区：仅展示标注填写项，不含题目上下文只读控件 */
export function isAnnotateOnlyVisibleField(field: FormFieldSchema): boolean {
  return isReviewerVisibleField(field) && !isPayloadContextDisplayField(field);
}

function filterFieldsRecursive(
  fields: FormFieldSchema[],
  predicate: (field: FormFieldSchema) => boolean,
): FormFieldSchema[] {
  return fields
    .filter(predicate)
    .map((field) =>
      field.fields?.length ? { ...field, fields: filterFieldsRecursive(field.fields, predicate) } : field,
    );
}

/** 从模板 schema 中剔除仅标注端使用的运行时字段，供人工审核池 / AI 审核队列只读展示 */
export function filterFormSchemaForReviewerDisplay(schema: FormSchema): FormSchema {
  const sections = schema.sections
    .map((section) => ({
      ...section,
      fields: filterFieldsRecursive(section.fields, isReviewerVisibleField),
    }))
    .filter((section) => section.fields.length > 0);

  return {
    ...schema,
    sections,
  };
}

/** 标注结果 schema：再剔除题目上下文只读展示字段 */
export function filterFormSchemaForAnnotateDisplay(schema: FormSchema): FormSchema {
  const sections = schema.sections
    .map((section) => ({
      ...section,
      fields: filterFieldsRecursive(section.fields, isAnnotateOnlyVisibleField),
    }))
    .filter((section) => section.fields.length > 0);

  return {
    ...schema,
    sections,
  };
}
