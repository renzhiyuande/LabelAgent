import { WorkbenchContentShell, buildMockAiInsight } from "@/components/workbench";
import type { AuditPoolQueueScope, ManualReviewDetail } from "../types";
import { ContentBodyPanelBody } from "../workbench/panels/review/ContentBodyPanelBody";
import { ContentHeaderPanelBody } from "../workbench/panels/review/ContentHeaderPanelBody";
import { ReviewActionsPanelBody } from "../workbench/panels/review/ReviewActionsPanelBody";
import { ReviewCommentPanelBody } from "../workbench/panels/review/ReviewCommentPanelBody";
import { ReviewHeaderPanelBody } from "../workbench/panels/review/ReviewHeaderPanelBody";
import type { ReviewWorkbenchBusinessContext } from "../workbench/types";
import { createStubReviewRenderPrefsHandlers } from "../workbench/review-render-prefs";

interface ReviewContentPanelProps {
  detail: ManualReviewDetail | null;
  pending?: boolean;
}

function toContext(
  detail: ManualReviewDetail | null,
  overrides: Partial<ReviewWorkbenchBusinessContext> = {},
): ReviewWorkbenchBusinessContext {
  return {
    rows: [],
    detail,
    currentId: detail?.id ?? "",
    auditPoolEntryMode: "audit-pool",
    statusFilter: "pending",
    queueScope: null as AuditPoolQueueScope | null,
    queueGroupBy: "task",
    groupBrowseKeyword: "",
    queueTotal: 0,
    queueHasMore: false,
    auditPoolGroups: [],
    groupsTotal: 0,
    groupsLoading: false,
    groupsLoadingMore: false,
    queueLoadingMore: false,
    comment: "",
    saving: false,
    focusMode: false,
    editMode: false,
    queueLoading: false,
    statusCounts: {},
    reviewLevel: "L1",
    auditPoolLevelMeta: [],
    auditPoolLevelMetaLoading: false,
    auditPoolBrowseTitle: "选择审核范围",
    auditPoolBrowseDescription: "支持多选与全选本页；确认后由服务端按 scopeIds 分页加载队列。",
    auditPoolEmptyHint: "请先从任务视图勾选分组（可多选），再加载审核队列",
    auditPoolOpenBrowseLabel: "打开任务视图",
    auditPoolBatch: null,
    canGoPrev: false,
    canGoNext: false,
    queuePositionLabel: null,
    layoutTabs: [],
    aiInsight: detail?.aiInsight ?? buildMockAiInsight("review-panel", {}),
    historyComments: [],
    onStatusFilterChange: () => undefined,
    onReviewLevelChange: () => undefined,
    onQueueGroupByChange: () => undefined,
    onGroupBrowseKeywordChange: () => undefined,
    onApplyQueueScopes: () => undefined,
    onClearQueueScope: () => undefined,
    onReloadAuditPoolGroups: () => undefined,
    onLoadMoreAuditPoolGroups: () => undefined,
    onLoadMoreQueue: () => undefined,
    onSelectReview: () => undefined,
    onCommentChange: () => undefined,
    onApprove: () => undefined,
    onReject: () => undefined,
    onReturn: () => undefined,
    onToggleFocusMode: () => undefined,
    moveTab: () => undefined,
    resetLayout: () => undefined,
    ...createStubReviewRenderPrefsHandlers(),
    ...overrides,
  };
}

export function ReviewContentPanel({ detail, pending = false }: ReviewContentPanelProps) {
  const context = toContext(detail);
  if (!detail) {
    return <ContentBodyPanelBody context={context} />;
  }

  return (
    <WorkbenchContentShell
      pending={pending}
      className="bg-[linear-gradient(180deg,hsl(var(--card)/0.96)_0%,hsl(var(--muted)/0.88)_100%)]"
    >
      <ContentHeaderPanelBody context={context} />
      <ContentBodyPanelBody context={context} />
    </WorkbenchContentShell>
  );
}

interface ReviewFormPanelProps {
  detail: ManualReviewDetail | null;
  comment: string;
  saving?: boolean;
  onCommentChange: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onReturn: () => void;
}

export function ReviewFormPanel({
  detail,
  comment,
  saving = false,
  onCommentChange,
  onApprove,
  onReject,
  onReturn,
}: ReviewFormPanelProps) {
  const context = toContext(detail, {
    comment,
    saving,
    onCommentChange,
    onApprove,
    onReject,
    onReturn,
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ReviewHeaderPanelBody context={context} />
      <ReviewCommentPanelBody context={context} />
      <ReviewActionsPanelBody context={context} />
    </div>
  );
}
