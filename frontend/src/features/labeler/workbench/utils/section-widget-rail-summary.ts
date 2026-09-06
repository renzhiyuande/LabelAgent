import { getFieldBinding } from "@/low-code/schema/import-field-meta";
import type { FormSectionSchema } from "@/low-code/schema/types";
import { resolveSchemaFieldDisplayLabel } from "@/low-code/utils/schema-field-display";
import { getValueAtPath } from "@/low-code/utils/object-path";
import { buildDisplayValuesFromPayload } from "../../work/utils/build-display-values";
import {
  countSectionFields,
  findFormSection,
  resolveSectionDisplayTitle,
  resolveSectionSurface,
  sliceFormSchemaSection,
} from "../labeler-section-widget";
import type { LabelerWorkbenchBusinessContext } from "../types";

export interface SectionRailSummaryLine {
  label: string;
  value: string;
}

export interface SectionWidgetRailSummary {
  title: string;
  surface: "display" | "annotate";
  lines: SectionRailSummaryLine[];
  progress?: { filled: number; total: number };
}

export function truncateRailText(text: string, maxLen = 22): string {
  const cleaned = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "—";
  }
  if (cleaned.length <= maxLen) {
    return cleaned;
  }
  return `${cleaned.slice(0, maxLen)}…`;
}

function isFilledValue(value: unknown): boolean {
  if (value == null || value === "") {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }
  return true;
}

function countFilledSectionFields(section: FormSectionSchema, values: Record<string, unknown>): number {
  let filled = 0;
  for (const field of section.fields) {
    const binding = getFieldBinding(field);
    if (!binding) {
      continue;
    }
    if (isFilledValue(getValueAtPath(values, binding))) {
      filled += 1;
    }
  }
  return filled;
}

export function buildSectionWidgetRailSummary(
  context: LabelerWorkbenchBusinessContext,
  sectionKey: string,
  maxLines = 3,
): SectionWidgetRailSummary | null {
  const section = findFormSection(context.formSchema, sectionKey);
  if (!section || !context.formSchema) {
    return null;
  }

  const sectionConfig = context.renderPrefs.sectionWidgets?.[sectionKey];
  const surface = resolveSectionSurface(section, sectionConfig?.surface);
  const title = resolveSectionDisplayTitle(section);

  if (surface === "annotate") {
    return {
      title,
      surface,
      lines: [],
      progress: {
        filled: countFilledSectionFields(section, context.values),
        total: countSectionFields(section),
      },
    };
  }

  const sectionSchema = sliceFormSchemaSection(context.formSchema, section);
  const displayValues = buildDisplayValuesFromPayload(sectionSchema, context.work.taskItem.payload);
  const lines: SectionRailSummaryLine[] = [];

  const description = section.description?.trim();
  if (description) {
    lines.push({
      label: "说明",
      value: truncateRailText(description),
    });
  }

  for (const field of section.fields) {
    if (lines.length >= maxLines) {
      break;
    }
    const binding = getFieldBinding(field);
    if (!binding) {
      continue;
    }
    const value = getValueAtPath(displayValues, binding);
    const displayLabel = resolveSchemaFieldDisplayLabel(field, value);
    if (displayLabel === "—") {
      continue;
    }
    lines.push({
      label: field.label?.trim() || binding,
      value: truncateRailText(displayLabel),
    });
  }

  if (lines.length === 0 && section.fields.length > 0) {
    lines.push({
      label: "字段",
      value: `${section.fields.length} 项`,
    });
  }

  return {
    title,
    surface,
    lines,
  };
}
