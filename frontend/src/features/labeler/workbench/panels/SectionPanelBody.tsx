import { useMemo } from "react";
import { buildResourceMeta } from "@/low-code/utils/form-schema";
import type { WidgetViewMode } from "@/components/workbench2/components/EditableWidgetBoard";
import { buildDisplayValuesFromPayload } from "../../work/utils/build-display-values";
import { AnnotatePanelBody } from "./AnnotatePanelBody";
import { LabelerPanelScrollArea } from "./LabelerPanelScrollArea";
import { PayloadPanelForm } from "./payload/PayloadPanelForm";
import {
  countSectionFields,
  findFormSection,
  resolveSectionSurface,
  resolveSectionViewMode,
  sliceFormSchemaSection,
} from "../labeler-section-widget";
import type { LabelerWorkbenchBusinessContext } from "../types";
import type { LabelerWorkbenchViewMode } from "../LabelerSlotFrame";

export function SectionPanelBody({
  context,
  sectionKey,
  viewMode,
}: {
  context: LabelerWorkbenchBusinessContext;
  sectionKey: string;
  viewMode: WidgetViewMode;
}) {
  const section = findFormSection(context.formSchema, sectionKey);
  const sectionConfig = context.renderPrefs.sectionWidgets?.[sectionKey];

  const surface = useMemo(() => {
    if (!section) {
      return "display" as const;
    }
    return resolveSectionSurface(section, sectionConfig?.surface);
  }, [section, sectionConfig?.surface]);

  const sectionSchema = useMemo(() => {
    if (!section || !context.formSchema) {
      return null;
    }
    return sliceFormSchemaSection(context.formSchema, section);
  }, [context.formSchema, section]);

  const resolvedViewMode = resolveSectionViewMode(
    sectionKey,
    sectionConfig?.viewMode,
    surface,
    context.renderPrefs.defaults,
  ) as LabelerWorkbenchViewMode;

  const effectiveViewMode = viewMode ?? resolvedViewMode;

  if (!section || !sectionSchema) {
    return <p className="px-4 py-6 text-center text-sm text-slate-500">区块不存在或模板已变更</p>;
  }

  if (surface === "annotate") {
    const annotateResource = buildResourceMeta(
      { ...sectionSchema, actions: context.formSchema?.actions ?? [] },
      section.title ?? section.key,
      `labeler_section_${section.key}`,
    );
    const annotateContext: LabelerWorkbenchBusinessContext = {
      ...context,
      annotateResource,
      annotateFieldCount: countSectionFields(section),
    };
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <AnnotatePanelBody context={annotateContext} viewMode={effectiveViewMode} showPanelHeader={false} />
      </div>
    );
  }

  const payload = context.work.taskItem.payload;
  const displayValues = buildDisplayValuesFromPayload(sectionSchema, payload);
  const flatDisplayFields = section.fields;

  return (
    <LabelerPanelScrollArea className="h-full" contentClassName="p-3">
      <PayloadPanelForm
        displaySchema={sectionSchema}
        displayValues={displayValues}
        flatDisplayFields={flatDisplayFields}
        hasTemplateDisplay={flatDisplayFields.length > 0}
        hasPayload={Object.keys(payload).length > 0}
        payload={payload}
      />
    </LabelerPanelScrollArea>
  );
}
