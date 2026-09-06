import type { FormFieldSchema, FormMode, FormSectionSchema } from "../schema/types";
import { evaluateConditions } from "./visibility";

export function isVisibleInFormMode(visibleIn: FormMode[] | undefined, mode: FormMode): boolean {
  if (!visibleIn?.length) {
    return true;
  }
  return visibleIn.includes(mode);
}

export function isDisabledInFormMode(disabledIn: FormMode[] | undefined, mode: FormMode): boolean {
  if (!disabledIn?.length) {
    return false;
  }
  return disabledIn.includes(mode);
}

export function isFormSectionVisible(
  section: Pick<FormSectionSchema, "visibleIn">,
  mode: FormMode,
): boolean {
  return isVisibleInFormMode(section.visibleIn, mode);
}

export function isFormFieldVisible(
  field: Pick<FormFieldSchema, "hidden" | "visibleIn" | "visibleWhen">,
  mode: FormMode,
  values: Record<string, unknown>,
): boolean {
  if (field.hidden) {
    return false;
  }
  if (!isVisibleInFormMode(field.visibleIn, mode)) {
    return false;
  }
  return evaluateConditions(values, field.visibleWhen);
}

export function isFormFieldDisabled(
  field: Pick<FormFieldSchema, "readonly" | "disabledIn" | "disabledWhen" | "component">,
  mode: FormMode,
  values: Record<string, unknown>,
  parentDisabled = false,
): boolean {
  if (parentDisabled) {
    return true;
  }
  if (field.component === "llmSuggest") {
    if (field.readonly) {
      return true;
    }
    return Boolean(field.disabledWhen && evaluateConditions(values, field.disabledWhen));
  }
  if (isDisabledInFormMode(field.disabledIn, mode)) {
    return true;
  }
  if (field.readonly) {
    return true;
  }
  if (field.disabledWhen && evaluateConditions(values, field.disabledWhen)) {
    return true;
  }
  return false;
}
