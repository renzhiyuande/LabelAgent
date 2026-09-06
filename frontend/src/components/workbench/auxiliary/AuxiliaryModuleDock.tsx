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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type {
  AuxiliaryDisplayMode,
  AuxiliaryDockDensity,
  AuxiliaryDockId,
  AuxiliaryDockState,
  AuxiliaryModuleDefinition,
  AuxiliaryModuleRegistry,
} from "./types";
import { resolveAuxiliaryDisplayMode } from "./types";

export interface AuxiliaryModuleDockProps<TContext, TModuleId extends string> {
  placement: AuxiliaryDockId;
  density?: AuxiliaryDockDensity;
  state: AuxiliaryDockState<TModuleId>;
  onStateChange: (state: AuxiliaryDockState<TModuleId>) => void;
  context: TContext;
  modules: AuxiliaryModuleRegistry<TContext, TModuleId>;
  className?: string;
}

function SortableModuleTab<TContext, TModuleId extends string>({
  moduleDef,
  active,
  layout,
  onSelect,
  sortableId,
}: {
  moduleDef: AuxiliaryModuleDefinition<TContext, TModuleId>;
  active: boolean;
  layout: "horizontal" | "vertical";
  onSelect: () => void;
  sortableId: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sortableId });
  const Icon = moduleDef.icon;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        transition: isDragging ? transition : undefined,
      }}
      className={cn(
        "relative flex items-center",
        layout === "vertical" ? "w-full" : "min-w-0 flex-1",
        isDragging && "z-10 lh-workbench-panel--dragging",
      )}
    >
      <button
        type="button"
        className="cursor-grab rounded p-0.5 text-slate-300 hover:text-slate-500 active:cursor-grabbing dark:text-slate-600 dark:hover:text-slate-400"
        title="拖动 Tab 顺序"
        {...attributes}
        {...listeners}
      >
        <GripVertical className={cn("h-3 w-3 shrink-0", layout === "horizontal" && "h-3.5 w-3.5")} />
      </button>
      <button
        type="button"
        title={moduleDef.label}
        className={cn(
          "flex items-center justify-center rounded-md transition-colors duration-200",
          layout === "vertical" ? "h-8 flex-1" : "h-8 min-w-0 flex-1 gap-1.5 px-2 text-xs font-medium",
          active
            ? "bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary/80"
            : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300",
        )}
        onClick={onSelect}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {layout === "horizontal" ? moduleDef.label : null}
      </button>
    </div>
  );
}

function HeaderModuleCapsule<TContext, TModuleId extends string>({
  moduleDef,
  active,
  context,
  onSelect,
}: {
  moduleDef: AuxiliaryModuleDefinition<TContext, TModuleId>;
  active: boolean;
  context: TContext;
  onSelect: () => void;
}) {
  const [open, setOpen] = useState(false);
  const mode: AuxiliaryDisplayMode = "header-capsule";
  const accent = moduleDef.capsuleTone === "accent";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-7 shrink-0 items-center rounded-full border px-2.5 text-xs transition-colors",
            accent
              ? "border-violet-200/80 bg-violet-50/50 text-violet-900 hover:bg-violet-100/80 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-100 dark:hover:bg-violet-950/50"
              : "border-slate-200/80 bg-white/90 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
            active && "ring-2 ring-primary/30",
          )}
          onClick={() => {
            onSelect();
            setOpen(true);
          }}
        >
          {moduleDef.renderSummary(context, mode)}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className={cn(
          "w-[min(calc(100vw-2rem),26rem)] p-0",
          accent && "border-violet-200/60 dark:border-violet-900/40",
        )}
      >
        {moduleDef.renderBody(context, mode)}
      </PopoverContent>
    </Popover>
  );
}

/** 统一辅助模块坞：顶栏胶囊 / 侧栏宽态 / 侧栏窄态，由 registry 注入模块渲染。 */
export function AuxiliaryModuleDock<TContext, TModuleId extends string>({
  placement,
  density = "wide",
  state,
  onStateChange,
  context,
  modules,
  className,
}: AuxiliaryModuleDockProps<TContext, TModuleId>) {
  const displayMode = resolveAuxiliaryDisplayMode(placement, density);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!state.visible || state.modules.length === 0) {
    return null;
  }

  const activeModule = state.modules.includes(state.activeModule) ? state.activeModule : state.modules[0];
  const activeDef = modules[activeModule];

  function selectModule(moduleId: TModuleId) {
    if (moduleId === state.activeModule) {
      return;
    }
    onStateChange({ ...state, activeModule: moduleId });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = state.modules.indexOf(active.id as TModuleId);
    const newIndex = state.modules.indexOf(over.id as TModuleId);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }
    const nextModules = arrayMove(state.modules, oldIndex, newIndex);
    onStateChange({
      ...state,
      modules: nextModules,
      activeModule: nextModules.includes(state.activeModule) ? state.activeModule : nextModules[0],
    });
  }

  if (displayMode === "header-capsule") {
    return (
      <div className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
        {state.modules.map((moduleId) => {
          const moduleDef = modules[moduleId];
          if (!moduleDef) {
            return null;
          }
          return (
            <HeaderModuleCapsule
              key={moduleId}
              moduleDef={moduleDef}
              active={activeModule === moduleId}
              context={context}
              onSelect={() => selectModule(moduleId)}
            />
          );
        })}
      </div>
    );
  }

  const tabLayout = displayMode === "sidebar-narrow" ? "vertical" : "horizontal";
  const sortStrategy = tabLayout === "vertical" ? verticalListSortingStrategy : horizontalListSortingStrategy;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col",
        displayMode === "sidebar-narrow" && "h-full lh-workbench-rail-enter",
        className,
      )}
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={state.modules} strategy={sortStrategy}>
          <div
            className={cn(
              "shrink-0 border-slate-200/70 dark:border-slate-800",
              tabLayout === "vertical" ? "space-y-0.5 border-b p-1" : "flex gap-1 border-b p-2",
            )}
          >
            {state.modules.map((moduleId) => {
              const moduleDef = modules[moduleId];
              if (!moduleDef) {
                return null;
              }
              return (
                <SortableModuleTab
                  key={moduleId}
                  sortableId={moduleId}
                  moduleDef={moduleDef}
                  active={activeModule === moduleId}
                  layout={tabLayout}
                  onSelect={() => selectModule(moduleId)}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <div
        key={`${displayMode}-${String(activeModule)}`}
        className="flex min-h-0 flex-1 flex-col overflow-hidden lh-workbench-module-fade"
      >
        {activeDef ? activeDef.renderBody(context, displayMode) : null}
      </div>
    </div>
  );
}
