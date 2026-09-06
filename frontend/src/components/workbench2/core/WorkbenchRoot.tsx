import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { Sparkles } from "lucide-react";
import React, { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WorkbenchBodyRegion } from "./WorkbenchBodyRegion";
import { WorkbenchRegion } from "./WorkbenchRegion";
import { WorkbenchResizeHandle } from "./WorkbenchResizeHandle";
import { useWorkbenchGlobalLayout } from "../hooks/use-workbench-global-layout";
import { useWorkbenchResponsiveSideRegions } from "../hooks/use-workbench-responsive-side-regions";
import {
  WorkbenchDndProvider,
  useWorkbenchGlobalDrag,
  type UseWorkbenchGlobalDragOptions,
} from "../hooks/use-workbench-dnd";
import { useWorkbenchTabSelection } from "../hooks/use-workbench-tab-selection";
import type {
  WorkbenchGlobalLayoutState,
  WorkbenchRegionId,
  WorkbenchSlotProvider,
  WorkbenchTabItem,
  WorkbenchTopBarRenderParams,
  WorkbenchV2Schema,
} from "../types";

export interface WorkbenchRootProps<TBusinessContext> {
  schema: WorkbenchV2Schema;
  slotProviders: WorkbenchSlotProvider<TBusinessContext>[];
  initialTabs: WorkbenchTabItem[];
  businessContext: TBusinessContext;
  state?: WorkbenchGlobalLayoutState;
  onStateChange?: (state: WorkbenchGlobalLayoutState) => void;
  editing?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
  renderTopBar?: (params: WorkbenchTopBarRenderParams<TBusinessContext>) => ReactNode;
  widgetDrag?: UseWorkbenchGlobalDragOptions["widgetDrag"];
  /** @deprecated 使用 widgetDrag */
  labelerWidgetDrag?: UseWorkbenchGlobalDragOptions["widgetDrag"];
  widgetDragOverlay?: ReactNode;
  editSidebar?: ReactNode;
}

