import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { WorkbenchTabItem } from "./WorkbenchTabItem";
import { buildWorkbenchRenderContext } from "../hooks/use-workbench-render-context";
import type {
  WorkbenchChrome,
  WorkbenchGlobalDragState,
  WorkbenchRegionId,
  WorkbenchRegionState,
  WorkbenchSlotProvider,
  WorkbenchTabItem as WorkbenchTabItemModel,
} from "../types";

interface WorkbenchTabContainerProps<TBusinessContext> {
  regionId: WorkbenchRegionId;
  region: WorkbenchRegionState;
  tabs: WorkbenchTabItemModel[];
  activeTabId: string | null;
  businessContext: TBusinessContext;
  providers: Record<string, WorkbenchSlotProvider<TBusinessContext>>;
  dragState: WorkbenchGlobalDragState;
  editing?: boolean;
  onActivateTab: (tabId: string) => void;
  chrome?: WorkbenchChrome;
  /** flush 三栏顶栏：嵌入统一 h-10 头，不再单独画 border-b */
  flushInRegionHeader?: boolean;
  className?: string;
  emptyState?: ReactNode;
}

export function WorkbenchTabContainer<TBusinessContext>({
  regionId,
  region,
  tabs,
  activeTabId,
  businessContext,
  providers,
  dragState,
  editing = false,
  onActivateTab,
  chrome = "default",
  flushInRegionHeader = false,
  className,
  emptyState,
}: WorkbenchTabContainerProps<TBusinessContext>) {
  const flush = chrome === "flush";
  const flushBodyTabs = flush && regionId !== "top";
  const [openTopPopoverTabId, setOpenTopPopoverTabId] = useState<string | null>(null);
  const { isOver, setNodeRef } = useDroppable({
    id: `dropzone-${regionId}`,
    data: {
      type: "workbench-tab-container",
      regionId,
    },
  });
  const collapsedRail = region.collapsed && regionId !== "top";
  const isSideRegion = regionId === "left" || regionId === "right";
  const isRightRail = collapsedRail && regionId === "right";
  const flushSideTabs = flushBodyTabs && isSideRegion;
  const topPopoverMode = regionId === "top" && !editing;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        flushBodyTabs
          ? cn(
              "relative min-h-0 border-0 bg-transparent py-0",
              flushInRegionHeader
                ? "flex h-full min-w-0 flex-1 items-center px-1.5"
                : cn("shrink-0 px-2", !collapsedRail && "border-b border-border/80"),
            )
          : "relative min-h-[2.75rem] rounded-[18px] border border-border/70 bg-muted/80 p-1.5 transition-all duration-200 ease-out",
        collapsedRail &&
          (flushBodyTabs
            ? "w-full min-w-0 max-w-full overflow-hidden border-0 bg-transparent px-1 py-0.5"
            : "w-fit min-w-0 max-w-full overflow-hidden rounded-[20px] border-border/70 bg-muted/90 p-1.5 shadow-none"),
        !collapsedRail && flushSideTabs && "w-full",
        className,
      )}
    >
      <SortableContext
        items={tabs.map((tab) => tab.id)}
        strategy={horizontalListSortingStrategy}
      >
        <div
          className={cn(
            "lh-scrollbar-none flex flex-nowrap gap-1.5 overflow-x-auto overflow-y-hidden",
            !flushBodyTabs && "transition-all duration-200 ease-out",
            flushInRegionHeader ? "h-full items-center pb-0" : "pb-0.5",
            collapsedRail &&
              "flex-col overflow-x-hidden overflow-y-auto pb-0",
            collapsedRail && flushBodyTabs && "items-center",
            collapsedRail && !flushBodyTabs && isRightRail && "items-end",
            !collapsedRail &&
              flushSideTabs &&
              (regionId === "right" ? "justify-end" : regionId === "left" ? "justify-start" : "justify-center"),
          )}
        >
          {tabs.map((tab) => {
            const provider = providers[tab.slotId];
            if (!provider) {
              return null;
            }
            const env = buildWorkbenchRenderContext({
              regionId,
              region,
              tabId: tab.id,
              isActive: tab.id === activeTabId,
            });
            const customLabel = regionId === "top"
              ? provider.renderTopTab?.(businessContext, env) ?? provider.renderTabCustom?.(businessContext, env)
              : provider.renderBodyTab?.(businessContext, env) ?? provider.renderTabCustom?.(businessContext, env);
            const tabNode = (
              <WorkbenchTabItem
                key={tab.id}
                tab={tab}
                regionId={regionId}
                active={tab.id === activeTabId}
                editing={editing}
                iconOnly={collapsedRail}
                compact={flushInRegionHeader && !collapsedRail}
                provider={provider}
                businessContext={businessContext}
                badge={provider.renderTabBadge?.(businessContext, env)}
                customLabel={customLabel}
                onActivate={onActivateTab}
                dragState={dragState}
                onClick={
                  topPopoverMode
                    ? () => {
                        setOpenTopPopoverTabId((current) => (current === tab.id ? null : tab.id));
                      }
                    : undefined
                }
              />
            );

            if (topPopoverMode) {
              return (
                <Popover
                  key={tab.id}
                  open={openTopPopoverTabId === tab.id}
                  onOpenChange={(open) => {
                    setOpenTopPopoverTabId(open ? tab.id : null);
                  }}
                >
                  <PopoverTrigger asChild>{tabNode}</PopoverTrigger>
                  <PopoverContent
                    align="start"
                    sideOffset={10}
                    className="w-96 max-h-[min(85vh,720px)] overflow-hidden rounded-[24px] p-0"
                  >
                    <div className="max-h-[min(85vh,720px)] overflow-y-auto rounded-[24px] border-0 bg-popover/98 p-4 shadow-none">
                      {provider.renderPopover?.(businessContext, env) ?? provider.render(businessContext, env)}
                    </div>
                  </PopoverContent>
                </Popover>
              );
            }

            return tabNode;
          })}
          {tabs.length === 0 ? (
            <div className="flex h-9 min-w-[160px] items-center justify-center rounded-xl border border-dashed border-slate-300/80 px-2.5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              {emptyState ?? "拖一个标签到这里"}
            </div>
          ) : null}
        </div>
      </SortableContext>
      {isOver || dragState.currentHoverOverRegionId === regionId ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 border-2 border-primary/50 bg-primary/5",
            flushBodyTabs ? "rounded-none" : "rounded-[18px]",
          )}
        />
      ) : null}
    </div>
  );
}
