import { GripVertical } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { LabelerSlotFrame, type LabelerWorkbenchSlotId, type LabelerWorkbenchViewMode } from "./LabelerSlotFrame";
import { labelerWorkbench2Schema, labelerWorkbench2Tabs } from "./schema";
import { createLabelerSlotProviders } from "./layout/slot-providers";
import { createLabelerTopBar } from "./layout/top-bar";
import type { LabelerRenderPrefs } from "./labeler-render-prefs";
import { defaultLabelerSlotModes, loadLabelerSlotModes, saveLabelerSlotModes } from "./labeler-edit-layout-storage";
import {
  loadLabelerWidgetViewModes,
  saveLabelerWidgetOrder,
  saveLabelerWidgetViewModes,
  type LabelerWidgetBoardId,
} from "./labeler-widget-board-storage";
import { clearLabelerWidgetBoardStorage } from "./labeler-widget-board-storage";
import {
  applySectionWidgetOrders,
  configureLabelerWidgetOrderLoader,
  getDefaultLabelerWidgetOrders,
} from "./labeler-widget-orders";
import {
  isLabelerBoardWidgetId,
  resolveLabelerWidgetDefinition,
} from "./labeler-widget-registry";
import {
  LabelerWidgetPlacementProvider,
  clearLabelerHiddenWidgetsStorage,
  configureLabelerWidgetDefinitionLoader,
  useLabelerWidgetDragHandlers,
  useLabelerWidgetPlacement,
} from "./labeler-widget-placement-context";
import type { LabelerWorkbenchBusinessContext, LabelerWorkbenchV2Props } from "./types";
import type { StandardWorkbenchV2Props } from "@/components/workbench2/extensions/StandardWorkbenchV2";