export function WorkbenchRoot<TBusinessContext>({
  schema,
  slotProviders,
  initialTabs,
  businessContext,
  state: controlledState,
  onStateChange,
  editing = false,
  header,
  footer,
  className,
  renderTopBar,
  widgetDrag,
  labelerWidgetDrag,
  widgetDragOverlay,
  editSidebar,
}: WorkbenchRootProps<TBusinessContext>) {
  const providers = Object.fromEntries(slotProviders.map((provider) => [provider.id, provider])) as Record<
    string,
    WorkbenchSlotProvider<TBusinessContext>
  >;
  const layout = useWorkbenchGlobalLayout({
    schema,
    initialTabs,
    controlledState,
    onStateChange,
  });
  const drag = useWorkbenchGlobalDrag({
    tabs: layout.state.tabs,
    onTabsChange: layout.setTabs,
    bodyRegionOrder: layout.state.bodyRegionOrder,
    onBodyRegionOrderChange: layout.setBodyRegionOrder,
    widgetDrag: widgetDrag ?? labelerWidgetDrag,
    labelerWidgetDrag,
  });

  const topSelection = useWorkbenchTabSelection(layout.state, "top");
  const leftSelection = useWorkbenchTabSelection(layout.state, "left");
  const centerSelection = useWorkbenchTabSelection(layout.state, "center");
  const rightSelection = useWorkbenchTabSelection(layout.state, "right");
  const overlayTab = layout.state.tabs.find((tab) => tab.id === drag.dragState.activeTabId) ?? null;
  const bodyRegionOrder = layout.state.bodyRegionOrder;
  const [isResizingBody, setIsResizingBody] = useState(false);
  const [isResizingTop, setIsResizingTop] = useState(false);

  const regionChrome = schema.chrome ?? "default";
  const flushChrome = regionChrome === "flush";

  const { toggleSideRegionCollapsed } = useWorkbenchResponsiveSideRegions({
    editing,
    regions: layout.state.regions,
    setRegionCollapsed: layout.setRegionCollapsed,
  });

  const renderOverlay = (
    <>
      {overlayTab ? (
        <div className="rounded-2xl border border-primary/30 bg-card/95 px-4 py-3 shadow-2xl dark:border-primary/40">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            正在移动：{overlayTab.label}
          </div>
        </div>
      ) : null}
      {widgetDragOverlay}
    </>
  );

  function handleBodyResize(leftRegionId: WorkbenchRegionId, rightRegionId: WorkbenchRegionId, delta: number) {
    const leftResizable = leftRegionId === "left" || leftRegionId === "right";
    const rightResizable = rightRegionId === "left" || rightRegionId === "right";

    if (leftResizable && rightResizable) {
      layout.adjustRegionSizes({
        [leftRegionId]: delta,
        [rightRegionId]: -delta,
      });
      return;
    }

    if (leftResizable) {
      layout.adjustRegionSizes({
        [leftRegionId]: delta,
      });
      return;
    }

    if (rightResizable) {
      layout.adjustRegionSizes({
        [rightRegionId]: -delta,
      });
    }
  }

  function renderBodyRegion(regionId: "left" | "center" | "right") {
    if (regionId === "left") {
      return (
        <WorkbenchBodyRegion
          key="left"
          regionId="left"
          editing={editing}
          width={layout.state.regions.left.collapsed ? 88 : layout.state.regions.left.size}
          className={cn(
            "workbench-side-region shrink-0",
            isResizingBody || flushChrome ? "transition-none" : "transition-[width] duration-300 ease-out",
          )}
        >
          <WorkbenchRegion
            chrome={regionChrome}
            regionId="left"
            label={schema.regions.left.label}
            region={layout.state.regions.left}
            tabs={leftSelection.tabs}
            providers={providers}
            businessContext={businessContext}
            dragState={drag.dragState}
            editing={editing}
            onActivateTab={(tabId) => layout.setActiveTab("left", tabId)}
            onToggleCollapsed={() => toggleSideRegionCollapsed("left")}
            actions={
              editing ? (
                <Button type="button" variant="ghost" size="sm" onClick={layout.resetLayout}>
                  重置
                </Button>
              ) : null
            }
          />
        </WorkbenchBodyRegion>
      );
    }

    if (regionId === "center") {
      return (
        <WorkbenchBodyRegion
          key="center"
          regionId="center"
          editing={editing}
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col",
            regionChrome === "flush" ? "gap-0" : "gap-2",
          )}
        >
          <div className="min-h-[320px] flex-1">
            <WorkbenchRegion
              chrome={regionChrome}
              regionId="center"
              label={schema.regions.center.label}
              region={layout.state.regions.center}
              tabs={centerSelection.tabs}
              providers={providers}
              businessContext={businessContext}
              dragState={drag.dragState}
              editing={editing}
              onActivateTab={(tabId) => layout.setActiveTab("center", tabId)}
            />
          </div>
        </WorkbenchBodyRegion>
      );
    }

    return (
      <WorkbenchBodyRegion
        key="right"
        regionId="right"
        editing={editing}
        width={layout.state.regions.right.collapsed ? 88 : layout.state.regions.right.size}
        className={cn(
          "workbench-side-region shrink-0",
          isResizingBody || flushChrome ? "transition-none" : "transition-[width] duration-300 ease-out",
        )}
      >
        <WorkbenchRegion
          chrome={regionChrome}
          regionId="right"
          label={schema.regions.right.label}
          region={layout.state.regions.right}
          tabs={rightSelection.tabs}
          providers={providers}
          businessContext={businessContext}
          dragState={drag.dragState}
          editing={editing}
          onActivateTab={(tabId) => layout.setActiveTab("right", tabId)}
          onToggleCollapsed={() => toggleSideRegionCollapsed("right")}
        />
      </WorkbenchBodyRegion>
    );
  }

  return (
    <WorkbenchDndProvider {...drag} overlay={renderOverlay}>
      <div className={cn("relative flex h-full min-h-0 flex-col gap-0", className)}>
        {header}
        <div className="flex shrink-0 flex-col">
          <div
            className={cn(
              "shrink-0 overflow-hidden",
              isResizingTop ? "transition-none" : "transition-[height] duration-300 ease-out",
            )}
            style={{
              height: layout.state.regions.top.size,
            }}
          >
            <WorkbenchRegion
              chrome={regionChrome}
              regionId="top"
              label={schema.regions.top.label}
              region={layout.state.regions.top}
              tabs={topSelection.tabs}
              providers={providers}
              businessContext={businessContext}
              dragState={drag.dragState}
              editing={editing}
              onActivateTab={(tabId) => layout.setActiveTab("top", tabId)}
              topBarRenderer={renderTopBar}
              className="h-full"
            />
          </div>
          {!editing ? (
            <WorkbenchResizeHandle
              orientation="horizontal"
              className="h-2 min-h-2"
              onDragStart={() => setIsResizingTop(true)}
              onDrag={(delta) => layout.adjustRegionSizes({ top: delta })}
              onDragEnd={() => setIsResizingTop(false)}
            />
          ) : null}
        </div>
        <SortableContext items={bodyRegionOrder} strategy={rectSortingStrategy}>
          <div className="flex min-h-0 min-w-0 flex-1 flex-row gap-0 overflow-hidden">
            {bodyRegionOrder.map((regionId, index) => (
              <React.Fragment key={regionId}>
                {renderBodyRegion(regionId)}
                {index < bodyRegionOrder.length - 1 && !editing ? (
                  <WorkbenchResizeHandle
                    orientation="vertical"
                    onDragStart={() => setIsResizingBody(true)}
                    onDrag={(delta) => handleBodyResize(regionId, bodyRegionOrder[index + 1], delta)}
                    onDragEnd={() => setIsResizingBody(false)}
                  />
                ) : null}
              </React.Fragment>
            ))}
          </div>
        </SortableContext>
        {footer}
        {editing ? editSidebar : null}
      </div>
    </WorkbenchDndProvider>
  );
}
