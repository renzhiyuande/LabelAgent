import type { FormFieldSchema, FormSchema, FormSectionSchema } from "@/low-code/schema/types";
import type { WorkbenchPanelSectionDefinition } from "../panel-sections/types";
import {
  filterFormSchemaForAnnotateDisplay,
  filterFormSchemaForReviewerDisplay,
  isReviewerVisibleField,
} from "./filter-reviewer-display-schema";

const CONTEXT_SECTION_KEYS = ["context", "payload", "item", "import", "prompt"];
const ANNOTATE_SECTION_KEYS = ["labeling", "annotate", "label", "result", "submission"];
const SKIP_SECTION_KEYS = new Set(["instructions", "rules", "guide"]);

function sliceFormSchemaSection(schema: FormSchema, section: FormSectionSchema): FormSchema {
  return filterFormSchemaForReviewerDisplay({
    ...schema,
    title: section.title,
    sections: [
      {
        ...section,
        fields: section.fields.filter(isReviewerVisibleField),
      },
    ],
  });
}

function pickTemplateSection(schema: FormSchema, preferKeys: readonly string[]): FormSectionSchema | null {
  for (const key of preferKeys) {
    const found = schema.sections.find((section) => section.key === key);
    if (found) {
      return found;
    }
  }
  return null;
}

function pickFallbackContextSection(schema: FormSchema): FormSectionSchema | null {
  return (
    schema.sections.find(
      (section) => !SKIP_SECTION_KEYS.has(section.key) && !ANNOTATE_SECTION_KEYS.includes(section.key),
    ) ?? null
  );
}

function pickFallbackAnnotateSection(schema: FormSchema): FormSectionSchema | null {
  const candidates = schema.sections.filter(
    (section) => !SKIP_SECTION_KEYS.has(section.key) && !CONTEXT_SECTION_KEYS.includes(section.key),
  );
  return candidates[candidates.length - 1] ?? null;
}

function isTemplateDisplayField(field: FormFieldSchema): boolean {
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
  return field.readonly === true;
}

function fieldValuePresent(value: unknown): boolean {
  if (value == null) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }
  return true;
}

function readFieldValue(data: Record<string, unknown>, field: FormFieldSchema): unknown {
  const binding = field.path ?? field.key;
  if (!binding) {
    return undefined;
  }
  if (binding in data) {
    return data[binding];
  }
  const parts = binding.split(".");
  let current: unknown = data;
  for (const part of parts) {
    if (current == null || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/** 模板「题目上下文」分区是否存在可展示的导入题目数据 */
export function hasTemplateSectionDisplayData(
  section: FormSectionSchema,
  data: Record<string, unknown>,
): boolean {
  return section.fields.some((field) => {
    if (!isTemplateDisplayField(field)) {
      return false;
    }
    return fieldValuePresent(readFieldValue(data, field));
  });
}

export function hasRecordDisplayData(data: Record<string, unknown>): boolean {
  return Object.keys(data).some((key) => fieldValuePresent(data[key]));
}

export function shouldSplitTemplateContentSections(schema: FormSchema | null | undefined): boolean {
  if (!schema?.sections?.length) {
    return false;
  }
  const displaySections = schema.sections.filter((section) => !SKIP_SECTION_KEYS.has(section.key));
  return displaySections.length > 1;
}

export function buildSplitTemplateContentSections(params: {
  payload: Record<string, unknown>;
  annotateData: Record<string, unknown>;
  annotateSchema: FormSchema;
  payloadFallbackTitle?: string;
  annotateFallbackTitle?: string;
}): { payload: WorkbenchPanelSectionDefinition | null; annotate: WorkbenchPanelSectionDefinition } | null {
  const annotateSchema = filterFormSchemaForReviewerDisplay(params.annotateSchema);
  if (!shouldSplitTemplateContentSections(annotateSchema)) {
    return null;
  }

  const contextSection =
    pickTemplateSection(annotateSchema, CONTEXT_SECTION_KEYS) ?? pickFallbackContextSection(annotateSchema);
  const labelingSection =
    pickTemplateSection(annotateSchema, ANNOTATE_SECTION_KEYS) ?? pickFallbackAnnotateSection(annotateSchema);

  if (!contextSection || !labelingSection || contextSection.key === labelingSection.key) {
    return null;
  }

  const itemPayload = params.payload;
  const payloadSection = hasTemplateSectionDisplayData(contextSection, itemPayload)
    ? {
        id: "payload",
        title: contextSection.title?.trim() || params.payloadFallbackTitle || "题目上下文",
        data: itemPayload,
        schema: sliceFormSchemaSection(annotateSchema, contextSection),
        emptyMessage: "暂无题目上下文",
      }
    : null;

  return {
    payload: payloadSection,
    annotate: {
      id: "annotate",
      title: labelingSection.title?.trim() || params.annotateFallbackTitle || "标注结果",
      data: params.annotateData,
      schema: filterFormSchemaForAnnotateDisplay(sliceFormSchemaSection(annotateSchema, labelingSection)),
      emptyMessage: "暂无标注结果",
    },
  };
}
