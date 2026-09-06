import type { FormSchema } from "@/low-code/schema/types";
import type { LabelerRenderPrefs } from "./labeler-render-prefs";
import {
  buildSectionWidgetId,
  defaultBoardForSectionWidget,
  findFormSection,
  isSectionWidgetId,
  parseSectionWidgetId,
  resolveSectionDisplayTitle,
  resolveSectionSurface,
} from "./labeler-section-widget";
import type { LabelerWidgetBoardId } from "./labeler-widget-board-storage";

export interface LabelerWidgetDefinition {
  id: string;
  defaultBoard: LabelerWidgetBoardId;
  title: string;
  transferable: boolean;
  removable?: boolean;
}

export const LABELER_WIDGET_DEFINITIONS = {
  "payload-main": {
    id: "payload-main",
    defaultBoard: "payload",
    title: "题面",
    transferable: true,
  },
  "ai-review": {
    id: "ai-review",
    defaultBoard: "ai",
    title: "AI 审核",
    transferable: true,
  },
  "annotate-main": {
    id: "annotate-main",
    defaultBoard: "annotate",
    title: "作答表单",
    transferable: true,
  },
  "annotate-actions": {
    id: "annotate-actions",
    defaultBoard: "annotate",
    title: "提交操作",
    transferable: true,
    removable: true,
  },
} as const satisfies Record<string, LabelerWidgetDefinition>;

export type StaticLabelerWidgetId = keyof typeof LABELER_WIDGET_DEFINITIONS;

export type LabelerWorkbenchWidgetId = StaticLabelerWidgetId | `section:${string}`;

export const ALL_LABELER_WIDGET_IDS = Object.keys(LABELER_WIDGET_DEFINITIONS) as StaticLabelerWidgetId[];

export function isStaticLabelerWidgetId(widgetId: string): widgetId is StaticLabelerWidgetId {
  return widgetId in LABELER_WIDGET_DEFINITIONS;
}

/** @deprecated 仅静态 widget；板级识别请用 isLabelerBoardWidgetId */
export function isLabelerWidgetId(value: string): value is StaticLabelerWidgetId {
  return isStaticLabelerWidgetId(value);
}

export function isLabelerBoardWidgetId(
  value: string,
  formSchema: FormSchema | null | undefined,
): boolean {
  if (isStaticLabelerWidgetId(value)) {
    return true;
  }
  if (!isSectionWidgetId(value) || !formSchema) {
    return false;
  }
  const sectionKey = parseSectionWidgetId(value);
  return sectionKey != null && findFormSection(formSchema, sectionKey) != null;
}

export function resolveLabelerWidgetDefinition(
  widgetId: string,
  formSchema: FormSchema | null | undefined,
  prefs: LabelerRenderPrefs,
): LabelerWidgetDefinition | null {
  if (isStaticLabelerWidgetId(widgetId)) {
    return LABELER_WIDGET_DEFINITIONS[widgetId];
  }

  const sectionKey = parseSectionWidgetId(widgetId);
  if (!sectionKey || !formSchema) {
    return null;
  }
  const section = findFormSection(formSchema, sectionKey);
  if (!section) {
    return null;
  }

  const config = prefs.sectionWidgets?.[sectionKey];
  const surface = resolveSectionSurface(section, config?.surface);
  return {
    id: buildSectionWidgetId(sectionKey),
    defaultBoard: defaultBoardForSectionWidget(surface),
    title: resolveSectionDisplayTitle(section),
    transferable: true,
    removable: true,
  };
}

export function isLabelerWidgetRemovable(
  widgetId: string,
  formSchema: FormSchema | null | undefined,
  prefs: LabelerRenderPrefs,
): boolean {
  const definition = resolveLabelerWidgetDefinition(widgetId, formSchema, prefs);
  return definition?.removable ?? definition?.transferable ?? false;
}

export function defaultBoardForWidget(
  widgetId: string,
  formSchema: FormSchema | null | undefined,
  prefs: LabelerRenderPrefs,
): LabelerWidgetBoardId | null {
  const definition = resolveLabelerWidgetDefinition(widgetId, formSchema, prefs);
  return definition?.defaultBoard ?? null;
}

export function listAvailableWidgetIds(
  formSchema: FormSchema | null | undefined,
  prefs: LabelerRenderPrefs,
): string[] {
  if (prefs.layoutMode === "sectionWidgets" && formSchema) {
    const sectionIds = formSchema.sections
      .filter((section) => prefs.sectionWidgets?.[section.key]?.visible !== false)
      .map((section) => buildSectionWidgetId(section.key));
    return [...sectionIds, "annotate-actions", "ai-review"];
  }
  return [...ALL_LABELER_WIDGET_IDS];
}
