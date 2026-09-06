import type { FieldOption } from "./field-options";
import { formatLlmTemplateVariable } from "./llm-prompt-insert";

/** fieldOptions.label 形如「偏好结论 (result.preferred)」 */
export function fieldOptionShortLabel(option: FieldOption): string {
  const match = option.label.match(/^(.+?)\s+\([^)]+\)$/);
  return match?.[1]?.trim() || option.label;
}

export function fieldOptionInsertTitle(option: FieldOption): string {
  return `插入 ${formatLlmTemplateVariable(option.value)}`;
}
