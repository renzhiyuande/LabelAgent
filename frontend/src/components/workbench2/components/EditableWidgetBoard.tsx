import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS, type Transform } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ResizableWidgetSplit } from "./ResizableWidgetSplit";
import { WidgetGroupShell } from "./WidgetGroupShell";
import { WidgetGroupChildrenLayout } from "./WidgetGroupChildrenLayout";
import { isWidgetGroupEntry, parseWidgetGroupEntry, type WidgetBoardGroup } from "../utils/widget-board-groups";
import { WIDGET_GROUP_CHILD_SORT_TYPE } from "./WidgetGroupChildSortable";

export type WidgetViewMode = "inline" | "cards" | "json";
export type WidgetLayoutMode = "stack" | "row" | "tabs";

export interface EditableWidgetItem {
  id: string;
  title: string;
  subtitle?: string;
  body?: ReactNode;
  headerActions?: ReactNode;
  json?: unknown;
  className?: string;
  defaultViewMode?: WidgetViewMode;
  /** 为 false 时不显示视图切换，固定用 defaultViewMode */
  viewModeConfigurable?: boolean;
  /** 默认 true；操作条等小组件可设为 false */
  fillHeight?: boolean;
}

interface WidgetShellProps {
  item: EditableWidgetItem;
  editing: boolean;
  mode: WidgetViewMode;
  tabLayout?: boolean;
  fillHeight?: boolean;
  className?: string;
  boardDrag?: boolean;
  onRemoveWidget?: (widgetId: string) => void;
  setNodeRef: (node: HTMLElement | null) => void;
  transform: Transform | null;
  transition?: string;
  isDragging: boolean;
  dragActivatorProps?: Record<string, unknown>;
  widgetMergeModifier?: boolean;
}

