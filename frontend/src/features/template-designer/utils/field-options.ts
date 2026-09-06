import type { FormFieldSchema, FormSchema } from "@/low-code/schema/types";
import { resolveImportRole, visitFormFields } from "@/low-code/schema/import-field-meta";
import { resolveConditionFieldPath } from "../components/property-pane/condition-value";

export interface FieldOption {
  value: string;
  label: string;
}

export function buildFieldOptions(fields: FormFieldSchema[], currentFieldKey: string): FieldOption[] {
  return fields
    .filter((item) => item.key !== currentFieldKey && item.component !== "llmSuggest" && item.component !== "showItem")
    .map((item) => {
      const path = resolveConditionFieldPath(item.path, item.key);
      return {
        value: path,
        label: `${item.label} (${path})`,
      };
    });
}

export function buildAllFieldOptions(formSchema: FormSchema, currentFieldKey: string): FieldOption[] {
  const fields: FormFieldSchema[] = [];
  visitFormFields(formSchema, (field) => {
    fields.push(field);
  });
  return buildFieldOptions(fields, currentFieldKey);
}

/** LLM 提示词变量：仅题目展示字段（importRole=display），含 payload 绑定的 showItem */
export function buildDisplayFieldOptions(formSchema: FormSchema, currentFieldKey: string): FieldOption[] {
  const fields: FormFieldSchema[] = [];
  visitFormFields(formSchema, (field) => {
    if (resolveImportRole(field) === "display") {
      fields.push(field);
    }
  });
  return fields
    .filter((item) => item.key !== currentFieldKey && item.component !== "llmSuggest")
    .map((item) => {
      const path = resolveConditionFieldPath(item.path, item.key);
      return {
        value: path,
        label: `${item.label} (${path})`,
      };
    });
}

/** Agent 应用映射目标：仅标注作答字段（importRole=input） */
export function buildInputFieldOptions(formSchema: FormSchema, currentFieldKey: string): FieldOption[] {
  const fields: FormFieldSchema[] = [];
  visitFormFields(formSchema, (field) => {
    if (resolveImportRole(field) === "input") {
      fields.push(field);
    }
  });
  return buildFieldOptions(fields, currentFieldKey);
}
