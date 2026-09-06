import { getFieldBinding, resolveImportRole, visitFormFields } from "../../schema/import-field-meta";
import type { FormSchema } from "../../schema/types";
import { getValueAtPath, setValueAtPath } from "../../utils/object-path";
import { extractLlmTemplateVariablePaths, renderLlmPromptTemplate } from "./llm-field-utils";

export interface LlmDisplayFieldRef {
  path: string;
  label: string;
}

function formatContextValue(value: unknown): string {
  if (value == null || value === "") {
    return "（空）";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/** 收集模板中可用于 LLM 上下文的题目展示字段 */
export function collectLlmDisplayFields(schema: FormSchema): LlmDisplayFieldRef[] {
  const fields: LlmDisplayFieldRef[] = [];
  visitFormFields(schema, (field) => {
    if (resolveImportRole(field) !== "display") {
      return;
    }
    const path = getFieldBinding(field);
    if (!path) {
      return;
    }
    fields.push({
      path,
      label: field.label?.trim() || path,
    });
  });
  return fields;
}

function mapPayloadToDisplayValues(
  schema: FormSchema,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  let values: Record<string, unknown> = { ...payload };
  visitFormFields(schema, (field) => {
    const binding = getFieldBinding(field);
    if (binding && binding in payload) {
      values = setValueAtPath(values, binding, payload[binding]);
    }
  });
  return values;
}

export function buildLlmSuggestContext(options: {
  formValues?: Record<string, unknown>;
  itemPayload?: Record<string, unknown>;
  displaySchema?: FormSchema;
}): Record<string, unknown> {
  const payload = options.itemPayload ?? {};
  const formValues = options.formValues ?? {};
  const mapped = options.displaySchema
    ? mapPayloadToDisplayValues(options.displaySchema, payload)
    : { ...payload };
  return mergeAnnotateFormValues(mapped, formValues, options.displaySchema);
}

function mergeAnnotateFormValues(
  target: Record<string, unknown>,
  formValues: Record<string, unknown>,
  schema?: FormSchema,
): Record<string, unknown> {
  if (!schema || Object.keys(formValues).length === 0) {
    return target;
  }
  let next = { ...target };
  visitFormFields(schema, (field) => {
    if (resolveImportRole(field) !== "input") {
      return;
    }
    const binding = getFieldBinding(field);
    if (!binding) {
      return;
    }
    const value = getValueAtPath(formValues, binding);
    if (value != null) {
      next = setValueAtPath(next, binding, value);
    }
  });
  return next;
}

export function formatLlmDisplayFieldsBlock(
  displaySchema: FormSchema,
  context: Record<string, unknown>,
): string {
  const fields = collectLlmDisplayFields(displaySchema);
  if (fields.length === 0) {
    return "";
  }
  const lines = fields.map(
    ({ path, label }) => `${label}：${formatContextValue(getValueAtPath(context, path))}`,
  );
  return `【题面数据】\n${lines.join("\n")}`;
}

export function buildLlmSuggestUserPrompt(options: {
  promptTemplate: string;
  formValues?: Record<string, unknown>;
  itemPayload?: Record<string, unknown>;
  displaySchema?: FormSchema;
}): { prompt: string; contextFields: string[] } {
  const context = buildLlmSuggestContext(options);
  const templatePaths = extractLlmTemplateVariablePaths(options.promptTemplate);
  const displayFields = options.displaySchema ? collectLlmDisplayFields(options.displaySchema) : [];
  const displayPaths = displayFields.map((field) => field.path);
  const contextFields = [...new Set([...templatePaths, ...displayPaths])];

  let prompt = renderLlmPromptTemplate(options.promptTemplate, context);

  if (options.displaySchema) {
    const block = formatLlmDisplayFieldsBlock(options.displaySchema, context);
    if (block && templatePaths.length === 0) {
      prompt = `${prompt.trim()}\n\n${block}`.trim();
    }
  }

  return { prompt, contextFields };
}
