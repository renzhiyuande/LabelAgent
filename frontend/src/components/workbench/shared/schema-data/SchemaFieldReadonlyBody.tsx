"use client";

import { useMemo } from "react";
import { FieldControlRenderer } from "@/low-code/components/fields/FieldControlRenderer";
import { toFormFieldViewModel } from "@/low-code/components/fields/adapters/form-field";
import type { FormFieldSchema, OptionItem } from "@/low-code/schema/types";
import { resolveSchemaFieldDictCode, resolveSchemaFieldDisplayLabel } from "@/low-code/utils/schema-field-display";
import { isReviewerVisibleField } from "./filter-reviewer-display-schema";

/** 审核/工作台只读展示：与模板表单控件对齐的 component */
const TEMPLATE_ALIGNED_READONLY_COMPONENTS = new Set([
  "showItem",
  "showImage",
  "showFile",
  "showVideo",
  "dictTagPreview",
  "richText",
  "json",
  "jsonEditor",
  "codeEditor",
  "radioGroup",
  "checkboxGroup",
  "select",
  "multiSelect",
  "tags",
  "switch",
  "fileUpload",
  "imageUpload",
  "textarea",
  "text",
  "user",
]);

function fieldNeedsFormContext(component: string): boolean {
  return (
    component === "showItem" ||
    component === "showImage" ||
    component === "showFile" ||
    component === "showVideo" ||
    component === "dictTagClassName"
  );
}

export function canRenderTemplateAlignedReadonlyField(field: FormFieldSchema): boolean {
  return isReviewerVisibleField(field) && TEMPLATE_ALIGNED_READONLY_COMPONENTS.has(field.component);
}

interface SchemaFieldReadonlyBodyProps {
  field: FormFieldSchema;
  value: unknown;
  context?: Record<string, unknown>;
  dictOptions?: Record<string, OptionItem[]>;
}

export function SchemaFieldReadonlyBody({
  field,
  value,
  context,
  dictOptions = {},
}: SchemaFieldReadonlyBodyProps) {
  const dictCode = resolveSchemaFieldDictCode(field);
  const options = useMemo(() => {
    if (field.options?.length) {
      return field.options;
    }
    if (dictCode && dictOptions[dictCode]?.length) {
      return dictOptions[dictCode];
    }
    return [];
  }, [dictCode, dictOptions, field.options]);

  const model = useMemo(() => {
    const base = toFormFieldViewModel({
      field,
      value,
      disabled: true,
      options,
    });
    if (fieldNeedsFormContext(field.component)) {
      return { ...base, formValues: context };
    }
    return base;
  }, [context, field, options, value]);

  if (!canRenderTemplateAlignedReadonlyField(field)) {
    return null;
  }

  return (
    <FieldControlRenderer
      model={model}
      handlers={{
        onChange: () => undefined,
      }}
    />
  );
}

export function resolveSchemaFieldFallbackText(
  field: FormFieldSchema,
  value: unknown,
  dictOptions: Record<string, OptionItem[]> = {},
): string {
  return resolveSchemaFieldDisplayLabel(field, value, dictOptions);
}
