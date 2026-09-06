import type { FieldOption } from "./field-options";
import { fieldOptionShortLabel } from "./field-option-label";
import { formatLlmTemplateVariable } from "./llm-prompt-insert";

const DISPLAY_OPEN = "「";
const DISPLAY_CLOSE = "」";

/** 设计器内展示用：字段含义（label） */
export function formatLlmDisplayVariable(label: string): string {
  return `${DISPLAY_OPEN}${label}${DISPLAY_CLOSE}`;
}

function sortOptionsByLabelLength(options: FieldOption[]): FieldOption[] {
  return [...options].sort(
    (left, right) => fieldOptionShortLabel(right).length - fieldOptionShortLabel(left).length,
  );
}

/** 模板存储（path）→ 设计器展示（字段含义） */
export function storedUserPromptToDisplay(stored: string, fieldOptions: FieldOption[]): string {
  let display = stored;
  for (const option of fieldOptions) {
    const pathToken = formatLlmTemplateVariable(option.value);
    const labelToken = formatLlmDisplayVariable(fieldOptionShortLabel(option));
    display = display.split(pathToken).join(labelToken);
  }
  return display;
}

/** 设计器展示（字段含义）→ 模板存储（path） */
export function displayUserPromptToStored(display: string, fieldOptions: FieldOption[]): string {
  let stored = display;
  for (const option of sortOptionsByLabelLength(fieldOptions)) {
    const pathToken = formatLlmTemplateVariable(option.value);
    const labelToken = formatLlmDisplayVariable(fieldOptionShortLabel(option));
    stored = stored.split(labelToken).join(pathToken);
  }
  return stored;
}

export function displayVariableTokenForPath(path: string, fieldOptions: FieldOption[]): string {
  const option = fieldOptions.find((item) => item.value === path);
  if (!option) {
    return formatLlmTemplateVariable(path);
  }
  return formatLlmDisplayVariable(fieldOptionShortLabel(option));
}
