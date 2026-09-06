import { useCallback, useEffect, useState } from "react";
import { AuditPoolFlatQueuePanel } from "../../../components/AuditPoolFlatQueuePanel";
import { AuditPoolQueueBrowseDrawer } from "../../../components/AuditPoolQueueBrowseDrawer";
import type { ReviewWorkbenchBusinessContext } from "../../types";

export function QueueListPanelBody({ context }: { context: ReviewWorkbenchBusinessContext }) {
  const [browseOpen, setBrowseOpen] = useState(false);

  useEffect(() => {
    if (context.auditPoolEntryMode !== "batch") {
      return;
    }
    if (!context.queueScope || context.queueScope.items.length === 0) {
      setBrowseOpen(true);
    }
  }, [context.auditPoolEntryMode, context.queueScope]);

  const reloadGroups = useCallback(() => {
    void context.onReloadAuditPoolGroups();
  }, [context.onReloadAuditPoolGroups]);

  return (
    <>
      <AuditPoolFlatQueuePanel
        rows={context.rows}
        currentId={context.currentId}
        statusFilter={context.statusFilter}
        queueScope={context.queueScope}
        queueTotal={context.queueTotal}
        loading={context.queueLoading}
        loadingMore={context.queueLoadingMore}
        hasMore={context.queueHasMore}
        statusCounts={context.statusCounts}
        reviewLevel={context.reviewLevel}
        reviewLevelMeta={context.auditPoolLevelMeta}
        reviewLevelMetaLoading={context.auditPoolLevelMetaLoading}
        onReviewLevelChange={context.onReviewLevelChange}
        onStatusFilterChange={context.onStatusFilterChange}
        onSelectItem={context.onSelectReview}
        onOpenBrowse={() => setBrowseOpen(true)}
        onClearScope={context.onClearQueueScope}
        onLoadMore={context.onLoadMoreQueue}
        emptyHint={context.auditPoolEmptyHint}
        openBrowseLabel={context.auditPoolOpenBrowseLabel}
        batchSelection={context.auditPoolBatch}
      />
      <AuditPoolQueueBrowseDrawer
        open={browseOpen}
        onClose={() => setBrowseOpen(false)}
        activeScope={context.queueScope}
        title={context.auditPoolBrowseTitle}
        description={context.auditPoolBrowseDescription}
        groupBy={context.queueGroupBy}
        keyword={context.groupBrowseKeyword}
        groups={context.auditPoolGroups}
        groupsTotal={context.groupsTotal}
        loading={context.groupsLoading}
        loadingMore={context.groupsLoadingMore}
        onGroupByChange={context.onQueueGroupByChange}
        onKeywordChange={context.onGroupBrowseKeywordChange}
        onReloadGroups={reloadGroups}
        onLoadMoreGroups={() => void context.onLoadMoreAuditPoolGroups()}
        onApplyScopes={context.onApplyQueueScopes}
      />
    </>
  );
}
