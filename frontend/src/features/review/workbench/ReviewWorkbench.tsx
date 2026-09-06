import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { buildMockAiInsight } from "@/components/workbench";
import {
  StandardWorkbenchV2,
  createWorkbenchEditLayoutSidebar,
  createWorkbenchLayoutBridge,
  loadWorkbenchLayoutState,
  moveTabToRegion,
  saveWorkbenchLayoutState,
  type WorkbenchGlobalLayoutState,
  type WorkbenchRegionId,
} from "@/components/workbench2";
import type { StandardWorkbenchV2Props } from "@/components/workbench2/extensions/StandardWorkbenchV2";
import { clearReviewWidgetBoardStorage, mergeReviewWidgetViewModes } from "./review-widget-board-storage";
import { useReviewRenderPrefs, type ReviewRenderPrefs } from "./review-render-prefs";
import { REVIEW_WIDGET_DEFINITIONS, isReviewWidgetId } from "./review-widget-registry";
import {
  ReviewWidgetPlacementProvider,
  clearReviewHiddenWidgetsStorage,
  useReviewWidgetDragHandlers,
  useReviewWidgetPlacement,
} from "./review-widget-placement-context";
import { resolveAllAvailableReviewWidgetIds } from "./panels/review/resolve-review-widgets";
import { createReviewSlotProviders } from "./layout/review-slot-providers";
import { createReviewTopBar } from "./layout/review-top-bar";
import {
  createDefaultReviewWorkbenchLayoutState,
  reviewWorkbench2Schema,
  reviewWorkbench2Tabs,
} from "./schema";
import type { ReviewWorkbenchBusinessContext, ReviewWorkbenchV2Props } from "./types";

