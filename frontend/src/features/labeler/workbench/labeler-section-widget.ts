import { resolveImportRole } from "@/low-code/schema/import-field-meta";
import type { FormSchema, FormSectionSchema } from "@/low-code/schema/types";
import type { LabelerSectionSurface, LabelerSurfaceViewMode } from "./labeler-render-prefs";
import type { LabelerWidgetBoardId } from "./labeler-widget-board-storage";

export const SECTION_WIDGET_PREFIX = "section:";

export function buildSectionWidgetId(sectionKey: string): string {
  return `${SECTION_WIDGET_PREFIX}${sectionKey}`;
}

export function parseSectionWidgetId(widgetId: string): string | null {
  if (!widgetId.startsWith(SECTION_WIDGET_PREFIX)) {
    return null;
  }
  const sectionKey = widgetId.slice(SECTION_WIDGET_PREFIX.length);
  return sectionKey || null;
}

export function isSectionWidgetId(widgetId: string): boolean {
  return parseSectionWidgetId(widgetId) != null;
}

export function findFormSection(formSchema: FormSchema | null | undefined, sectionKey: string): FormSectionSchema | null {
  return formSchema?.sections.find((section) => section.key === sectionKey) ?? null;
}

/** Tab / 组件标题：优先 section.title，其次单字段 label，避免直接暴露 section key */
export function resolveSectionDisplayTitle(section: FormSectionSchema): string {
  const title = section.title?.trim();
  if (title) {
    return title;
  }
  if (section.fields.length === 1) {
    const fieldLabel = section.fields[0]?.label?.trim();
    if (fieldLabel) {
      return fieldLabel;
    }
  }
  return section.key;
}

export function sliceFormSchemaSection(formSchema: FormSchema, section: FormSectionSchema): FormSchema {
  return {
    ...formSchema,
    title: resolveSectionDisplayTitle(section),
    sections: [section],
    actions: [],
  };
}

export function inferSectionSurface(section: FormSectionSchema): "display" | "annotate" {
  let inputCount = 0;
  let displayCount = 0;
  for (const field of section.fields) {
    const role = resolveImportRole(field);
    if (role === "input") {
      inputCount += 1;
    } else if (role === "display" || role === "runtime") {
      displayCount += 1;
    }
  }
  return inputCount > displayCount ? "annotate" : "display";
}

export function resolveSectionSurface(
  section: FormSectionSchema,
  configured: LabelerSectionSurface | undefined,
): "display" | "annotate" {
  if (configured === "display" || configured === "annotate") {
    return configured;
  }
  return inferSectionSurface(section);
}

export function resolveSectionViewMode(
  sectionKey: string,
  configured: LabelerSurfaceViewMode | undefined,
  surface: "display" | "annotate",
  defaults: { payload: LabelerSurfaceViewMode; annotate: LabelerSurfaceViewMode },
): LabelerSurfaceViewMode {
  if (configured === "inline" || configured === "cards" || configured === "json") {
    return configured;
  }
  return surface === "annotate" ? defaults.annotate : defaults.payload;
}

export function defaultBoardForSectionWidget(surface: "display" | "annotate"): LabelerWidgetBoardId {
  return surface === "annotate" ? "annotate" : "payload";
}

export function countSectionFields(section: FormSectionSchema): number {
  return section.fields.length;
}
