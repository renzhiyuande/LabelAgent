import type { AiInsight } from "@/components/workbench/shared/AiInsightPanel";
import type { WorkbenchRegionId, WorkbenchSlotProvider, WorkbenchTabItem } from "@/components/workbench2";
import type { ReviewRenderPrefs } from "./review-render-prefs";
import type { AiQueueStatsResponse, AuditPoolGroupResponse, AuditPoolLevelCountResponse } from "../api/reviewer-workbench-api";
import type {
  AiQueueDetail,
  AiQueueRow,
  AiQueueStatus,
  AuditPoolGroupBy,
  AuditPoolQueueScope,
  ManualReviewDetail,
  ManualReviewRow,
  ManualReviewStatus,
} from "../types";

export interface AuditPoolBatchSelectionState {
  selectedIds: string[];
  selectableIds: string[];
  reviewLevelLabel: string;
  isFinalReviewLevel: boolean;
  batchComment: string;
  batchSubmitting: boolean;
  onToggleSelected: (id: string, selected: boolean) => void;
  onSelectAllPending: () => void;
  onClearSelection: () => void;
  onBatchCommentChange: (value: string) => void;
  onBatchApprove: () => void;
  onBatchReject: () => void;
  onBatchReturn: () => void;
}

export type ReviewAuditPoolEntryMode = "audit-pool" | "batch";