export function ReviewWorkbenchV2({
  rows,
  detail,
  currentId,
  auditPoolEntryMode = "audit-pool",
  statusFilter,
  queueScope,
  queueGroupBy,
  groupBrowseKeyword,
  queueTotal = 0,
  queueHasMore = false,
  comment,
  saving = false,
  focusMode,
  queueLoading = false,
  queueLoadingMore = false,
  groupsLoading = false,
  groupsLoadingMore = false,
  auditPoolGroups = [],
  groupsTotal = 0,
  statusCounts = {},
  reviewLevel = "L1",
  auditPoolLevelMeta = [],
  auditPoolLevelMetaLoading = false,
  auditPoolBrowseTitle = "选择审核范围",
  auditPoolBrowseDescription = "支持多选与全选本页；确认后由服务端按 scopeIds 分页加载队列。",
  auditPoolEmptyHint = "请先从任务视图勾选分组（可多选），再加载审核队列",
  auditPoolOpenBrowseLabel = "打开任务视图",
  queueNav,
  onStatusFilterChange,
  onReviewLevelChange,
  auditPoolBatch = null,
  onQueueGroupByChange,
  onGroupBrowseKeywordChange,
  onApplyQueueScopes,
  onClearQueueScope,
  onReloadAuditPoolGroups,
  onLoadMoreAuditPoolGroups,
  onLoadMoreQueue,
  onSelectReview,
  onCommentChange,
  onApprove,
  onReject,
  onReturn,
  onToggleFocusMode,
  onPrev,
  onNext,
}: ReviewWorkbenchV2Props) {
  const navigate = useNavigate();
  const { prefs: renderPrefs, setPrefs: setRenderPrefs, resetRenderPrefs } = useReviewRenderPrefs("review");
  const [editMode, setEditMode] = useState(false);
  const [widgetPlacementKey, setWidgetPlacementKey] = useState(0);
  const [layoutState, setLayoutState] = useState<WorkbenchGlobalLayoutState>(() => {
    const fallback = createDefaultReviewWorkbenchLayoutState();
    return loadWorkbenchLayoutState(reviewWorkbench2Schema, fallback);
  });
  const layoutStateRef = useRef(layoutState);
  layoutStateRef.current = layoutState;

  const canGoPrev = Boolean(queueNav?.prevId);
  const canGoNext = Boolean(queueNav?.nextId);
  const queuePositionLabel =
    queueNav && queueNav.index >= 0 && queueNav.total > 0 ? `${queueNav.index + 1}/${queueNav.total}` : null;

  const currentRow = rows.find((row) => row.id === currentId);
  const aiInsight =
    detail?.aiInsight ?? buildMockAiInsight(`manual-review-${currentId}`, { title: currentRow?.title ?? "review" });

  const historyComments =
    detail?.reviewHistoryComments && detail.reviewHistoryComments.length > 0
      ? detail.reviewHistoryComments
      : detail?.lastReviewComment
        ? [{ reviewer: "上一轮审核", comment: detail.lastReviewComment, at: new Date(detail.submittedAt).toLocaleString() }]
        : [];

  const resetWorkbench = useCallback(() => {
    const fallback = createDefaultReviewWorkbenchLayoutState();
    setLayoutState(fallback);
    saveWorkbenchLayoutState(reviewWorkbench2Schema, fallback);
    window.localStorage.removeItem(reviewWorkbench2Schema.storageKey);
    clearReviewWidgetBoardStorage();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("labelhub:review:widget-board:groups");
    }
    clearReviewHiddenWidgetsStorage();
    setWidgetPlacementKey((key) => key + 1);
  }, []);

  const applyRenderDefaultViews = useCallback((defaults: ReviewRenderPrefs["defaults"]) => {
    mergeReviewWidgetViewModes("content", {
      "content-payload": defaults.payload,
      "content-annotate": defaults.annotate,
    });
    setWidgetPlacementKey((key) => key + 1);
  }, []);

  const workbenchSchema = useMemo(
    () => ({
      ...reviewWorkbench2Schema,
      chrome: renderPrefs.chrome,
    }),
    [renderPrefs.chrome],
  );

  const handleLayoutStateChange = useCallback((nextState: WorkbenchGlobalLayoutState) => {
    layoutStateRef.current = nextState;
    setLayoutState(nextState);
    saveWorkbenchLayoutState(reviewWorkbench2Schema, nextState);
  }, []);

  const moveTab = useCallback((tabId: string, regionId: WorkbenchRegionId) => {
    setLayoutState((current) => {
      const nextTabs = moveTabToRegion(current.tabs, tabId, regionId);
      const nextState = { ...current, tabs: nextTabs };
      saveWorkbenchLayoutState(reviewWorkbench2Schema, nextState);
      return nextState;
    });
  }, []);

  const businessContext = useMemo<ReviewWorkbenchBusinessContext>(
    () => ({
      rows,
      detail,
      currentId,
      auditPoolEntryMode,
      statusFilter,
      queueScope,
      queueGroupBy,
      groupBrowseKeyword,
      queueTotal,
      queueHasMore,
      comment,
      saving,
      focusMode,
      editMode,
      queueLoading,
      queueLoadingMore,
      groupsLoading,
      groupsLoadingMore,
      auditPoolGroups,
      groupsTotal,
      statusCounts,
      reviewLevel,
      auditPoolLevelMeta,
      auditPoolLevelMetaLoading,
      auditPoolBrowseTitle,
      auditPoolBrowseDescription,
      auditPoolEmptyHint,
      auditPoolOpenBrowseLabel,
      auditPoolBatch,
      canGoPrev,
      canGoNext,
      queuePositionLabel,
      aiInsight,
      historyComments,
      layoutTabs: layoutState.tabs,
      onStatusFilterChange,
      onReviewLevelChange: onReviewLevelChange ?? (() => undefined),
      onQueueGroupByChange,
      onGroupBrowseKeywordChange,
      onApplyQueueScopes,
      onClearQueueScope,
      onReloadAuditPoolGroups,
      onLoadMoreAuditPoolGroups,
      onLoadMoreQueue,
      onSelectReview,
      onCommentChange,
      onApprove,
      onReject,
      onReturn,
      onToggleFocusMode,
      onPrev,
      onNext,
      moveTab,
      resetLayout: resetWorkbench,
      renderPrefs,
      setRenderPrefs,
      resetRenderPrefs,
      applyRenderDefaultViews,
    }),
    [
      aiInsight,
      canGoNext,
      canGoPrev,
      comment,
      queueLoading,
      statusCounts,
      reviewLevel,
      auditPoolLevelMeta,
      auditPoolLevelMetaLoading,
      auditPoolBrowseDescription,
      auditPoolBrowseTitle,
      auditPoolEmptyHint,
      auditPoolEntryMode,
      auditPoolOpenBrowseLabel,
      auditPoolBatch,
      statusFilter,
      queueScope,
      queueGroupBy,
      groupBrowseKeyword,
      queueTotal,
      queueHasMore,
      auditPoolGroups,
      groupsTotal,
      queueLoadingMore,
      groupsLoading,
      groupsLoadingMore,
      currentId,
      detail,
      editMode,
      focusMode,
      historyComments,
      layoutState.tabs,
      moveTab,
      onApprove,
      onCommentChange,
      onNext,
      onPrev,
      onReject,
      onReturn,
      onStatusFilterChange,
      onReviewLevelChange,
      onQueueGroupByChange,
      onGroupBrowseKeywordChange,
      onApplyQueueScopes,
      onClearQueueScope,
      onReloadAuditPoolGroups,
      onLoadMoreAuditPoolGroups,
      onLoadMoreQueue,
      onSelectReview,
      onToggleFocusMode,
      queuePositionLabel,
      resetWorkbench,
      renderPrefs,
      resetRenderPrefs,
      applyRenderDefaultViews,
      setRenderPrefs,
      rows,
      saving,
    ],
  );

  const slotProviders = useMemo(
    () => createReviewSlotProviders({ navigate }),
    [navigate],
  );

  const renderTopBar = useMemo(
    () =>
      createReviewTopBar({
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
    <ReviewWidgetPlacementProvider key={widgetPlacementKey} layoutBridge={layoutBridge}>
      <ReviewWorkbenchSurface
        editMode={editMode}
        slotProviders={slotProviders}
        businessContext={businessContext}
        layoutState={layoutState}
        workbenchSchema={workbenchSchema}
        onLayoutStateChange={handleLayoutStateChange}
        renderTopBar={renderTopBar}
      />
    </ReviewWidgetPlacementProvider>
  );
}

function ReviewWorkbenchSurface({
  editMode,
  slotProviders,
  businessContext,
  layoutState,
  workbenchSchema,
  onLayoutStateChange,
  renderTopBar,
}: {
  editMode: boolean;
  slotProviders: StandardWorkbenchV2Props<ReviewWorkbenchBusinessContext>["slotProviders"];
  businessContext: ReviewWorkbenchBusinessContext;
  layoutState: WorkbenchGlobalLayoutState;
  workbenchSchema: typeof reviewWorkbench2Schema;
  onLayoutStateChange: (state: WorkbenchGlobalLayoutState) => void;
  renderTopBar: StandardWorkbenchV2Props<ReviewWorkbenchBusinessContext>["renderTopBar"];
}) {
  const reviewWidgetDrag = useReviewWidgetDragHandlers(editMode);
  const placement = useReviewWidgetPlacement();
  const { activeDragWidgetId } = placement;
  const overlayTitle = activeDragWidgetId ? REVIEW_WIDGET_DEFINITIONS[activeDragWidgetId as keyof typeof REVIEW_WIDGET_DEFINITIONS]?.title : null;
  const availableWidgets = resolveAllAvailableReviewWidgetIds(businessContext);

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
    isWidgetId: isReviewWidgetId,
    availableWidgetIds: availableWidgets,
  });

  return (
    <StandardWorkbenchV2
      schema={workbenchSchema}
      slotProviders={slotProviders}
      initialTabs={reviewWorkbench2Tabs}
      businessContext={businessContext}
      state={layoutState}
      editing={editMode}
      onStateChange={onLayoutStateChange}
      renderTopBar={renderTopBar}
      widgetDrag={reviewWidgetDrag}
      widgetDragOverlay={widgetDragOverlay}
      editSidebar={editSidebar}
      className="h-full min-h-0"
      shellClassName="!p-0"
    />
  );
}
