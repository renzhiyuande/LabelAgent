import { ChevronLeft, ChevronRight, ChevronsUpDown, PanelLeft, PanelRight, PanelsTopLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WorkbenchTabContainer } from "./WorkbenchTabContainer";
import { buildWorkbenchRenderContext } from "../hooks/use-workbench-render-context";
import type {
  WorkbenchChrome,
  WorkbenchGlobalDragState,
  WorkbenchRegionId,
  WorkbenchRegionState,
  WorkbenchSlotProvider,
  WorkbenchTabItem,
} from "../types";

function regionIcon(regionId: WorkbenchRegionId) {
  switch (regionId) {
    case "top":
      return PanelsTopLeft;
    case "left":
      return PanelLeft;
    case "right":
      return PanelRight;
    default:
      return ChevronsUpDown;
  }
}

interface WorkbenchRegionProps<TBusinessContext> {
  regionId: WorkbenchRegionId;
  label: string;
  region: WorkbenchRegionState;
  tabs: WorkbenchTabItem[];
  providers: Record<string, WorkbenchSlotProvider<TBusinessContext>>;
  businessContext: TBusinessContext;
  dragState: WorkbenchGlobalDragState;
  editing?: boolean;
  onActivateTab: (tabId: string) => void;
  onToggleCollapsed?: () => void;
  actions?: ReactNode;
  className?: string;
  chrome?: WorkbenchChrome;
  topBarRenderer?: (params: {
    regionId: "top";
    label: string;
    region: WorkbenchRegionState;
    tabs: WorkbenchTabItem[];
    activeTab: WorkbenchTabItem | null;
    businessContext: TBusinessContext;
    editing: boolean;
    tabContainer: ReactNode;
    actions?: ReactNode;
  }) => ReactNode;
}

