import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  StandardWorkbenchV2,
  createDefaultWorkbenchLayoutState,
  createWorkbenchEditLayoutSidebar,
  createWorkbenchLayoutBridge,
  loadWorkbenchLayoutState,
  moveTabToRegion,
  saveWorkbenchLayoutState,
  type WorkbenchGlobalLayoutState,
  type WorkbenchRegionId,
} from "@/components/workbench2";
import type { StandardWorkbenchV2Props } from "@/components/workbench2/extensions/StandardWorkbenchV2";
import { clearAiQueueWidgetBoardStorage, mergeAiQueueWidgetViewModes } from "./ai-queue-widget-board-storage";
import { useReviewRenderPrefs, type ReviewRenderPrefs } from "./review-render-prefs";
import { AI_QUEUE_WIDGET_DEFINITIONS, isAiQueueWidgetId } from "./ai-queue-widget-registry";
import {
  AiQueueWidgetPlacementProvider,
  clearAiQueueHiddenWidgetsStorage,
  useAiQueueWidgetDragHandlers,
  useAiQueueWidgetPlacement,
} from "./ai-queue-widget-placement-context";
import { resolveAllAvailableAiQueueWidgetIds } from "./panels/ai-queue/resolve-ai-queue-widgets";
import { createAiQueueSlotProviders } from "./layout/ai-queue-slot-providers";
import { createAiQueueTopBar } from "./layout/ai-queue-top-bar";
import { aiQueueWorkbench2Schema, aiQueueWorkbench2Tabs } from "./schema";
import type { AiQueueWorkbenchBusinessContext, AiQueueWorkbenchV2Props } from "./types";

export function AiQueueWorkbenchV2({
  rows,
  detail,
  currentId,
  statusFilter,
  focusMode,
  queueNav,
  queueLoading = false,
  detailLoading = false,
  statusCounts = {},
  queueStats = null,
  statsLoading = false,
  onStatusFilterChange,
  onSelectItem,
  onPrev,
  onNext,
  onToggleFocusMode,
  onRetryFailed,
}: AiQueueWorkbenchV2Props) {
  const navigate = useNavigate();
  const { prefs: renderPrefs, setPrefs: setRenderPrefs, resetRenderPrefs } = useReviewRenderPrefs("ai-queue");
  const [editMode, setEditMode] = useState(false);
  const [widgetPlacementKey, setWidgetPlacementKey] = useState(0);
  const [layoutState, setLayoutState] = useState<WorkbenchGlobalLayoutState>(() => {
    const fallback = createDefaultWorkbenchLayoutState(aiQueueWorkbench2Schema, aiQueueWorkbench2Tabs);
    return loadWorkbenchLayoutState(aiQueueWorkbench2Schema, fallback);
  });
  const layoutStateRef = useRef(layoutState);
  layoutStateRef.current = layoutState;

  const canGoPrev = Boolean(queueNav?.prevId);
  const canGoNext = Boolean(queueNav?.nextId);
  const queuePositionLabel =
    queueNav && queueNav.index >= 0 && queueNav.total > 0 ? `${queueNav.index + 1}/${queueNav.total}` : null;

  const resetWorkbench = useCallback(() => {
    const fallback = createDefaultWorkbenchLayoutState(aiQueueWorkbench2Schema, aiQueueWorkbench2Tabs);
    setLayoutState(fallback);
    saveWorkbenchLayoutState(aiQueueWorkbench2Schema, fallback);
    window.localStorage.removeItem(aiQueueWorkbench2Schema.storageKey);
    clearAiQueueWidgetBoardStorage();
    clearAiQueueHiddenWidgetsStorage();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("labelhub:ai-queue:widget-board:groups");
    }
    setWidgetPlacementKey((key) => key + 1);
  }, []);

  const applyRenderDefaultViews = useCallback((defaults: ReviewRenderPrefs["defaults"]) => {
    mergeAiQueueWidgetViewModes("content", {
      "content-payload": defaults.payload,
      "content-annotate": defaults.annotate,
    });
    setWidgetPlacementKey((key) => key + 1);
  }, []);

  const workbenchSchema = useMemo(
    () => ({
      ...aiQueueWorkbench2Schema,
      chrome: renderPrefs.chrome,
    }),
    [renderPrefs.chrome],
  );

  const handleLayoutStateChange = useCallback((nextState: WorkbenchGlobalLayoutState) => {
    layoutStateRef.current = nextState;
    setLayoutState(nextState);
    saveWorkbenchLayoutState(aiQueueWorkbench2Schema, nextState);
  }, []);

  const moveTab = useCallback((tabId: string, regionId: WorkbenchRegionId) => {
    setLayoutState((current) => {
      const nextTabs = moveTabToRegion(current.tabs, tabId, regionId);
      const nextState = { ...current, tabs: nextTabs };
      saveWorkbenchLayoutState(aiQueueWorkbench2Schema, nextState);
      return nextState;
    });
  }, []);

  const businessContext = useMemo<AiQueueWorkbenchBusinessContext>(
    () => ({
      rows,
      detail,
      currentId,
      statusFilter,
      focusMode,
      editMode,
      queueLoading,
      detailLoading,
      statusCounts,
      queueStats,
      statsLoading,
      canGoPrev,
      canGoNext,
      queuePositionLabel,
      layoutTabs: layoutState.tabs,
      onStatusFilterChange,
      onSelectItem,
      onToggleFocusMode,
      onPrev,
      onNext,
      onRetryFailed,
      moveTab,
      resetLayout: resetWorkbench,
      renderPrefs,
      setRenderPrefs,
      resetRenderPrefs,
      applyRenderDefaultViews,
    }),
    [
      canGoNext,
      canGoPrev,
      currentId,
      detail,
      detailLoading,
      editMode,
      focusMode,
      layoutState.tabs,
      moveTab,
      onNext,
      onPrev,
      onRetryFailed,
      onSelectItem,
      onStatusFilterChange,
      onToggleFocusMode,
      queueLoading,
      queuePositionLabel,
      queueStats,
      resetWorkbench,
      renderPrefs,
      resetRenderPrefs,
      applyRenderDefaultViews,
      setRenderPrefs,
      rows,
      statsLoading,
      statusCounts,
      statusFilter,
    ],
  );

  const slotProviders = useMemo(
    () => createAiQueueSlotProviders({ navigate }),
    [navigate],
  );

  const renderTopBar = useMemo(
    () =>
      createAiQueueTopBar({
        onToggleEditMode: () => setEditMode((current) => !current),
        onResetWorkbench: resetWorkbench,
      }),
    [resetWorkbench],
  );

  const layoutBridge = useMemo(
    () =>
      createWorkbenchLayoutBridge({
        tabs: layoutState.tabs,
        setTabs: (tabs) => handleLayoutStateChange({ ...layoutStateRef.current, tabs }),
        activateRegionTab: (regionId, tabId) => {
          handleLayoutStateChange({
            ...layoutStateRef.current,
            regions: {
              ...layoutStateRef.current.regions,
              [regionId]: {
                ...layoutStateRef.current.regions[regionId],
                activeTabId: tabId,
              },
            },
          });
        },
      }),
    [handleLayoutStateChange, layoutState.tabs],
  );

  return (
    <AiQueueWidgetPlacementProvider key={widgetPlacementKey} layoutBridge={layoutBridge}>
      <AiQueueWorkbenchSurface
        editMode={editMode}
        slotProviders={slotProviders}
        businessContext={businessContext}
        layoutState={layoutState}
        workbenchSchema={workbenchSchema}
        onLayoutStateChange={handleLayoutStateChange}
        renderTopBar={renderTopBar}
      />
    </AiQueueWidgetPlacementProvider>
  );
}

