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
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { WorkbenchLayoutConfig, WorkbenchLayoutSchema } from "./types";
import { PANEL_COLLAPSED_WIDTH } from "./utils/layout-normalize";
import {
  getPanelLabels,
  resolvePanelWidth,
  togglePanelCollapsed,
  updateLayoutSizes,
} from "./utils/layout-operations";
import { ResizeDivider } from "./ResizeDivider";
import { WorkbenchPanelShell } from "./WorkbenchPanelShell";

export interface WorkbenchPanelSlot {
  body: ReactNode;
  collapsedBody?: ReactNode;
}

export interface WorkbenchLayoutEngineProps<
  TPanelId extends string = string,
  TPreset extends string = string,
  TConfig extends WorkbenchLayoutConfig<TPanelId, TPreset> = WorkbenchLayoutConfig<TPanelId, TPreset>,
> {
  schema: WorkbenchLayoutSchema<TPanelId, TPreset>;
  config: TConfig;
  onConfigChange: (config: TConfig) => void;
  panels: Record<TPanelId, WorkbenchPanelSlot>;
  panelLabels?: Record<TPanelId, string>;
  panelReorder?: boolean;
}

function panelFlexStyle<TPanelId extends string, TPreset extends string>(
  schema: WorkbenchLayoutSchema<TPanelId, TPreset>,
  config: WorkbenchLayoutConfig<TPanelId, TPreset>,
  panelId: TPanelId,
): React.CSSProperties {
  const collapsed = config.panelCollapsed[panelId];
  if (collapsed) {
    return { width: PANEL_COLLAPSED_WIDTH, flexShrink: 0, flexGrow: 0 };
  }

  const panelDef = schema.panelDefinitions[panelId];
  if (panelDef?.flex) {
    return { flex: "1 1 0", minWidth: 0, width: 0 };
  }

  if (panelId === schema.leadingPanelId) {
    return { width: config.sizes.leadingWidth, flexShrink: 0, flexGrow: 0 };
  }
  if (panelId === schema.trailingPanelId) {
    return { width: config.sizes.trailingWidth, flexShrink: 0, flexGrow: 0 };
  }
  return { flex: "1 1 0", minWidth: 0, width: 0 };
}

function dividerResizeHandler<
  TPanelId extends string,
  TPreset extends string,
  TConfig extends WorkbenchLayoutConfig<TPanelId, TPreset>,
>(
  schema: WorkbenchLayoutSchema<TPanelId, TPreset>,
  leftPanel: TPanelId,
  rightPanel: TPanelId,
  getConfig: () => TConfig,
  onConfigChange: (config: TConfig) => void,
): ((delta: number) => void) | null {
  const config = getConfig();
  if (config.panelCollapsed[leftPanel] || config.panelCollapsed[rightPanel]) {
    return null;
  }

  if (leftPanel === schema.leadingPanelId && rightPanel !== schema.leadingPanelId) {
    return (delta) => {
      const current = getConfig();
      onConfigChange(updateLayoutSizes(schema, current, { leadingWidth: current.sizes.leadingWidth + delta }));
    };
  }
  if (rightPanel === schema.leadingPanelId && leftPanel !== schema.leadingPanelId) {
    return (delta) => {
      const current = getConfig();
      onConfigChange(updateLayoutSizes(schema, current, { leadingWidth: current.sizes.leadingWidth - delta }));
    };
  }
  if (leftPanel === schema.trailingPanelId && rightPanel !== schema.trailingPanelId) {
    return (delta) => {
      const current = getConfig();
      onConfigChange(updateLayoutSizes(schema, current, { trailingWidth: current.sizes.trailingWidth + delta }));
    };
  }
  if (rightPanel === schema.trailingPanelId && leftPanel !== schema.trailingPanelId) {
    return (delta) => {
      const current = getConfig();
      onConfigChange(updateLayoutSizes(schema, current, { trailingWidth: current.sizes.trailingWidth - delta }));
    };
  }
  return null;
}

interface SortablePanelColumnProps<
  TPanelId extends string,
  TPreset extends string,
  TConfig extends WorkbenchLayoutConfig<TPanelId, TPreset>,
> {
  schema: WorkbenchLayoutSchema<TPanelId, TPreset>;
  panelId: TPanelId;
  label: string;
  config: TConfig;
  onConfigChange: (config: TConfig) => void;
  slot: WorkbenchPanelSlot;
  bordered?: boolean;
  panelReorder?: boolean;
}

/** panelReorder=false 时使用，避免内层 DndContext 抢占业务侧拖拽（如模板设计器物料→画布） */
function StaticPanelColumn<
  TPanelId extends string,
  TPreset extends string,
  TConfig extends WorkbenchLayoutConfig<TPanelId, TPreset>,
