import type { AuthenticatedUser } from "../../lib/types";
import type { FormFieldSchema, FormMode, ResourceMeta, ValidationRuleMeta } from "../../schema/types";
import { isUploadedFileRef } from "../fields/upload-types";
import { isFormFieldDisabled, isFormFieldVisible, isFormSectionVisible } from "../../utils/form-field-mode";
import { getValueAtPath } from "../../utils/object-path";
import { hasPermission } from "../../utils/permissions";
import { isJsonFieldComponent, validateJsonFieldValue } from "../fields/controls/json-field-utils";

function isEmptyValue(value: unknown): boolean {
  if (value == null) {
    return true;
  }
  if (isUploadedFileRef(value)) {
    return !value.name.trim();
  }
  if (typeof value === "string") {
    return value.trim().length === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return false;
}

function validateFieldRule(value: unknown, rule: ValidationRuleMeta): string | null {
  if (rule.type === "required") {
    return isEmptyValue(value) ? rule.message : null;
  }
  if (isEmptyValue(value)) {
    return null;
  }
  const textValue = typeof value === "string" ? value : String(value);
  const numericValue = typeof value === "number" ? value : Number(value);
  switch (rule.type) {
    case "minLength":
      return textValue.length < Number(rule.value ?? 0) ? rule.message : null;
    case "maxLength":
      return textValue.length > Number(rule.value ?? 0) ? rule.message : null;
    case "min":
      return Number.isNaN(numericValue) || numericValue < Number(rule.value ?? 0) ? rule.message : null;
    case "max":
      return Number.isNaN(numericValue) || numericValue > Number(rule.value ?? 0) ? rule.message : null;
    case "pattern":
      return typeof rule.value === "string" && !new RegExp(rule.value).test(textValue) ? rule.message : null;
    case "email":
      return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(textValue) ? rule.message : null;
    case "phone":
      return !/^1\d{10}$/.test(textValue) ? rule.message : null;
    default:
      return null;
  }
}

function validateField(field: FormFieldSchema, value: unknown): string | null {
  const rules: ValidationRuleMeta[] = [];
  if (field.required) {
    rules.push({ type: "required", message: `请填写${field.label}` });
  }
  rules.push(...(field.rules ?? []));
  for (const rule of rules) {
    const error = validateFieldRule(value, rule);
    if (error) {
      return error;
    }
  }
  if (isJsonFieldComponent(field.component)) {
    const jsonError = validateJsonFieldValue(value);
    if (jsonError) {
      return jsonError;
    }
  }
  return null;
}

function fieldContext(values: Record<string, unknown>, path: string): Record<string, unknown> {
  const value = getValueAtPath(values, path);
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function validateArrayFieldItems(
  field: FormFieldSchema,
  path: string,
  values: Record<string, unknown>,
  errors: Record<string, string>,
  currentUser: AuthenticatedUser | null | undefined,
  mode: FormMode,
): void {
  const items = Array.isArray(getValueAtPath(values, path)) ? (getValueAtPath(values, path) as unknown[]) : [];
  const arrayError = validateField(field, items);
  if (arrayError) {
    errors[path] = arrayError;
  }
  items.forEach((_, index) => {
    const itemCtx = fieldContext(values, `${path}.${index}`);
    for (const childField of field.fields ?? []) {
      if (!hasPermission(currentUser ?? null, childField.permission)) {
        continue;
      }
      const childPath = `${path}.${index}.${childField.path ?? childField.key}`;
      if (!isFormFieldVisible(childField, mode, itemCtx)) {
        continue;
      }
      if (isFormFieldDisabled(childField, mode, itemCtx)) {
        continue;
      }
      if (
        childField.component === "showItem" ||
        childField.component === "showImage" ||
        childField.component === "showFile" ||
        childField.component === "showVideo" ||
        childField.component === "llmSuggest"
      ) {
        continue;
      }
      const childValue = getValueAtPath(values, childPath);
      const error = validateField(childField, childValue);
      if (error) {
        errors[childPath] = error;
      }
    }
  });
}

export function collectResourceFormValidationErrors(
  resource: ResourceMeta,
  values: Record<string, unknown>,
  remoteSchemaFields: Record<string, FormFieldSchema[]> = {},
  currentUser: AuthenticatedUser | null | undefined = null,
  mode: FormMode = "create",
): Record<string, string> {
  const nextErrors: Record<string, string> = {};

  function visitNestedFields(fields: FormFieldSchema[], parentPath: string, contextValues: Record<string, unknown>) {
    for (const field of fields) {
      if (!hasPermission(currentUser, field.permission)) {
        continue;
      }
      const childPath = `${parentPath}.${field.path ?? field.key}`;
      if (!isFormFieldVisible(field, mode, contextValues)) {
        continue;
      }
      if (isFormFieldDisabled(field, mode, contextValues)) {
        continue;
      }
      if (
        field.component === "showItem" ||
        field.component === "showImage" ||
        field.component === "showFile" ||
        field.component === "showVideo" ||
        field.component === "llmSuggest" ||
        field.component === "dictTagPreview" ||
        field.component === "dynamicTable"
      ) {
        continue;
      }
      if (field.component === "remoteSchema") {
        visitNestedFields(remoteSchemaFields[field.key] ?? field.fields ?? [], childPath, fieldContext(values, childPath));
        continue;
      }
      if (field.component === "array") {
        validateArrayFieldItems(field, childPath, values, nextErrors, currentUser, mode);
        continue;
      }
      const childValue = getValueAtPath(values, childPath);
      const error = validateField(field, childValue);
      if (error) {
        nextErrors[childPath] = error;
      }
    }
  }

  function visitFields(fields: FormFieldSchema[], parentPath?: string) {
    for (const field of fields) {
      const path = parentPath ?? field.path ?? field.key;
      if (!hasPermission(currentUser, field.permission)) {
        continue;
      }
      if (!isFormFieldVisible(field, mode, values)) {
        continue;
      }
      if (isFormFieldDisabled(field, mode, values)) {
        continue;
      }

      if (
        field.component === "showItem" ||
        field.component === "showImage" ||
        field.component === "showFile" ||
        field.component === "showVideo" ||
        field.component === "llmSuggest" ||
        field.component === "dictTagPreview" ||
        field.component === "dynamicTable"
      ) {
        continue;
      }

      if (field.component === "array") {
        validateArrayFieldItems(field, path, values, nextErrors, currentUser, mode);
        continue;
      }

      if (field.component === "remoteSchema") {
        const parentValue = getValueAtPath(values, path);
        const parentError = validateField(field, parentValue);
        if (parentError) {
          nextErrors[path] = parentError;
        }
        visitNestedFields(remoteSchemaFields[field.key] ?? field.fields ?? [], path, fieldContext(values, path));
        continue;
      }

      const value = getValueAtPath(values, path);
      const error = validateField(field, value);
      if (error) {
        nextErrors[path] = error;
      }
    }
  }

  visitFields(
    resource.form.sections
      .filter((section) => isFormSectionVisible(section, mode))
      .flatMap((section) => section.fields),
  );
  return nextErrors;
}

export function firstResourceFormValidationError(errors: Record<string, string>): string | null {
  return Object.values(errors)[0] ?? null;
}