export interface ReviewWorkbenchV2Props {
  rows: ManualReviewRow[];
  detail: ManualReviewDetail | null;
  currentId: string;
  auditPoolEntryMode?: ReviewAuditPoolEntryMode;
  statusFilter: ManualReviewStatus | "all";
  queueScope: AuditPoolQueueScope | null;
  queueGroupBy: AuditPoolGroupBy;
  groupBrowseKeyword: string;
  queueTotal?: number;
  queueHasMore?: boolean;
  comment: string;
  saving?: boolean;
  focusMode: boolean;
  queueLoading?: boolean;
  queueLoadingMore?: boolean;
  groupsLoading?: boolean;
  groupsLoadingMore?: boolean;
  auditPoolGroups?: AuditPoolGroupResponse[];
  groupsTotal?: number;
  statusCounts?: Record<string, number>;
  reviewLevel?: string;
  auditPoolLevelMeta?: AuditPoolLevelCountResponse[];
  auditPoolLevelMetaLoading?: boolean;
  auditPoolBrowseTitle?: string;
  auditPoolBrowseDescription?: string;
  auditPoolEmptyHint?: string;
  auditPoolOpenBrowseLabel?: string;
  queueNav?: { index: number; total: number; prevId?: string; nextId?: string };
  onStatusFilterChange: (status: ManualReviewStatus | "all") => void;
  onReviewLevelChange?: (levelKey: string) => void;
  auditPoolBatch?: AuditPoolBatchSelectionState | null;
  onQueueGroupByChange: (groupBy: AuditPoolGroupBy) => void;
  onGroupBrowseKeywordChange: (keyword: string) => void;
  onApplyQueueScopes: (scope: AuditPoolQueueScope) => void;
  onClearQueueScope: () => void;
  onReloadAuditPoolGroups: () => void;
  onLoadMoreAuditPoolGroups: () => void;
  onLoadMoreQueue?: () => void;
  onSelectReview: (id: string) => void;
  onCommentChange: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onReturn: () => void;
  onToggleFocusMode: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export interface ReviewWorkbenchBusinessContext {
  rows: ManualReviewRow[];
  detail: ManualReviewDetail | null;
  currentId: string;
  auditPoolEntryMode: ReviewAuditPoolEntryMode;
  statusFilter: ManualReviewStatus | "all";
  queueScope: AuditPoolQueueScope | null;
  queueGroupBy: AuditPoolGroupBy;
  groupBrowseKeyword: string;
  queueTotal: number;
  queueHasMore: boolean;
  comment: string;
  saving: boolean;
  focusMode: boolean;
  editMode: boolean;
  queueLoading: boolean;
  queueLoadingMore: boolean;
  groupsLoading: boolean;
  groupsLoadingMore: boolean;
  auditPoolGroups: AuditPoolGroupResponse[];
  groupsTotal: number;
  statusCounts: Record<string, number>;
  reviewLevel: string;
  auditPoolLevelMeta: AuditPoolLevelCountResponse[];
  auditPoolLevelMetaLoading: boolean;
  auditPoolBrowseTitle: string;
  auditPoolBrowseDescription: string;
  auditPoolEmptyHint: string;
  auditPoolOpenBrowseLabel: string;
  auditPoolBatch: AuditPoolBatchSelectionState | null;
  canGoPrev: boolean;
  canGoNext: boolean;
  queuePositionLabel: string | null;
  layoutTabs: WorkbenchTabItem[];
  aiInsight: AiInsight;
  historyComments: Array<{ reviewer: string; comment: string; at: string }>;
  onStatusFilterChange: (status: ManualReviewStatus | "all") => void;
  onReviewLevelChange: (levelKey: string) => void;
  onQueueGroupByChange: (groupBy: AuditPoolGroupBy) => void;
  onGroupBrowseKeywordChange: (keyword: string) => void;
  onApplyQueueScopes: (scope: AuditPoolQueueScope) => void;
  onClearQueueScope: () => void;
  onReloadAuditPoolGroups: () => void;
  onLoadMoreAuditPoolGroups: () => void;
  onLoadMoreQueue?: () => void;
  onSelectReview: (id: string) => void;
  onCommentChange: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onReturn: () => void;
  onToggleFocusMode: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  moveTab: (tabId: string, regionId: WorkbenchRegionId) => void;
  resetLayout: () => void;
  renderPrefs: ReviewRenderPrefs;
  setRenderPrefs: (patch: Partial<ReviewRenderPrefs>) => void;
  resetRenderPrefs: () => ReviewRenderPrefs;
  applyRenderDefaultViews: (defaults: ReviewRenderPrefs["defaults"]) => void;
}

export interface AiQueueWorkbenchV2Props {
  rows: AiQueueRow[];
  detail: AiQueueDetail | null;
  currentId: string;
  statusFilter: AiQueueStatus | "all";
  focusMode: boolean;
  queueNav?: { index: number; total: number; prevId?: string; nextId?: string };
  queueLoading?: boolean;
  detailLoading?: boolean;
  statusCounts?: Record<string, number>;
  queueStats?: AiQueueStatsResponse | null;
  statsLoading?: boolean;
  onStatusFilterChange: (status: AiQueueStatus | "all") => void;
  onSelectItem: (id: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
  onToggleFocusMode: () => void;
  onRetryFailed?: () => void;
}

export interface AiQueueWorkbenchBusinessContext {
  rows: AiQueueRow[];
  detail: AiQueueDetail | null;
  currentId: string;
  statusFilter: AiQueueStatus | "all";
  focusMode: boolean;
  editMode: boolean;
  queueLoading: boolean;
  detailLoading: boolean;
  statusCounts: Record<string, number>;
  queueStats: AiQueueStatsResponse | null;
  statsLoading: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  queuePositionLabel: string | null;
  layoutTabs: WorkbenchTabItem[];
  onStatusFilterChange: (status: AiQueueStatus | "all") => void;
  onSelectItem: (id: string) => void;
  onToggleFocusMode: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onRetryFailed?: () => void;
  moveTab: (tabId: string, regionId: WorkbenchRegionId) => void;
  resetLayout: () => void;
  renderPrefs: ReviewRenderPrefs;
  setRenderPrefs: (patch: Partial<ReviewRenderPrefs>) => void;
  resetRenderPrefs: () => ReviewRenderPrefs;
  applyRenderDefaultViews: (defaults: ReviewRenderPrefs["defaults"]) => void;
}

export type ReviewSlotRenderEnv = Parameters<
  NonNullable<WorkbenchSlotProvider<ReviewWorkbenchBusinessContext>["render"]>
>[1];

export type AiQueueSlotRenderEnv = Parameters<
  NonNullable<WorkbenchSlotProvider<AiQueueWorkbenchBusinessContext>["render"]>
>[1];
