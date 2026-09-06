import { WorkbenchSchemaDataSection } from "@/components/workbench/shared/schema-data/WorkbenchSchemaDataSection";
import type { SchemaDataViewMode } from "@/components/workbench/shared/schema-data/SchemaDataView";
import type { WorkbenchPanelSectionDefinition } from "@/components/workbench/shared/panel-sections/types";

export function SchemaSectionWidgetBody({
  section,
  viewMode,
  onViewModeChange,
  fillHeight = false,
  showViewToggle = false,
  compactHeader = false,
  standaloneTab = false,
  annotateOnly = false,
}: {
  section: WorkbenchPanelSectionDefinition;
  viewMode: SchemaDataViewMode;
  onViewModeChange?: (mode: SchemaDataViewMode) => void;
  fillHeight?: boolean;
  /** 为 true 时展示视图切换（通常仅编辑布局模式） */
  showViewToggle?: boolean;
  compactHeader?: boolean;
  standaloneTab?: boolean;
  annotateOnly?: boolean;
}) {
  const canChangeViewMode = showViewToggle && Boolean(onViewModeChange);

  return (
    <WorkbenchSchemaDataSection
      id={section.id}
      title={section.title}
      data={section.data}
      schema={section.schema}
      viewMode={viewMode}
      onViewModeChange={onViewModeChange ?? (() => undefined)}
      emptyMessage={section.emptyMessage}
      hideViewToggle={!canChangeViewMode}
      fillHeight={fillHeight}
      compactHeader={compactHeader}
      standaloneTab={standaloneTab}
      annotateOnly={annotateOnly}
      headerExtra={section.headerExtra}
      bodyLead={section.bodyLead}
      renderBody={section.renderBody}
    />
  );
}