>({
  schema,
  panelId,
  label,
  config,
  onConfigChange,
  slot,
  bordered,
}: Omit<SortablePanelColumnProps<TPanelId, TPreset, TConfig>, "panelReorder">) {
  const collapsed = config.panelCollapsed[panelId];

  return (
    <WorkbenchPanelShell
      panelId={panelId}
      label={label}
      collapsed={collapsed}
      dragStyle={panelFlexStyle(schema, config, panelId)}
      bordered={bordered}
      reorderEnabled={false}
      onToggleCollapse={() => onConfigChange(togglePanelCollapsed(config, panelId))}
      collapsedContent={slot.collapsedBody}
    >
      {slot.body}
    </WorkbenchPanelShell>
  );
}

function SortablePanelColumn<
  TPanelId extends string,
  TPreset extends string,
  TConfig extends WorkbenchLayoutConfig<TPanelId, TPreset>,
>({
  schema,
  panelId,
  label,
  config,
  onConfigChange,
  slot,
  bordered,
  panelReorder = true,
}: SortablePanelColumnProps<TPanelId, TPreset, TConfig>) {
  const collapsed = config.panelCollapsed[panelId];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: panelId,
    disabled: !panelReorder,
  });

  const dragStyle: React.CSSProperties = {
    ...panelFlexStyle(schema, config, panelId),
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    transition: isDragging ? transition : undefined,
  };

  return (
    <WorkbenchPanelShell
      panelId={panelId}
      label={label}
      collapsed={collapsed}
      isDragging={isDragging}
      dragAttributes={attributes}
      dragListeners={listeners}
      setNodeRef={setNodeRef}
      dragStyle={dragStyle}
      bordered={bordered}
      reorderEnabled={panelReorder}
      onToggleCollapse={() => onConfigChange(togglePanelCollapsed(config, panelId))}
      collapsedContent={slot.collapsedBody}
    >
      {slot.body}
    </WorkbenchPanelShell>
  );
}

export function WorkbenchLayoutEngine<
  TPanelId extends string,
  TPreset extends string,
  TConfig extends WorkbenchLayoutConfig<TPanelId, TPreset> = WorkbenchLayoutConfig<TPanelId, TPreset>,