function AiQueueWorkbenchSurface({
  editMode,
  slotProviders,
  businessContext,
  layoutState,
  workbenchSchema,
  onLayoutStateChange,
  renderTopBar,
}: {
  editMode: boolean;
  slotProviders: StandardWorkbenchV2Props<AiQueueWorkbenchBusinessContext>["slotProviders"];
  businessContext: AiQueueWorkbenchBusinessContext;
  layoutState: WorkbenchGlobalLayoutState;
  workbenchSchema: typeof aiQueueWorkbench2Schema;
  onLayoutStateChange: (state: WorkbenchGlobalLayoutState) => void;
  renderTopBar: StandardWorkbenchV2Props<AiQueueWorkbenchBusinessContext>["renderTopBar"];
}) {
  const aiQueueWidgetDrag = useAiQueueWidgetDragHandlers(editMode);
  const placement = useAiQueueWidgetPlacement();
  const { activeDragWidgetId } = placement;
  const overlayTitle = activeDragWidgetId ? AI_QUEUE_WIDGET_DEFINITIONS[activeDragWidgetId as keyof typeof AI_QUEUE_WIDGET_DEFINITIONS]?.title : null;
  const availableWidgets = resolveAllAvailableAiQueueWidgetIds(businessContext);

  const widgetDragOverlay: ReactNode =
    editMode && overlayTitle ? (
      <div className="flex items-center gap-2 rounded-2xl border border-blue-300 bg-white px-3 py-2 text-sm font-medium shadow-lg dark:border-blue-500/40 dark:bg-slate-950">
        <GripVertical className="h-4 w-4 text-slate-400" />
        {overlayTitle}
      </div>
    ) : null;

  const editSidebar = createWorkbenchEditLayoutSidebar(editMode, {
    features: { tabManager: true, widgetPalette: true },
    layoutState,
    onLayoutStateChange,
    placement,
    isWidgetId: isAiQueueWidgetId,
    availableWidgetIds: availableWidgets,
  });

  return (
    <StandardWorkbenchV2
      schema={workbenchSchema}
      slotProviders={slotProviders}
      initialTabs={aiQueueWorkbench2Tabs}
      businessContext={businessContext}
      state={layoutState}
      editing={editMode}
      onStateChange={onLayoutStateChange}
      renderTopBar={renderTopBar}
      widgetDrag={aiQueueWidgetDrag}
      widgetDragOverlay={widgetDragOverlay}
      editSidebar={editSidebar}
      className="h-full min-h-0"
      shellClassName="!p-0"
    />
  );
}