export function LabelerWorkbenchV2({
  work,
  assignmentId,
  formSchema,
  renderPrefs,
  setRenderPrefs,
  resetRenderPrefs,
  displaySchema,
  annotateResource,
  annotateFieldCount,
  values,
  queueRows,
  queueLoading = false,
  queueHasMore = false,
  queueLoadingMore = false,
  onLoadMoreQueue,
  onApplyQueueScope,
  contentPending = false,
  bootstrapping = false,
  currentUser,
  saveHint,
  saving,
  submitting,
  focusMode,
  onToggleFocusMode,
  onSelectAssignment,
  onPrevAssignment,
  onNextAssignment,
  queueNav,
  canGoNextInQueue,
  onFieldChange,
  annotateFieldErrors,
  onAnnotateFieldErrorsChange,
  onSaveDraft,
  onSubmit,
  onWithdraw,
  canSubmit = true,
}: LabelerWorkbenchV2Props) {
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [widgetPlacementKey, setWidgetPlacementKey] = useState(0);
  const [slotModes, setSlotModes] = useState(loadLabelerSlotModes);
  const [layoutState, setLayoutState] = useState<WorkbenchGlobalLayoutState>(() => {
    const fallback = createDefaultWorkbenchLayoutState(labelerWorkbench2Schema, labelerWorkbench2Tabs);
    return loadWorkbenchLayoutState(labelerWorkbench2Schema, fallback);
  });
  const layoutStateRef = useRef(layoutState);
  layoutStateRef.current = layoutState;

  const contentPendingOnly = contentPending && !bootstrapping;
  const canGoPrev = Boolean(queueNav?.prevId) && !contentPendingOnly;
  const canGoNext = Boolean(canGoNextInQueue) && !contentPendingOnly;
  const queuePositionLabel =
    queueNav && queueNav.index >= 0 && queueNav.total > 0
      ? `${queueNav.index + 1}/${queueNav.total}`
      : null;
  const queueOrdinalLabel = (() => {
    if (work.taskItem.seqNo != null && work.taskItem.seqNo > 0) {
      return String(work.taskItem.seqNo).padStart(2, "0");
    }
    if (queueNav && queueNav.index >= 0) {
      return String(queueNav.index + 1).padStart(2, "0");
    }
    const currentIndex = queueRows.findIndex((row) => String(row.assignmentId) === assignmentId);
    return currentIndex >= 0 ? String(currentIndex + 1).padStart(2, "0") : null;
  })();

  function setSlotMode(slotId: LabelerWorkbenchSlotId, mode: LabelerWorkbenchViewMode) {
    setSlotModes((current) => {
      const next = {
        ...current,
        [slotId]: mode,
      };
      saveLabelerSlotModes(next);
      return next;
    });
  }

  const flushEditLayout = useCallback(() => {
    saveWorkbenchLayoutState(labelerWorkbench2Schema, layoutStateRef.current);
  }, []);

  const handleLayoutStateChange = useCallback((nextState: WorkbenchGlobalLayoutState) => {
    layoutStateRef.current = nextState;
    setLayoutState(nextState);
    saveWorkbenchLayoutState(labelerWorkbench2Schema, nextState);
  }, []);

  function moveTab(tabId: string, regionId: WorkbenchRegionId) {
    setLayoutState((current) => {
      const nextTabs = moveTabToRegion(current.tabs, tabId, regionId);
      const nextState = {
        ...current,
        tabs: nextTabs,
      };
      saveWorkbenchLayoutState(labelerWorkbench2Schema, nextState);
      return nextState;
    });
  }

  const applyRenderDefaultViews = useCallback((defaults: LabelerRenderPrefs["defaults"]) => {
    setSlotModes((current) => {
      const next = {
        ...current,
        payload: defaults.payload,
        annotate: defaults.annotate,
      };
      saveLabelerSlotModes(next);
      return next;
    });

    const boards: LabelerWidgetBoardId[] = ["payload", "annotate"];
    for (const boardId of boards) {
      const order =
        boardId === "payload"
          ? ["payload-main"]
          : ["annotate-main", "annotate-actions"];
      const currentModes = loadLabelerWidgetViewModes(boardId, order);
      saveLabelerWidgetViewModes(boardId, {
        ...currentModes,
        "payload-main": defaults.payload,
        "annotate-main": defaults.annotate,
      });
    }
  }, []);

  const applySectionWidgetLayout = useCallback(() => {
    if (!formSchema) {
      return;
    }
    if (renderPrefs.layoutMode === "sectionWidgets") {
      applySectionWidgetOrders(formSchema, renderPrefs);
    } else {
      const classic = getDefaultLabelerWidgetOrders();
      for (const boardId of ["payload", "annotate", "ai"] as const) {
        saveLabelerWidgetOrder(boardId, classic[boardId]);
      }
    }
    setWidgetPlacementKey((key) => key + 1);
  }, [formSchema, renderPrefs]);

  configureLabelerWidgetOrderLoader(formSchema, work.templateVersion.templateVersionId);
  configureLabelerWidgetDefinitionLoader(formSchema, renderPrefs);

  useEffect(() => {
    if (!formSchema) {
      return;
    }
    setLayoutState((current) => {
      let changed = false;
      const nextTabs = current.tabs.map((tab) => {
        if (tab.tabKind !== "widget" || !tab.widgetId) {
          return tab;
        }
        const title = resolveLabelerWidgetDefinition(tab.widgetId, formSchema, renderPrefs)?.title;
        if (!title || title === tab.label) {
          return tab;
        }
        changed = true;
        return { ...tab, label: title };
      });
      if (!changed) {
        return current;
      }
      const nextState = { ...current, tabs: nextTabs };
      layoutStateRef.current = nextState;
      saveWorkbenchLayoutState(labelerWorkbench2Schema, nextState);
      return nextState;
    });
  }, [formSchema, renderPrefs]);

  function resetWorkbench() {
    const fallback = createDefaultWorkbenchLayoutState(labelerWorkbench2Schema, labelerWorkbench2Tabs);
    setSlotModes({ ...defaultLabelerSlotModes });
    saveLabelerSlotModes({ ...defaultLabelerSlotModes });
    setLayoutState(fallback);
    saveWorkbenchLayoutState(labelerWorkbench2Schema, fallback);
    window.localStorage.removeItem(labelerWorkbench2Schema.storageKey);
    clearLabelerWidgetBoardStorage();
    clearLabelerHiddenWidgetsStorage();
    setWidgetPlacementKey((key) => key + 1);
  }

  const businessContext = useMemo<LabelerWorkbenchBusinessContext>(() => ({
    work,
    assignmentId,
    formSchema,
    renderPrefs,
    setRenderPrefs,
    resetRenderPrefs,
    applyRenderDefaultViews,
    applySectionWidgetLayout,
    displaySchema,
    annotateResource,
    annotateFieldCount,
    values,
    queueRows,
    queueLoading,
    queueHasMore,
    queueLoadingMore,
    contentPendingOnly,
    currentUser,
    saveHint,
    saving,
    submitting,
    focusMode,
    editMode,
    canGoPrev,
    canGoNext,
    queuePositionLabel,
    queueOrdinalLabel,
    canSubmit,
    slotModes,
    setSlotMode,
    layoutTabs: layoutState.tabs,
    moveTab,
    resetLayout: resetWorkbench,
    onToggleFocusMode,
    onSelectAssignment,
    onPrevAssignment,
    onNextAssignment,
    onLoadMoreQueue,
    onApplyQueueScope,
    onFieldChange,
    annotateFieldErrors,
    onAnnotateFieldErrorsChange,
    onSaveDraft,
    onSubmit,
    onWithdraw,
  }), [
    annotateFieldCount,
    annotateResource,
    assignmentId,
    formSchema,
    renderPrefs,
    applyRenderDefaultViews,
    applySectionWidgetLayout,
    resetRenderPrefs,
    setRenderPrefs,
    canGoNext,
    canGoPrev,
    canSubmit,
    contentPendingOnly,
    currentUser,
    displaySchema,
    focusMode,
    annotateFieldErrors,
    onAnnotateFieldErrorsChange,
    onFieldChange,
    onLoadMoreQueue,
    onApplyQueueScope,
    onNextAssignment,
    onPrevAssignment,
    onSaveDraft,
    onSelectAssignment,
    onSubmit,
    onWithdraw,
    onToggleFocusMode,
    queueHasMore,
    queueLoading,
    queueLoadingMore,
    queuePositionLabel,
    queueOrdinalLabel,
    queueRows,
    layoutState.tabs,
    resetWorkbench,
    saveHint,
    saving,
    slotModes,
    submitting,
    values,
    work,
  ]);

  const workbenchSchema = useMemo(
    () => ({
      ...labelerWorkbench2Schema,
      chrome: renderPrefs.chrome,
    }),
    [renderPrefs.chrome],
  );

  const slotProviders = useMemo(
    () =>
      createLabelerSlotProviders({
        navigate,
        onToggleEditMode: () => {
          setEditMode((current) => {
            if (current) {
              flushEditLayout();
            }
            return !current;
          });
        },
        onResetWorkbench: resetWorkbench,
      }),
    [flushEditLayout, navigate, resetWorkbench],
  );

  const renderTopBar = useMemo(
    () =>
      createLabelerTopBar({
        onToggleEditMode: () => {
          setEditMode((current) => {
            if (current) {
              flushEditLayout();
            }
            return !current;
          });
        },
        onResetWorkbench: resetWorkbench,
      }),
    [flushEditLayout, resetWorkbench],
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
    <LabelerWidgetPlacementProvider key={widgetPlacementKey} layoutBridge={layoutBridge}>
      <LabelerWorkbenchSurface
        editMode={editMode}
        schema={workbenchSchema}
        slotProviders={slotProviders}
        businessContext={businessContext}
        layoutState={layoutState}
        onLayoutStateChange={handleLayoutStateChange}
        renderTopBar={renderTopBar}
      />
    </LabelerWidgetPlacementProvider>
  );
}

