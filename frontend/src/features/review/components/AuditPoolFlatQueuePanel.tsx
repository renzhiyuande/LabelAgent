import { useMemo } from "react";
import { LayoutList, X } from "lucide-react";
import type { StatusFilterTab, WorkbenchQueueItem } from "@/components/workbench";
import { WorkbenchQueueList } from "@/components/workbench";
import { Button } from "@/components/ui/button";
import type { AuditPoolLevelCountResponse } from "../api/reviewer-workbench-api";
import { AuditPoolBatchQueueFooter } from "./AuditPoolBatchQueueFooter";
import { AuditPoolReviewLevelTabs } from "./AuditPoolReviewLevelTabs";
import { ReviewerSessionIdentity } from "./ReviewerSessionIdentity";
import type { AuditPoolBatchSelectionState } from "../workbench/types";
import { formatAuditPoolQueueScopeLabel, MANUAL_REVIEW_STATUS_META, type AuditPoolQueueScope, type ManualReviewRow, type ManualReviewStatus } from "../types";

export interface AuditPoolFlatQueuePanelProps {
  rows: ManualReviewRow[];
  currentId: string;
  statusFilter: ManualReviewStatus | "all";
  queueScope: AuditPoolQueueScope | null;
  queueTotal?: number;
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  statusCounts?: Record<string, number>;
  reviewLevel?: string;
  reviewLevelMeta?: AuditPoolLevelCountResponse[];
  reviewLevelMetaLoading?: boolean;
  onReviewLevelChange?: (levelKey: string) => void;
  onStatusFilterChange: (status: ManualReviewStatus | "all") => void;
  onSelectItem: (id: string) => void;
  onOpenBrowse?: () => void;
  onClearScope?: () => void;
  onLoadMore?: () => void;
  emptyHint?: string;
  openBrowseLabel?: string;
  batchSelection?: AuditPoolBatchSelectionState | null;
}

export function AuditPoolFlatQueuePanel({
  rows,
  currentId,
  statusFilter,
  queueScope,
  queueTotal = 0,
  loading,
  loadingMore,
  hasMore,
  statusCounts = {},
  reviewLevel = "L1",
  reviewLevelMeta = [],
  reviewLevelMetaLoading,
  onReviewLevelChange,
  onStatusFilterChange,
  onSelectItem,
  onOpenBrowse,
  onClearScope,
  onLoadMore,
  emptyHint = "请先从任务视图勾选分组（可多选），再加载审核队列",
  openBrowseLabel = "打开任务视图",
  batchSelection,
}: AuditPoolFlatQueuePanelProps) {
  const filters: StatusFilterTab[] = [
    { id: "all", label: "全部", count: statusCounts.all ?? rows.length },
    { id: "pending", label: MANUAL_REVIEW_STATUS_META.pending.label, count: statusCounts.pending ?? 0 },
    { id: "approved", label: MANUAL_REVIEW_STATUS_META.approved.label, count: statusCounts.approved ?? 0 },
    { id: "returned", label: MANUAL_REVIEW_STATUS_META.returned.label, count: statusCounts.returned ?? 0 },
    { id: "rejected", label: MANUAL_REVIEW_STATUS_META.rejected.label, count: statusCounts.rejected ?? 0 },
  ];

  const filteredRows = useMemo(() => {
    if (statusFilter === "all") {
      return rows;
    }
    return rows.filter((row) => row.status === statusFilter);
  }, [rows, statusFilter]);

  const items: WorkbenchQueueItem[] = filteredRows.map((row) => ({
    id: row.id,
    title: row.title,
    subtitle: row.submissionCode,
    meta: `${row.taskName} · ${row.labeler} · 第 ${row.itemSeqNo} 题`,
    badge: {
      label: row.reviewStageLabel
        ? row.reviewStageLabel
        : row.aiScore != null
          ? `${MANUAL_REVIEW_STATUS_META[row.status].label} (${row.aiScore})`
          : MANUAL_REVIEW_STATUS_META[row.status].label,
      variant: MANUAL_REVIEW_STATUS_META[row.status].badge,
    },
  }));

  if (!queueScope || queueScope.items.length === 0) {
    return (
      <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-muted-foreground">{emptyHint}</p>
        {onOpenBrowse ? (
          <Button type="button" variant="default" size="sm" className="rounded-full" onClick={onOpenBrowse}>
            <LayoutList className="mr-1.5 h-4 w-4" />
            {openBrowseLabel}
          </Button>
        ) : null}
      </div>
    );
  }

  const scopeTypeLabel =
    queueScope.type === "task" ? "标注任务" : queueScope.type === "labeler" ? "标注员" : "题目";
  const scopeSummary = formatAuditPoolQueueScopeLabel(queueScope);

  return (
    <WorkbenchQueueList
      items={items}
      currentItemId={currentId}
      loading={loading}
      loadingMore={loadingMore}
      hasMore={hasMore}
      onSelectItem={onSelectItem}
      onLoadMore={onLoadMore}
      filters={filters}
      activeFilterId={statusFilter}
      onFilterChange={(id) => onStatusFilterChange(id as ManualReviewStatus | "all")}
      headerSummary={
        <div className="space-y-2">
          <ReviewerSessionIdentity levelMeta={reviewLevelMeta} compact />
          {onReviewLevelChange && reviewLevelMeta.length > 1 ? (
            <AuditPoolReviewLevelTabs
              levels={reviewLevelMeta}
              activeLevelKey={reviewLevel}
              loading={reviewLevelMetaLoading}
              onLevelChange={onReviewLevelChange}
            />
          ) : null}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">
                {scopeTypeLabel} · 已选 {queueScope.items.length} 组
              </p>
              <p className="truncate text-sm font-medium text-foreground">{scopeSummary}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {onOpenBrowse ? (
                <Button type="button" variant="outline" size="sm" className="h-8 rounded-full px-2.5 text-xs" onClick={onOpenBrowse}>
                  调整
                </Button>
              ) : null}
              {onClearScope ? (
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClearScope} aria-label="清除范围">
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            已加载 {filteredRows.length}
            {queueTotal > 0 ? ` / 共 ${queueTotal} 条` : ""}（服务端分页）
          </p>
        </div>
      }
      emptyMessage="当前范围内暂无待审条目"
      selectedIds={batchSelection?.selectedIds}
      onToggleSelected={batchSelection?.onToggleSelected}
      selectableItemIds={batchSelection?.selectableIds}
      footer={
        batchSelection ? (
          <AuditPoolBatchQueueFooter
            selectedCount={batchSelection.selectedIds.length}
            reviewLevelLabel={batchSelection.reviewLevelLabel}
            isFinalLevel={batchSelection.isFinalReviewLevel}
            batchComment={batchSelection.batchComment}
            batchSubmitting={batchSelection.batchSubmitting}
            onBatchCommentChange={batchSelection.onBatchCommentChange}
            onSelectAllPending={batchSelection.onSelectAllPending}
            onClearSelection={batchSelection.onClearSelection}
            onBatchApprove={batchSelection.onBatchApprove}
            onBatchReject={batchSelection.onBatchReject}
            onBatchReturn={batchSelection.onBatchReturn}
          />
        ) : undefined
      }
    />
  );
}