export function WorkbenchRegion<TBusinessContext>({
  regionId,
  label,
  region,
  tabs,
  providers,
  businessContext,
  dragState,
  editing = false,
  onActivateTab,
  onToggleCollapsed,
  actions,
  className,
  chrome = "default",
  topBarRenderer,
}: WorkbenchRegionProps<TBusinessContext>) {
  const flush = chrome === "flush";
  const canToggleFromIcon = Boolean(onToggleCollapsed && (regionId === "left" || regionId === "right"));
  const activeTab = tabs.find((tab) => tab.id === region.activeTabId) ?? tabs[0] ?? null;
  const provider = activeTab ? providers[activeTab.slotId] : null;
  const env = activeTab
    ? buildWorkbenchRenderContext({
        regionId,
        region,
        tabId: activeTab.id,
        isActive: true,
      })
    : null;
  const Icon = regionIcon(regionId);
  const mirrorRightHeader = regionId === "right";
  const toggleIconRotationClass = region.collapsed && (regionId === "left" || regionId === "right")
    ? "rotate-180"
    : "";
  const presentation = provider && env
    ? provider.getPresentation?.(businessContext, env)
      ?? (region.collapsed ? "collapsed" : env.placementMode === "left-narrow" || env.placementMode === "right-narrow" ? "narrow" : "default")
    : "default";

  function renderTabPanel(tab: WorkbenchTabItem, panelActive: boolean) {
    const tabProvider = providers[tab.slotId];
    if (!tabProvider) {
      return null;
    }
    const tabEnv = buildWorkbenchRenderContext({
      regionId,
      region,
      tabId: tab.id,
      isActive: panelActive,
    });
    const tabPresentation =
      tabProvider.getPresentation?.(businessContext, tabEnv) ??
      (region.collapsed
        ? "collapsed"
        : tabEnv.placementMode === "left-narrow" || tabEnv.placementMode === "right-narrow"
          ? "narrow"
          : "default");
    if (tabPresentation === "narrow" && tabProvider.renderNarrow) {
      return tabProvider.renderNarrow(businessContext, tabEnv);
    }
    if (tabPresentation === "collapsed" && tabProvider.renderCollapsed) {
      return tabProvider.renderCollapsed(businessContext, tabEnv);
    }
    return tabProvider.render(businessContext, tabEnv);
  }

  const emptyPanel = (
    <div className="flex h-full min-h-[140px] items-center justify-center px-3 text-sm text-muted-foreground">
      当前区域还没有内容
    </div>
  );

  const keepTabPanelsMounted = flush && !editing && regionId !== "top" && tabs.length > 1;

  const content = keepTabPanelsMounted ? (
    tabs.map((tab) => {
      const panelActive = tab.id === activeTab?.id;
      return (
        <div key={tab.id} className={cn("h-full min-h-0", !panelActive && "hidden")} aria-hidden={!panelActive}>
          {renderTabPanel(tab, panelActive) ?? (panelActive ? emptyPanel : null)}
        </div>
      );
    })
  ) : activeTab && provider && env ? (
    presentation === "narrow" && provider.renderNarrow
      ? provider.renderNarrow(businessContext, env)
      : presentation === "collapsed" && provider.renderCollapsed
        ? provider.renderCollapsed(businessContext, env)
        : provider.render(businessContext, env)
  ) : (
    emptyPanel
  );

  const flushBodyRegionHeader = flush && regionId !== "top";
  const showFlushSideToggle = flush && canToggleFromIcon;
  const hideTabsInFlushHeader = flushBodyRegionHeader && region.collapsed && showFlushSideToggle;

  const tabContainer = (
    <WorkbenchTabContainer
      regionId={regionId}
      region={region}
      tabs={tabs}
      activeTabId={activeTab?.id ?? null}
      businessContext={businessContext}
      providers={providers}
      dragState={dragState}
      editing={editing}
      onActivateTab={onActivateTab}
      chrome={chrome}
      flushInRegionHeader={flushBodyRegionHeader}
      className={
        regionId === "top"
          ? undefined
          : flushBodyRegionHeader
            ? undefined
            : cn("shrink-0", region.collapsed && "min-h-0")
      }
    />
  );

  const showBodyRegionChrome = regionId !== "top" && (!flush || editing);
  const isTopBarLayout = regionId === "top" && Boolean(topBarRenderer);
  const isFramedRegion =
    regionId === "top" ||
    regionId === "left" ||
    regionId === "center" ||
    regionId === "right";

  const topBarContent = regionId === "top" && topBarRenderer
    ? topBarRenderer({
        regionId: "top",
        label,
        region,
        tabs,
        activeTab,
        businessContext,
        editing,
        tabContainer,
        actions,
      })
    : null;

  const hideBodyContent = region.collapsed && regionId !== "top" && editing;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col",
        flush ? "transition-none" : "transition-all duration-300 ease-out",
        isFramedRegion &&
          !flush &&
          "rounded-[16px] border border-border/65 bg-background/86 dark:bg-card/80",
        isFramedRegion &&
          flush &&
          "rounded-none border-0 bg-background dark:bg-card",
        flush && regionId === "top" && "border-b border-border/80",
        flush && regionId === "left" && "border-r border-border/80",
        flush && regionId === "right" && "border-l border-border/80",
        className,
      )}
    >
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          flush ? "transition-none" : "transition-all duration-300 ease-out",
          isTopBarLayout
            ? flush
              ? "gap-0 px-2 py-0.5 md:px-2"
              : "gap-0 px-2 py-1 md:px-2.5 md:py-1"
            : flush
              ? "gap-0 p-0"
              : "gap-2 p-2 md:p-2.5",
        )}
      >
        {isTopBarLayout ? (
          topBarContent
        ) : (
          <>
            {showBodyRegionChrome ? (
              <div className={cn("flex items-center justify-between gap-2", mirrorRightHeader && "flex-row-reverse")}>
                <div className={cn("flex min-w-0 items-center gap-1.5", mirrorRightHeader && "flex-row-reverse")}>
                  {canToggleFromIcon ? (
                    <button
                      type="button"
                      onClick={onToggleCollapsed}
                      aria-label={region.collapsed ? `展开${label}` : `收起${label}`}
                      className={cn(
                        "shrink-0 rounded-xl bg-primary/10 p-1.5 text-primary transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-primary/15 dark:bg-primary/15 dark:text-primary/80 dark:hover:bg-primary/25",
                        region.collapsed && "scale-95",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 transition-transform duration-300 ease-out", toggleIconRotationClass)} />
                    </button>
                  ) : (
                    <div className="shrink-0 rounded-xl bg-primary/10 p-1.5 text-primary dark:bg-primary/15 dark:text-primary/80">
                      <Icon className="h-4 w-4" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "truncate font-semibold text-slate-900 dark:text-slate-100",
                      region.collapsed ? "max-w-[3rem] text-[10px] leading-tight" : "text-sm",
                    )}
                  >
                    {label}
                  </div>
                </div>
                <div className={cn("flex shrink-0 items-center gap-2", mirrorRightHeader && "flex-row-reverse")}>
                  {editing ? actions : null}
                  {onToggleCollapsed && !canToggleFromIcon ? (
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleCollapsed}>
                      {regionId === "left" ? (
                        region.collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />
                      ) : regionId === "right" ? (
                        region.collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronsUpDown className="h-4 w-4" />
                      )}
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
            {flushBodyRegionHeader ? (
              <div
                className={cn(
                  "flex h-9 shrink-0 items-center border-b border-border/80",
                  mirrorRightHeader && "flex-row-reverse",
                )}
              >
                {showFlushSideToggle ? (
                  <div
                    className={cn(
                      "flex h-full shrink-0 items-center",
                      region.collapsed ? "w-full justify-center" : "px-1",
                    )}
                  >
                    <button
                      type="button"
                      onClick={onToggleCollapsed}
                      aria-label={region.collapsed ? `展开${label}` : `收起${label}`}
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Icon className={cn("h-4 w-4", toggleIconRotationClass)} />
                    </button>
                  </div>
                ) : null}
                {!hideTabsInFlushHeader ? (
                  <div className="flex h-full min-h-0 min-w-0 flex-1 items-center overflow-hidden">
                    {tabContainer}
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                {showFlushSideToggle ? (
                  <div
                    className={cn(
                      "flex shrink-0 items-center border-b border-border/80 py-1",
                      region.collapsed ? "justify-center" : "justify-between px-2",
                      mirrorRightHeader && !region.collapsed && "flex-row-reverse",
                    )}
                  >
                    <button
                      type="button"
                      onClick={onToggleCollapsed}
                      aria-label={region.collapsed ? `展开${label}` : `收起${label}`}
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Icon className={cn("h-4 w-4", toggleIconRotationClass)} />
                    </button>
                  </div>
                ) : null}
                {tabContainer}
              </>
            )}
            {!hideBodyContent ? (
            <div
              className={cn(
                "min-h-0 flex-1 overflow-hidden",
                flush ? "transition-none" : "transition-all duration-300 ease-out",
                region.collapsed && (regionId === "left" || regionId === "right")
                  ? "flex w-full flex-col items-center"
                  : region.collapsed && regionId !== "top" && presentation === "default"
                    ? "flex items-start justify-center"
                    : "opacity-100",
              )}
            >
              {content}
            </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