function WidgetShell({
  item,
  editing,
  mode,
  tabLayout = false,
  fillHeight = false,
  className,
  boardDrag = false,
  onRemoveWidget,
  setNodeRef,
  transform,
  transition,
  isDragging,
  dragActivatorProps,
  widgetMergeModifier = false,
}: WidgetShellProps) {
  const mergeDrop = useDroppable({
    id: `widget-merge-${item.id}`,
    disabled: !editing || !boardDrag || isWidgetGroupEntry(item.id),
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col overflow-hidden",
        fillHeight ? "h-full min-h-0" : "min-h-0",
        isDragging && "pointer-events-none z-50 opacity-60 ring-2 ring-primary/30 dark:ring-primary/40",
        item.className,
        className,
      )}
      style={{
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        transition,
      }}
    >
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          fillHeight && "h-full",
          mode === "inline" && !fillHeight && "flex-row items-start gap-3",
        )}
      >
        {editing && !boardDrag ? (
          <button
            type="button"
            className="relative z-40 mt-2 flex shrink-0 cursor-grab items-center rounded-full p-1 text-slate-400 active:cursor-grabbing"
            aria-label={`拖动组件 ${item.title}`}
            {...dragActivatorProps}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : null}
        <div
          ref={boardDrag && !isWidgetGroupEntry(item.id) ? mergeDrop.setNodeRef : undefined}
          className={cn(
            "relative flex min-h-0 min-w-0 flex-1 flex-col",
            widgetMergeModifier &&
              boardDrag &&
              !isWidgetGroupEntry(item.id) &&
              mergeDrop.isOver &&
              "rounded-lg ring-2 ring-primary/40 ring-inset",
          )}
        >
          {editing && (item.headerActions || (!tabLayout && (item.title || item.subtitle)) || boardDrag || onRemoveWidget) ? (
            <div
              className={cn(
                "flex shrink-0 items-center justify-between gap-2",
                boardDrag ? "touch-none cursor-grab active:cursor-grabbing" : "flex-wrap px-0 py-2",
              )}
              aria-label={boardDrag ? `拖动组件 ${item.title}` : undefined}
              {...(boardDrag ? dragActivatorProps : {})}
            >
              <div className="flex min-w-0 flex-1 items-center gap-1">
                {boardDrag ? <GripVertical className="ml-2 h-4 w-4 shrink-0 text-slate-400" /> : null}
                {tabLayout || !(item.title || item.subtitle) ? (
                  boardDrag ? null : <div className="min-w-0 flex-1" />
                ) : (
                  <div className={cn("min-w-0", boardDrag && "py-2 pr-2")}>
                    <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{item.title}</div>
                    {item.subtitle ? (
                      <div className="text-xs text-slate-500 dark:text-slate-400">{item.subtitle}</div>
                    ) : null}
                  </div>
                )}
              </div>
              {item.headerActions ? (
                <div className="flex items-center gap-1 px-2" onPointerDown={(e) => e.stopPropagation()}>
                  {item.headerActions}
                </div>
              ) : null}
              {editing && onRemoveWidget ? (
                <div className="px-1" onPointerDown={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                    aria-label={`移除组件 ${item.title}`}
                    onClick={() => onRemoveWidget(item.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          {mode === "json" && item.viewModeConfigurable !== false ? (
            <div
              className={cn(
                fillHeight ? "min-h-0 flex-1 overflow-hidden" : "shrink-0 overflow-y-auto overscroll-contain",
              )}
            >
              <pre className="h-full overflow-auto bg-slate-950 p-3 text-xs leading-6 text-emerald-300">
                {JSON.stringify(item.json ?? { id: item.id, title: item.title }, null, 2)}
              </pre>
            </div>
          ) : item.body ? (
            <div
              className={cn(
                fillHeight ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "shrink-0 overflow-y-auto overscroll-contain",
              )}
            >
              {item.body}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

interface SortableWidgetProps {
  item: EditableWidgetItem;
  editing: boolean;
  mode: WidgetViewMode;
  tabLayout?: boolean;
  fillHeight?: boolean;
  className?: string;
  useSharedDnd?: boolean;
  /** 组合内子组件：走组内 SortableContext，不参与看板级 useDraggable */
  useGroupChildSort?: boolean;
  widgetMergeModifier?: boolean;
  onRemoveWidget?: (widgetId: string) => void;
}

function BoardDraggableWidget(props: SortableWidgetProps) {
  const { item, editing } = props;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    disabled: !editing,
    data: { type: "workbench-widget-item", widgetId: item.id },
  });

  return (
    <WidgetShell
      {...props}
      boardDrag
      setNodeRef={setNodeRef}
      transform={transform}
      isDragging={isDragging}
      dragActivatorProps={{ ...attributes, ...listeners }}
    />
  );
}

function LocalSortableWidget(props: SortableWidgetProps) {
  const { item, editing } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !editing,
  });

  return (
    <WidgetShell
      {...props}
      setNodeRef={setNodeRef}
      transform={transform}
      transition={transition}
      isDragging={isDragging}
      dragActivatorProps={{ ...attributes, ...listeners }}
    />
  );
}

function GroupChildSortableWidget(props: SortableWidgetProps) {
  const { item, editing } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !editing,
    data: { type: WIDGET_GROUP_CHILD_SORT_TYPE },
  });

  return (
    <WidgetShell
      {...props}
      setNodeRef={setNodeRef}
      transform={transform}
      transition={transition}
      isDragging={isDragging}
      dragActivatorProps={{ ...attributes, ...listeners }}
    />
  );
}

function SortableWidget(props: SortableWidgetProps) {
  if (props.useGroupChildSort) {
    return <GroupChildSortableWidget {...props} />;
  }
  const useBoardDrag = Boolean(props.useSharedDnd && props.editing);
  if (useBoardDrag) {
    return <BoardDraggableWidget {...props} />;
  }
  return <LocalSortableWidget {...props} />;
}

export interface EditableWidgetBoardProps {
  items: EditableWidgetItem[];
  order: string[];
  widgetModes: Record<string, WidgetViewMode>;
  layout?: WidgetLayoutMode;
  editing: boolean;
  onOrderChange: (nextOrder: string[]) => void;
  activeTabId?: string;
  onActiveTabChange?: (tabId: string) => void;
  splitSizes?: number[];
  onSplitSizesChange?: (sizes: number[]) => void;
  /** 编辑模式下删除 widget */
  onRemoveWidget?: (widgetId: string) => void;
  /** 由外层 LabelerWidgetPlacementProvider 提供 DnD 时设为 true */
  useSharedDnd?: boolean;
  /** 拖拽中按住 Shift/Alt，用于合并落点高亮 */
  widgetMergeModifier?: boolean;
  /** board 内 widget 组合（与 order 中的 group: 前缀条目配合） */
  groups?: Record<string, WidgetBoardGroup>;
  onGroupLayoutChange?: (groupId: string, layout: WidgetLayoutMode) => void;
  onGroupSplitSizesChange?: (groupId: string, sizes: number[]) => void;
  onGroupWidgetIdsReorder?: (groupId: string, widgetIds: string[]) => void;
  onDissolveGroup?: (groupId: string) => void;
  /** 独立 widget tab：占满宿主区域，不套用 stack 的 max-height 限制 */
  singleWidgetHost?: boolean;
}

function resolveWidgetMode(item: EditableWidgetItem, widgetModes: Record<string, WidgetViewMode>): WidgetViewMode {
  return widgetModes[item.id] ?? item.defaultViewMode ?? "cards";
}

export function EditableWidgetBoard({
  items,
  order,
  widgetModes,
  layout = "stack",
  editing,
  onOrderChange,
  activeTabId,
  onActiveTabChange,
  splitSizes,
  onSplitSizesChange,
  onRemoveWidget,
  useSharedDnd = false,
  widgetMergeModifier = false,
  groups = {},
  onGroupLayoutChange,
  onGroupSplitSizesChange,
  onGroupWidgetIdsReorder,
  onDissolveGroup,
  singleWidgetHost = false,
}: EditableWidgetBoardProps) {
  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const boardEntries = useMemo(
    () =>
      order.filter((entryId) => {
        const groupId = parseWidgetGroupEntry(entryId);
        if (groupId) {
          return Boolean(groups[groupId]);
        }
        return itemsById.has(entryId);
      }),
    [groups, itemsById, order.join(",")],
  );

  const [internalActiveTab, setInternalActiveTab] = useState(boardEntries[0] ?? "");
  const resolvedActiveTab = activeTabId ?? internalActiveTab;
  const setActiveTab = onActiveTabChange ?? setInternalActiveTab;

  useEffect(() => {
    if (!boardEntries.includes(resolvedActiveTab)) {
      setActiveTab(boardEntries[0] ?? "");
    }
  }, [boardEntries.join(","), resolvedActiveTab, setActiveTab]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = boardEntries.indexOf(String(active.id));
    const newIndex = boardEntries.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }
    onOrderChange(arrayMove(boardEntries, oldIndex, newIndex));
  }

  const activeEntryId = boardEntries.includes(resolvedActiveTab) ? resolvedActiveTab : boardEntries[0];

  function renderSortablePane(
    item: EditableWidgetItem,
    options?: {
      tabLayout?: boolean;
      fillHeight?: boolean;
      className?: string;
      useGroupChildSort?: boolean;
    },
  ) {
    const resolvedFillHeight = options?.fillHeight ?? item.fillHeight ?? true;
    return (
      <SortableWidget
        item={item}
        editing={editing}
        mode={resolveWidgetMode(item, widgetModes)}
        tabLayout={options?.tabLayout}
        fillHeight={resolvedFillHeight}
        className={options?.className}
        useSharedDnd={useSharedDnd}
        useGroupChildSort={options?.useGroupChildSort}
        widgetMergeModifier={widgetMergeModifier}
        onRemoveWidget={onRemoveWidget}
      />
    );
  }

  function renderBoardEntry(entryId: string, options?: { fillHeight?: boolean; className?: string }) {
    const groupId = parseWidgetGroupEntry(entryId);
    if (groupId && groups[groupId]) {
      const group = groups[groupId];
      const syntheticItem: EditableWidgetItem = {
        id: entryId,
        title: "组合视图",
        fillHeight: true,
        json: { groupId, widgetIds: group.widgetIds },
        body: (
          <WidgetGroupShell
            group={group}
            editing={editing}
            onLayoutChange={(next) => onGroupLayoutChange?.(groupId, next)}
            onDissolve={() => onDissolveGroup?.(groupId)}
            className="h-full min-h-0"
          >
            <WidgetGroupChildrenLayout
              key={`${groupId}-${group.layout}`}
              group={group}
              childItems={group.widgetIds
                .map((widgetId) => itemsById.get(widgetId))
                .filter((item): item is EditableWidgetItem => item != null)}
              editing={editing}
              renderPane={(child) =>
                renderSortablePane(child, {
                  fillHeight: true,
                  useGroupChildSort: editing && Boolean(onGroupWidgetIdsReorder),
                })
              }
              onGroupSplitSizesChange={onGroupSplitSizesChange}
              onWidgetIdsReorder={
                onGroupWidgetIdsReorder
                  ? (widgetIds) => onGroupWidgetIdsReorder(groupId, widgetIds)
                  : undefined
              }
            />
          </WidgetGroupShell>
        ),
      };
      return renderSortablePane(syntheticItem, {
        fillHeight: options?.fillHeight ?? true,
        className: options?.className,
      });
    }

    const item = itemsById.get(entryId);
    if (!item) {
      return null;
    }
    return renderSortablePane(item, options);
  }

  function resolveEntryFillHeight(entryId: string): boolean {
    const groupId = parseWidgetGroupEntry(entryId);
    if (groupId && groups[groupId]) {
      return true;
    }
    const item = itemsById.get(entryId);
    return item?.fillHeight !== false;
  }

  function renderSplitLayout(direction: "horizontal" | "vertical", paneClassName?: string) {
    if (!splitSizes || !onSplitSizesChange) {
      return null;
    }
    const paneFillHeights = boardEntries.map((entryId) => resolveEntryFillHeight(entryId));
    const paneAutoSizes =
      direction === "vertical" ? paneFillHeights.map((fillHeight) => !fillHeight) : undefined;
    return (
      <ResizableWidgetSplit
        paneIds={boardEntries}
        sizes={splitSizes}
        onSizesChange={onSplitSizesChange}
        direction={direction}
        resizeEnabled={!editing}
        paneAutoSizes={paneAutoSizes}
        className="h-full min-h-0 flex-1"
      >
        {(_, index) => {
          const entryId = boardEntries[index];
          if (!entryId) {
            return null;
          }
          return renderBoardEntry(entryId, {
            fillHeight: paneFillHeights[index],
            className: paneClassName,
          });
        }}
      </ResizableWidgetSplit>
    );
  }

  function entryTabLabel(entryId: string): string {
    const groupId = parseWidgetGroupEntry(entryId);
    if (groupId) {
      return "组合视图";
    }
    return itemsById.get(entryId)?.title ?? entryId;
  }

  const boardLayout = (
    <>
          {layout === "tabs" ? (
            <div className="flex h-full min-h-0 flex-1 flex-col gap-2">
              <div className="lh-scrollbar-none flex shrink-0 flex-wrap gap-1.5 border-b border-slate-200/80 pb-2 dark:border-slate-800">
                {boardEntries.map((entryId) => (
                  <Button
                    key={`${entryId}-tab`}
                    type="button"
                    size="sm"
                    variant={resolvedActiveTab === entryId ? "default" : "outline"}
                    className="h-8 max-w-full rounded-lg px-3"
                    onClick={() => setActiveTab(entryId)}
                  >
                    <span className="truncate">{entryTabLabel(entryId)}</span>
                  </Button>
                ))}
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                {activeEntryId ? renderBoardEntry(activeEntryId, { fillHeight: true }) : null}
              </div>
            </div>
          ) : layout === "row" ? (
            renderSplitLayout("horizontal") ?? (
              <div className="flex h-full min-h-0 flex-1 flex-row gap-2 overflow-hidden">
                {boardEntries.map((entryId) => renderBoardEntry(entryId, { fillHeight: true }))}
              </div>
            )
          ) : (
            <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
              {singleWidgetHost && boardEntries.length === 1 ? (
                renderBoardEntry(boardEntries[0], { fillHeight: true })
              ) : (
                renderSplitLayout("vertical") ?? (
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                    <div className="flex flex-col gap-2">
                      {boardEntries.map((entryId) =>
                        renderBoardEntry(entryId, {
                          fillHeight: true,
                          className: singleWidgetHost ? undefined : "max-h-[min(56vh,720px)]",
                        }),
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
    </>
  );

  const sortableBoard = useSharedDnd ? (
    boardLayout
  ) : (
    <SortableContext items={boardEntries} strategy={rectSortingStrategy}>
      {boardLayout}
    </SortableContext>
  );

  if (useSharedDnd) {
    return <div className="flex h-full min-h-0 flex-col">{sortableBoard}</div>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {sortableBoard}
      </DndContext>
    </div>
  );
}