>({
  schema,
  config,
  onConfigChange,
  panels,
  panelLabels: panelLabelsProp,
  panelReorder = schema.features.panelReorder,
}: WorkbenchLayoutEngineProps<TPanelId, TPreset, TConfig>) {
  const panelLabels = panelLabelsProp ?? getPanelLabels(schema);
  const { preset, panelOrder, sizes } = config;
  const configRef = useRef(config);
  configRef.current = config;

  const getConfig = useCallback(() => configRef.current, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handlePanelDragEnd(event: DragEndEvent) {
    if (!panelReorder || preset === "stacked") {
      return;
    }
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const oldIndex = panelOrder.indexOf(active.id as TPanelId);
    const newIndex = panelOrder.indexOf(over.id as TPanelId);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }
    onConfigChange({
      ...config,
      panelOrder: arrayMove(panelOrder, oldIndex, newIndex),
    });
  }

  const mainStackRef = useRef<HTMLDivElement>(null);
  const [stackedMainHeight, setStackedMainHeight] = useState(600);

  useEffect(() => {
    if (preset !== "stacked") {
      return;
    }
    const element = mainStackRef.current;
    if (!element) {
      return;
    }
    const syncHeight = () => {
      const height = element.clientHeight;
      if (height > 0) {
        setStackedMainHeight(height);
      }
    };
    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, [preset]);

  const resizeStackedPrimary = useCallback(
    (delta: number) => {
      const height = stackedMainHeight > 0 ? stackedMainHeight : 600;
      const percentDelta = (delta / height) * 100;
      const current = configRef.current;
      onConfigChange(
        updateLayoutSizes(schema, current, {
          stackedPrimaryPercent: current.sizes.stackedPrimaryPercent + percentDelta,
        }),
      );
    },
    [onConfigChange, schema, stackedMainHeight],
  );

  const renderBareHorizontalPanels = () => {
    const children: ReactNode[] = [];
    for (let index = 0; index < panelOrder.length; index += 1) {
      const panelId = panelOrder[index];
      children.push(
        <div
          key={panelId}
          data-panel-id={panelId}
          style={panelFlexStyle(schema, config, panelId)}
          className="h-full min-h-0 overflow-hidden"
        >
          {panels[panelId].body}
        </div>,
      );

      if (index < panelOrder.length - 1) {
        const leftPanel = panelId;
        const rightPanel = panelOrder[index + 1];
        const onDrag = dividerResizeHandler(schema, leftPanel, rightPanel, getConfig, onConfigChange);
        children.push(
          onDrag ? (
            <ResizeDivider key={`divider-${String(leftPanel)}-${String(rightPanel)}`} orientation="vertical" onDrag={onDrag} />
          ) : (
            <div key={`gap-${String(leftPanel)}-${String(rightPanel)}`} className="w-1.5 shrink-0" />
          ),
        );
      }
    }
    return children;
  };

  const renderHorizontalPanels = () => {
    const PanelColumn = panelReorder ? SortablePanelColumn : StaticPanelColumn;
    const children: ReactNode[] = [];
    for (let index = 0; index < panelOrder.length; index += 1) {
      const panelId = panelOrder[index];
      children.push(
        <PanelColumn
          key={panelId}
          schema={schema}
          panelId={panelId}
          label={panelLabels[panelId]}
          config={config}
          onConfigChange={onConfigChange}
          slot={panels[panelId]}
          bordered={panelId === schema.primaryPanelId && index > 0 && index < panelOrder.length - 1}
          {...(panelReorder ? { panelReorder: true as const } : {})}
        />,
      );

      if (index < panelOrder.length - 1) {
        const leftPanel = panelId;
        const rightPanel = panelOrder[index + 1];
        const onDrag = dividerResizeHandler(schema, leftPanel, rightPanel, getConfig, onConfigChange);
        children.push(
          onDrag ? (
            <ResizeDivider key={`divider-${String(leftPanel)}-${String(rightPanel)}`} orientation="vertical" onDrag={onDrag} />
          ) : (
            <div key={`gap-${String(leftPanel)}-${String(rightPanel)}`} className="w-1.5 shrink-0" />
          ),
        );
      }
    }
    return children;
  };

  const primaryPanel = panels[schema.primaryPanelId];
  const trailingPanel = panels[schema.trailingPanelId];
  const horizontalRowClass = schema.features.responsiveStack
    ? "hidden min-h-0 flex-1 flex-row overflow-hidden lg:flex"
    : "flex min-h-0 flex-1 flex-row overflow-hidden";

  if (preset === "stacked") {
    const leadingWidth = resolvePanelWidth(schema, config, schema.leadingPanelId);
    const leadingCollapsed = config.panelCollapsed[schema.leadingPanelId];
    const leadingPanel = panels[schema.leadingPanelId];

    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="hidden min-h-0 flex-1 lg:flex" style={{ width: "100%" }}>
          <div style={{ width: leadingWidth, flexShrink: 0 }} className="lh-workbench-panel h-full min-h-0">
            <WorkbenchPanelShell
              panelId={schema.leadingPanelId}
              label={panelLabels[schema.leadingPanelId]}
              collapsed={leadingCollapsed}
              reorderEnabled={false}
              onToggleCollapse={() => onConfigChange(togglePanelCollapsed(config, schema.leadingPanelId))}
              collapsedContent={leadingPanel.collapsedBody}
            >
              {leadingPanel.body}
            </WorkbenchPanelShell>
          </div>

          <div
            ref={mainStackRef}
            className="grid h-full min-h-0 min-w-0 flex-1 overflow-hidden"
            data-workbench-main-stack
            style={{ gridTemplateRows: `${sizes.stackedPrimaryPercent}% auto ${100 - sizes.stackedPrimaryPercent}%` }}
          >
            <div className="min-h-0 overflow-hidden border-x border-slate-200/70 dark:border-slate-800">
              <WorkbenchPanelShell
                panelId={schema.primaryPanelId}
                label={panelLabels[schema.primaryPanelId]}
                collapsed={config.panelCollapsed[schema.primaryPanelId]}
                collapseEnabled={false}
                reorderEnabled={false}
                onToggleCollapse={() => onConfigChange(togglePanelCollapsed(config, schema.primaryPanelId))}
                collapsedContent={primaryPanel.collapsedBody}
              >
                {primaryPanel.body}
              </WorkbenchPanelShell>
            </div>
            <ResizeDivider orientation="horizontal" onDrag={resizeStackedPrimary} />
            <div className="min-h-0 overflow-hidden">
              <WorkbenchPanelShell
                panelId={schema.trailingPanelId}
                label={panelLabels[schema.trailingPanelId]}
                collapsed={config.panelCollapsed[schema.trailingPanelId]}
                collapseEnabled={false}
                reorderEnabled={false}
                onToggleCollapse={() => onConfigChange(togglePanelCollapsed(config, schema.trailingPanelId))}
                collapsedContent={trailingPanel.collapsedBody}
              >
                {trailingPanel.body}
              </WorkbenchPanelShell>
            </div>
          </div>
        </div>

        {schema.features.responsiveStack ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:hidden">
            <div className="h-0 flex-1 min-h-0 overflow-hidden">{primaryPanel.body}</div>
            <div className="h-0 flex-1 min-h-0 overflow-hidden border-t border-slate-200/70 dark:border-slate-800">
              {trailingPanel.body}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (!schema.features.panelChrome) {
    return <div className={horizontalRowClass}>{renderBareHorizontalPanels()}</div>;
  }

  const chromeHorizontalPanels = <div className={horizontalRowClass}>{renderHorizontalPanels()}</div>;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {panelReorder ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePanelDragEnd}>
          <SortableContext items={panelOrder} strategy={horizontalListSortingStrategy}>
            {chromeHorizontalPanels}
          </SortableContext>
        </DndContext>
      ) : (
        chromeHorizontalPanels
      )}

      {schema.features.responsiveStack ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:hidden">
          <div className="h-0 flex-1 min-h-0 overflow-hidden">{primaryPanel.body}</div>
          <div className="h-0 flex-1 min-h-0 overflow-hidden border-t border-slate-200/70 dark:border-slate-800">
            {trailingPanel.body}
          </div>
        </div>
      ) : null}
    </div>
  );
}