function LabelerWorkbenchSurface({
  editMode,
  schema,
  slotProviders,
  businessContext,
  layoutState,
  onLayoutStateChange,
  renderTopBar,
}: {
  editMode: boolean;
  schema: StandardWorkbenchV2Props<LabelerWorkbenchBusinessContext>["schema"];
  slotProviders: StandardWorkbenchV2Props<LabelerWorkbenchBusinessContext>["slotProviders"];
  businessContext: LabelerWorkbenchBusinessContext;
  layoutState: WorkbenchGlobalLayoutState;
  onLayoutStateChange: (state: WorkbenchGlobalLayoutState) => void;
  renderTopBar: StandardWorkbenchV2Props<LabelerWorkbenchBusinessContext>["renderTopBar"];
}) {
  const labelerWidgetDrag = useLabelerWidgetDragHandlers(editMode);
  const placement = useLabelerWidgetPlacement();
  const { activeDragWidgetId } = placement;
  const overlayTitle =
    activeDragWidgetId
      ? resolveLabelerWidgetDefinition(
          activeDragWidgetId,
          businessContext.formSchema,
          businessContext.renderPrefs,
        )?.title ?? null
      : null;

  const editSidebar = createWorkbenchEditLayoutSidebar<string, LabelerWidgetBoardId>(editMode, {
    features: { tabManager: true, widgetPalette: true },
    layoutState,
    onLayoutStateChange,
    placement,
    isWidgetId: (id): id is string => isLabelerBoardWidgetId(id, businessContext.formSchema),
  });

  const widgetDragOverlay: ReactNode =
    editMode && overlayTitle ? (
      <div className="flex items-center gap-2 rounded-2xl border border-primary/30 bg-card px-3 py-2 text-sm font-medium text-foreground shadow-lg">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        {overlayTitle}
      </div>
    ) : null;

  return (
    <StandardWorkbenchV2
      schema={schema}
      slotProviders={slotProviders}
      initialTabs={labelerWorkbench2Tabs}
      businessContext={businessContext}
      state={layoutState}
      editing={editMode}
      onStateChange={onLayoutStateChange}
      renderTopBar={renderTopBar}
      labelerWidgetDrag={labelerWidgetDrag}
      widgetDrag={labelerWidgetDrag}
      widgetDragOverlay={widgetDragOverlay}
      editSidebar={editSidebar}
      className="h-full min-h-0"
      shellClassName="!p-0"
    />
  );
}
