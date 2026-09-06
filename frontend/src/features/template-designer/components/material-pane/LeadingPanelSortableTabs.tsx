"use client";

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
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Braces, Boxes, GripVertical, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LeadingTabId } from "../../hooks/use-leading-tab-order";

const TAB_META: Record<LeadingTabId, { label: string; icon: LucideIcon }> = {
  materials: { label: "组件库", icon: Boxes },
  preview: { label: "预览值", icon: Braces },
};

interface LeadingPanelSortableTabsProps {
  tabOrder: LeadingTabId[];
  activeTab: LeadingTabId;
  previewKeyCount: number;
  onSelect: (tabId: LeadingTabId) => void;
  onReorder: (activeId: LeadingTabId, overId: LeadingTabId) => void;
}

function SortableLeadingTab({
  tabId,
  active,
  previewKeyCount,
  onSelect,
}: {
  tabId: LeadingTabId;
  active: boolean;
  previewKeyCount: number;
  onSelect: () => void;
}) {
  const meta = TAB_META[tabId];
  const Icon = meta.icon;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tabId,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        transition: isDragging ? transition : undefined,
      }}
      className={cn("relative flex min-w-0 flex-1 items-center", isDragging && "z-10 lh-workbench-panel--dragging")}
    >
      <button
        type="button"
        className="cursor-grab rounded p-0.5 text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
        title="拖动 Tab 顺序"
        aria-label={`拖动 ${meta.label} Tab`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5 shrink-0" />
      </button>
      <button
        type="button"
        title={meta.label}
        className={cn(
          "flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors duration-200",
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-background hover:text-foreground",
        )}
        onClick={onSelect}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{meta.label}</span>
        {tabId === "preview" && previewKeyCount > 0 ? (
          <Badge variant="secondary" className="h-4 shrink-0 px-1 text-[10px] font-normal tabular-nums">
            {previewKeyCount}
          </Badge>
        ) : null}
      </button>
    </div>
  );
}

export function LeadingPanelSortableTabs({
  tabOrder,
  activeTab,
  previewKeyCount,
  onSelect,
  onReorder,
}: LeadingPanelSortableTabsProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    onReorder(active.id as LeadingTabId, over.id as LeadingTabId);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tabOrder} strategy={horizontalListSortingStrategy}>
        <div
          className="flex gap-1 rounded-md bg-muted p-1"
          role="tablist"
          aria-label="设计辅助"
        >
          {tabOrder.map((tabId) => (
            <SortableLeadingTab
              key={tabId}
              tabId={tabId}
              active={activeTab === tabId}
              previewKeyCount={previewKeyCount}
              onSelect={() => onSelect(tabId)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
