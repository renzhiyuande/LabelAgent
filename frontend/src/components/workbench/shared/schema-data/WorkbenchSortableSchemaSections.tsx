import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WorkbenchPanelSectionDefinition } from "../panel-sections/types";
import { SchemaSectionsLayoutToggle } from "./SchemaSectionsLayoutToggle";
import {
  SortableSchemaDataSection,
  WorkbenchSchemaDataSection,
} from "./WorkbenchSchemaDataSection";
import type { SchemaDataViewMode } from "./SchemaDataView";
import {
  useSchemaSectionOrder,
  useSchemaSectionViewModes,
  useSchemaSectionsActiveTab,
  useSchemaSectionsLayout,
  type SchemaSectionsLayout,
} from "./use-schema-section-state";

/** @deprecated 使用 WorkbenchPanelSectionDefinition */
export type WorkbenchSchemaDataSectionDefinition = WorkbenchPanelSectionDefinition;

interface WorkbenchSortableSchemaSectionsProps {
  sections: WorkbenchPanelSectionDefinition[];
  orderStorageKey: string;
  viewModeStorageKey: string;
  layoutStorageKey: string;
  activeTabStorageKey?: string;
  defaultLayout?: SchemaSectionsLayout;
  className?: string;
  sortable?: boolean;
  showLayoutToggle?: boolean;
}

function renderSectionNode(
  section: WorkbenchPanelSectionDefinition,
  viewMode: SchemaDataViewMode,
  onViewModeChange: (mode: SchemaDataViewMode) => void,
  sortable: boolean,
  fillHeight: boolean,
) {
  const common = {
    id: section.id,
    title: section.title,
    data: section.data,
    schema: section.schema,
    viewMode,
    onViewModeChange: onViewModeChange,
    emptyMessage: section.emptyMessage,
    fillHeight,
    hideViewToggle: section.hideViewToggle,
    headerExtra: section.headerExtra,
    bodyLead: section.bodyLead,
    renderBody: section.renderBody,
  };

  return sortable ? (
    <SortableSchemaDataSection key={section.id} {...common} />
  ) : (
    <WorkbenchSchemaDataSection key={section.id} {...common} />
  );
}

function SortableSchemaSectionsList({
  sections,
  order,
  layout,
  activeTab,
  getViewMode,
  setViewMode,
  sortable,
}: {
  sections: WorkbenchPanelSectionDefinition[];
  order: string[];
  layout: SchemaSectionsLayout;
  activeTab: string;
  getViewMode: (id: string) => SchemaDataViewMode;
  setViewMode: (id: string, mode: SchemaDataViewMode) => void;
  sortable: boolean;
}) {
  const sectionMap = new Map(sections.map((section) => [section.id, section]));
  const orderedSections = order
    .map((id) => sectionMap.get(id))
    .filter((section): section is WorkbenchPanelSectionDefinition => section != null);

  const fillHeight = layout === "row";

  if (layout === "tabs") {
    const visible = orderedSections.filter((section) => section.id === activeTab);
    return (
      <div className="min-h-0 flex-1">
        {visible.map((section) =>
          renderSectionNode(section, getViewMode(section.id), (mode) => setViewMode(section.id, mode), sortable, true),
        )}
      </div>
    );
  }

  const containerClass =
    layout === "row"
      ? "grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-2"
      : "min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-0.5";

  return (
    <div className={containerClass}>
      {orderedSections.map((section) =>
        renderSectionNode(
          section,
          getViewMode(section.id),
          (mode) => setViewMode(section.id, mode),
          sortable,
          fillHeight,
        ),
      )}
    </div>
  );
}

export function WorkbenchSortableSchemaSections({
  sections,
  orderStorageKey,
  viewModeStorageKey,
  layoutStorageKey,
  activeTabStorageKey,
  defaultLayout = "stack",
  className,
  sortable = true,
  showLayoutToggle = true,
}: WorkbenchSortableSchemaSectionsProps) {
  const defaultOrder = useMemo(() => sections.map((section) => section.id), [sections]);
  const { order, setOrder, resetOrder } = useSchemaSectionOrder(orderStorageKey, defaultOrder);
  const { getViewMode, setViewMode } = useSchemaSectionViewModes(viewModeStorageKey, defaultOrder);
  const { layout, setLayout } = useSchemaSectionsLayout(layoutStorageKey, defaultLayout);
  const tabStorageKey = activeTabStorageKey ?? `${layoutStorageKey}.activeTab`;
  const { activeTab, setActiveTab } = useSchemaSectionsActiveTab(tabStorageKey, order);

  useEffect(() => {
    resetOrder(defaultOrder);
  }, [defaultOrder.join("|"), resetOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sortStrategy = layout === "row" ? horizontalListSortingStrategy : verticalListSortingStrategy;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = order.indexOf(String(active.id));
    const newIndex = order.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }
    setOrder(arrayMove(order, oldIndex, newIndex));
  }

  const sectionMap = new Map(sections.map((section) => [section.id, section]));
  const orderedSections = order
    .map((id) => sectionMap.get(id))
    .filter((section): section is WorkbenchPanelSectionDefinition => section != null);

  const list = (
    <SortableSchemaSectionsList
      sections={sections}
      order={order}
      layout={layout}
      activeTab={activeTab}
      getViewMode={getViewMode}
      setViewMode={setViewMode}
      sortable={sortable}
    />
  );

  const toolbar = showLayoutToggle ? (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <p className="text-[11px] text-slate-500">{sortable ? "拖动手柄可调整区块顺序" : null}</p>
      <SchemaSectionsLayoutToggle value={layout} onChange={setLayout} />
    </div>
  ) : null;

  const tabBar =
    layout === "tabs" ? (
      <div className="mb-3 flex flex-wrap gap-1.5">
        {orderedSections.map((section) => (
          <Button
            key={section.id}
            type="button"
            size="sm"
            variant={activeTab === section.id ? "default" : "outline"}
            className="h-8"
            onClick={() => setActiveTab(section.id)}
          >
            {section.title}
          </Button>
        ))}
      </div>
    ) : null;

  const body = (
    <div className={cn("flex min-h-0 flex-col", layout !== "stack" && "flex-1")}>
      {tabBar}
      {list}
    </div>
  );

  if (!sortable) {
    return (
      <div className={cn("flex min-h-0 flex-col", className)}>
        {toolbar}
        {body}
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      {toolbar}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={sortStrategy}>
          {body}
        </SortableContext>
      </DndContext>
    </div>
  );
}
