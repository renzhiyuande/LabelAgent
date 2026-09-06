import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchReviewerAuditPoolDetail,
  fetchReviewerBatchOperation,
  submitReviewerBatchDecision,
} from "./api/reviewer-workbench-api";
import { matchPath, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { appMessage } from "@/lib/message";
import { useAppShellStore } from "@/stores/app-shell";
import { ReviewWorkbenchV2 } from "./workbench";
import { useReviewerAuditPoolSessionStore } from "./stores/reviewer-audit-pool-session";
import type { AuditPoolBatchSelectionState, ReviewAuditPoolEntryMode } from "./workbench/types";
import type { AuditPoolGroupBy, AuditPoolQueueScope, ManualReviewStatus } from "./types";
import { formatAuditPoolQueueScopeLabel } from "./types";
import { auditPoolQueueScopeKey, buildQueueScope, parseScopeIdsParam, serializeScopeIds } from "./utils/audit-pool-scope";
import { useReviewerAuditPoolHotkeys } from "./hooks/use-reviewer-audit-pool-hotkeys";
import { formatReviewAccessError } from "./utils/reviewer-task-access";

function resolveQueueNeighbors<T extends { id: string }>(rows: T[], currentId: string) {
  const index = rows.findIndex((row) => row.id === currentId);
  if (index < 0) {
    return { index: -1, total: rows.length, prevId: undefined, nextId: undefined };
  }
  return {
    index,
    total: rows.length,
    prevId: index > 0 ? rows[index - 1]?.id : undefined,
    nextId: index < rows.length - 1 ? rows[index + 1]?.id : undefined,
  };
}

function buildManualReviewStatusCounts(rows: { status: ManualReviewStatus }[]) {
  return {
    all: rows.length,
    pending: rows.filter((row) => row.status === "pending").length,
    approved: rows.filter((row) => row.status === "approved").length,
    returned: rows.filter((row) => row.status === "returned").length,
    rejected: rows.filter((row) => row.status === "rejected").length,
  };
}

function buildAuditPoolSearch({
  status,
  groupBy,
  browseQ,
  scope,
  reviewLevel,
}: {
  status: ManualReviewStatus | "all";
  groupBy: AuditPoolGroupBy;
  browseQ: string;
  scope: AuditPoolQueueScope | null;
  reviewLevel: string;
}): string {
  const params = new URLSearchParams();
  if (status !== "pending") {
    params.set("status", status);
  }
  if (reviewLevel && reviewLevel !== "L1") {
    params.set("reviewLevel", reviewLevel);
  }
  if (groupBy !== "task") {
    params.set("groupBy", groupBy);
  }
  const keyword = browseQ.trim();
  if (keyword) {
    params.set("browseQ", keyword);
  }
  if (scope && scope.items.length > 0) {
    params.set("scopeType", scope.type);
    params.set("scopeIds", serializeScopeIds(scope.items));
    params.set("scopeLabel", formatAuditPoolQueueScopeLabel(scope));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

const PAGE_MODE_CONFIG: Record<
  ReviewAuditPoolEntryMode,
  {
    listPath: string;
    workPath: string;
    browseTitle: string;
    browseDescription: string;
    emptyHint: string;
    openBrowseLabel: string;
  }
> = {
  "audit-pool": {
    listPath: "/reviewer/audit-pool",
    workPath: "/reviewer/audit-pool/:reviewId",
    browseTitle: "选择审核范围",
    browseDescription: "支持多选与全选本页；确认后由服务端按 scopeIds 分页加载队列。",
    emptyHint: "请先从任务视图勾选分组（可多选），再加载审核队列",
    openBrowseLabel: "打开任务视图",
  },
  batch: {
    listPath: "/reviewer/batch",
    workPath: "/reviewer/batch/:reviewId",
    browseTitle: "选择批量审核范围",
    browseDescription: "先圈定任务/标注员/题目范围，再批量勾选待审条目统一提交审核意见。",
    emptyHint: "批量审核需要先选定审核范围，进入后会自动打开范围抽屉。",
    openBrowseLabel: "选择批量范围",
  },
};

const MANUAL_REVIEW_STATUS_FILTER_VALUES = new Set<ManualReviewStatus | "all">([
  "all",
  "pending",
  "approved",
  "returned",
  "rejected",
]);

const AUDIT_POOL_GROUP_BY_VALUES = new Set<AuditPoolGroupBy>(["task", "labeler", "item"]);

function parseAuditPoolReviewId(pathname: string, workPath: string): string | undefined {
  return matchPath({ path: workPath, end: true }, pathname)?.params.reviewId;
}

function isAuditPoolPath(pathname: string, listPath: string, workPath: string): boolean {
  return pathname === listPath || Boolean(matchPath({ path: workPath, end: true }, pathname));
}

function parseScopeFromSearchParams(searchParams: URLSearchParams): AuditPoolQueueScope | null {
  const scopeType = searchParams.get("scopeType");
  const scopeIds = parseScopeIdsParam(searchParams.get("scopeIds") ?? searchParams.get("scopeId"));
  if (!scopeType || scopeIds.length === 0 || !AUDIT_POOL_GROUP_BY_VALUES.has(scopeType as AuditPoolGroupBy)) {
    return null;
  }
  const summaryLabel = searchParams.get("scopeLabel");
  return {
    type: scopeType as AuditPoolGroupBy,
    items: scopeIds.map((id, index) => ({
      id,
      label: scopeIds.length === 1 && summaryLabel ? summaryLabel : id,
      subtitle: index === 0 && scopeIds.length > 1 ? summaryLabel ?? undefined : undefined,
    })),
  };
}

interface ReviewAuditPoolPageProps {
  entryMode?: ReviewAuditPoolEntryMode;
}

export function ReviewAuditPoolPage({ entryMode = "audit-pool" }: ReviewAuditPoolPageProps) {
  const modeConfig = PAGE_MODE_CONFIG[entryMode];
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const reviewId = useMemo(() => parseAuditPoolReviewId(pathname, modeConfig.workPath), [modeConfig.workPath, pathname]);
  const onAuditPoolPage = isAuditPoolPath(pathname, modeConfig.listPath, modeConfig.workPath);

  const focusMode = useAppShellStore((state) => state.focusMode);
  const enterFocusMode = useAppShellStore((state) => state.enterFocusMode);
  const exitFocusMode = useAppShellStore((state) => state.exitFocusMode);

  const rows = useReviewerAuditPoolSessionStore((state) => state.rows);
  const queueScope = useReviewerAuditPoolSessionStore((state) => state.queueScope);
  const queueTotal = useReviewerAuditPoolSessionStore((state) => state.queueTotal);
  const queueLoading = useReviewerAuditPoolSessionStore((state) => state.queueLoading);
  const queueLoadingMore = useReviewerAuditPoolSessionStore((state) => state.queueLoadingMore);
  const groupBy = useReviewerAuditPoolSessionStore((state) => state.groupBy);
  const groupBrowseKeyword = useReviewerAuditPoolSessionStore((state) => state.groupBrowseKeyword);
  const groups = useReviewerAuditPoolSessionStore((state) => state.groups);
  const groupsTotal = useReviewerAuditPoolSessionStore((state) => state.groupsTotal);
  const groupsLoading = useReviewerAuditPoolSessionStore((state) => state.groupsLoading);
  const groupsLoadingMore = useReviewerAuditPoolSessionStore((state) => state.groupsLoadingMore);
  const loadQueue = useReviewerAuditPoolSessionStore((state) => state.loadQueue);
  const loadMoreQueue = useReviewerAuditPoolSessionStore((state) => state.loadMoreQueue);
  const loadGroups = useReviewerAuditPoolSessionStore((state) => state.loadGroups);
  const loadMoreGroups = useReviewerAuditPoolSessionStore((state) => state.loadMoreGroups);
  const setQueueScope = useReviewerAuditPoolSessionStore((state) => state.setQueueScope);
  const setGroupBy = useReviewerAuditPoolSessionStore((state) => state.setGroupBy);
  const setGroupBrowseKeyword = useReviewerAuditPoolSessionStore((state) => state.setGroupBrowseKeyword);
  const resetSession = useReviewerAuditPoolSessionStore((state) => state.reset);
  const detail = useReviewerAuditPoolSessionStore((state) => state.detail);
  const ensureDetail = useReviewerAuditPoolSessionStore((state) => state.ensureDetail);
  const decideSubmission = useReviewerAuditPoolSessionStore((state) => state.decideSubmission);
  const reviewLevel = useReviewerAuditPoolSessionStore((state) => state.reviewLevel);
  const levelMeta = useReviewerAuditPoolSessionStore((state) => state.levelMeta);
  const levelMetaLoading = useReviewerAuditPoolSessionStore((state) => state.levelMetaLoading);
  const setReviewLevel = useReviewerAuditPoolSessionStore((state) => state.setReviewLevel);
  const loadLevelMeta = useReviewerAuditPoolSessionStore((state) => state.loadLevelMeta);

  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>([]);
  const [batchComment, setBatchComment] = useState("");
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  const rawStatus = searchParams.get("status");
  const statusFilter: ManualReviewStatus | "all" =
    rawStatus && MANUAL_REVIEW_STATUS_FILTER_VALUES.has(rawStatus as ManualReviewStatus | "all")
      ? (rawStatus as ManualReviewStatus | "all")
      : "pending";

  const rawGroupBy = searchParams.get("groupBy");
  const queueGroupBy: AuditPoolGroupBy =
    rawGroupBy && AUDIT_POOL_GROUP_BY_VALUES.has(rawGroupBy as AuditPoolGroupBy)
      ? (rawGroupBy as AuditPoolGroupBy)
      : "task";

  const browseQ = searchParams.get("browseQ") ?? "";
  const urlReviewLevel = searchParams.get("reviewLevel") ?? "L1";
  const scopeSearchKey = useMemo(
    () =>
      auditPoolQueueScopeKey(parseScopeFromSearchParams(searchParams)),
    [searchParams],
  );

  useEffect(() => () => resetSession(), [resetSession]);

  useEffect(() => {
    setGroupBy(queueGroupBy);
    setGroupBrowseKeyword(browseQ);
  }, [browseQ, queueGroupBy, setGroupBrowseKeyword, setGroupBy]);

  useEffect(() => {
    if (urlReviewLevel) {
      setReviewLevel(urlReviewLevel);
    }
  }, [setReviewLevel, urlReviewLevel]);

  useEffect(() => {
    const scope = parseScopeFromSearchParams(searchParams);
    setQueueScope(scope);
  }, [scopeSearchKey, searchParams, setQueueScope]);

  useEffect(() => {
    void loadLevelMeta().catch((error: unknown) => {
      appMessage.errorUnlessHandled(formatReviewAccessError(error, "加载审核级别信息失败"), error);
    });
  }, [loadLevelMeta, auditPoolQueueScopeKey(queueScope)]);

  useEffect(() => {
    if (!queueScope) {
      return;
    }
    void loadQueue({ reset: true }).catch((error: unknown) => {
      appMessage.errorUnlessHandled(formatReviewAccessError(error, "加载审核队列失败"), error);
    });
  }, [loadQueue, auditPoolQueueScopeKey(queueScope), reviewLevel]);

  useEffect(() => {
    setBatchSelectedIds([]);
  }, [reviewLevel, auditPoolQueueScopeKey(queueScope)]);

  const statusCounts = useMemo(() => buildManualReviewStatusCounts(rows), [rows]);

  const navigableRows = useMemo(() => {
    if (statusFilter === "all") {
      return rows;
    }
    return rows.filter((row) => row.status === statusFilter);
  }, [rows, statusFilter]);

  const currentId = reviewId ?? navigableRows[0]?.id ?? "";

  useEffect(() => {
    if (!currentId) {
      return;
    }
    let cancelled = false;
    void ensureDetail(currentId).catch((error: unknown) => {
      if (!cancelled) {
        appMessage.errorUnlessHandled(formatReviewAccessError(error, "加载审核详情失败"), error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [currentId, ensureDetail]);

  const queueNav = useMemo(() => resolveQueueNeighbors(navigableRows, currentId), [navigableRows, currentId]);
  const queueHasMore = rows.length < queueTotal;

  const syncSearch = useCallback(
    (patch: {
      status?: ManualReviewStatus | "all";
      groupBy?: AuditPoolGroupBy;
      browseQ?: string;
      scope?: AuditPoolQueueScope | null;
      reviewLevel?: string;
    }) => {
      const next = {
        status: patch.status ?? statusFilter,
        groupBy: patch.groupBy ?? queueGroupBy,
        browseQ: patch.browseQ ?? browseQ,
        scope: patch.scope === undefined ? queueScope : patch.scope,
        reviewLevel: patch.reviewLevel ?? reviewLevel,
      };
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          if (next.status === "pending") {
            params.delete("status");
          } else {
            params.set("status", next.status);
          }
          if (next.groupBy === "task") {
            params.delete("groupBy");
          } else {
            params.set("groupBy", next.groupBy);
          }
          const keyword = next.browseQ.trim();
          if (keyword) {
            params.set("browseQ", keyword);
          } else {
            params.delete("browseQ");
          }
          if (next.scope && next.scope.items.length > 0) {
            params.set("scopeType", next.scope.type);
            params.set("scopeIds", serializeScopeIds(next.scope.items));
            params.set("scopeLabel", formatAuditPoolQueueScopeLabel(next.scope));
            params.delete("scopeId");
          } else {
            params.delete("scopeType");
            params.delete("scopeId");
            params.delete("scopeIds");
            params.delete("scopeLabel");
          }
          if (next.reviewLevel && next.reviewLevel !== "L1") {
            params.set("reviewLevel", next.reviewLevel);
          } else {
            params.delete("reviewLevel");
          }
          return params;
        },
        { replace: true },
      );
    },
    [browseQ, queueGroupBy, queueScope, reviewLevel, setSearchParams, statusFilter],
  );

  useEffect(() => {
    if (!reviewId || queueScope?.items.length) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const submission = await fetchReviewerAuditPoolDetail(reviewId);
        if (cancelled || !submission.taskId) {
          return;
        }
        const scope = buildQueueScope("task", [
          {
            id: String(submission.taskId),
            label: submission.taskName?.trim() || String(submission.taskId),
          },
        ]);
        syncSearch({
          scope,
          status: "all",
          reviewLevel: submission.currentReviewLevel?.trim() || reviewLevel,
        });
      } catch (error: unknown) {
        if (!cancelled) {
          appMessage.errorUnlessHandled(formatReviewAccessError(error, "加载提交所属任务失败"), error);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queueScope, reviewId, reviewLevel, syncSearch]);

  useEffect(() => {
    if (!onAuditPoolPage || !currentId || reviewId || !queueScope?.items.length) {
      return;
    }
    const nextSearch = buildAuditPoolSearch({
      status: statusFilter,
      groupBy: queueGroupBy,
      browseQ,
      scope: queueScope,
      reviewLevel,
    });
    navigate(`${modeConfig.listPath}/${currentId}${nextSearch}`, { replace: true, preventScrollReset: true });
  }, [browseQ, currentId, modeConfig.listPath, navigate, onAuditPoolPage, queueGroupBy, queueScope, reviewId, reviewLevel, statusFilter]);

  const handleStatusFilterChange = useCallback(
    (status: ManualReviewStatus | "all") => {
      syncSearch({ status });
    },
    [syncSearch],
  );

  const handleGroupByChange = useCallback(
    (nextGroupBy: AuditPoolGroupBy) => {
      syncSearch({ groupBy: nextGroupBy });
    },
    [syncSearch],
  );

  const handleBrowseKeywordChange = useCallback(
    (keyword: string) => {
      syncSearch({ browseQ: keyword });
    },
    [syncSearch],
  );

  const handleReviewLevelChange = useCallback(
    (levelKey: string) => {
      setReviewLevel(levelKey);
      syncSearch({ reviewLevel: levelKey });
    },
    [setReviewLevel, syncSearch],
  );

  const pendingSelectableIds = useMemo(
    () => navigableRows.filter((row) => row.status === "pending").map((row) => row.id),
    [navigableRows],
  );

  const activeLevelMeta = useMemo(
    () => levelMeta.find((level) => level.levelKey === reviewLevel),
    [levelMeta, reviewLevel],
  );

  const handleToggleBatchSelected = useCallback((id: string, selected: boolean) => {
    setBatchSelectedIds((current) => {
      if (selected) {
        return current.includes(id) ? current : [...current, id];
      }
      return current.filter((item) => item !== id);
    });
  }, []);

  const handleSelectAllPending = useCallback(() => {
    setBatchSelectedIds(pendingSelectableIds);
  }, [pendingSelectableIds]);

  const handleClearBatchSelection = useCallback(() => {
    setBatchSelectedIds([]);
  }, []);

  const pollBatchOperation = useCallback(async (batchKey: string) => {
    const isInProgress = (status: string) => status === "PENDING" || status === "RUNNING";
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const operation = await fetchReviewerBatchOperation(batchKey);
      if (!isInProgress(operation.status)) {
        return operation;
      }
    }
    const last = await fetchReviewerBatchOperation(batchKey);
    if (isInProgress(last.status)) {
      throw new Error("批量审核处理超时，请稍后刷新列表或在运维中心重试异步任务");
    }
    return last;
  }, []);

  const runBatchAction = useCallback(
    async (action: "approve" | "reject" | "return") => {
      if (batchSelectedIds.length === 0) {
        return;
      }
      if (!batchComment.trim()) {
        appMessage.warning("请填写批量审核意见");
        return;
      }
      setBatchSubmitting(true);
      try {
        const submitted = await submitReviewerBatchDecision({
          action,
          submissionIds: batchSelectedIds,
          commentText: batchComment.trim(),
          reviewLevel,
        });
        const result = await pollBatchOperation(submitted.batchKey);
        appMessage.success(
          `批量处理完成：成功 ${result.successCount} 条，失败 ${result.failedCount} 条`,
        );
        setBatchComment("");
        setBatchSelectedIds([]);
        await Promise.all([loadLevelMeta(), loadQueue({ reset: true })]);
        if (currentId) {
          await ensureDetail(currentId, { force: true });
        }
      } catch (error: unknown) {
        appMessage.errorUnlessHandled(formatReviewAccessError(error, "批量审核失败"), error);
      } finally {
        setBatchSubmitting(false);
      }
    },
    [
      batchComment,
      batchSelectedIds,
      currentId,
      ensureDetail,
      loadLevelMeta,
      loadQueue,
      pollBatchOperation,
      reviewLevel,
    ],
  );

  const auditPoolBatch = useMemo<AuditPoolBatchSelectionState | null>(() => {
    if (!queueScope?.items.length) {
      return null;
    }
    return {
      selectedIds: batchSelectedIds,
      selectableIds: pendingSelectableIds,
      reviewLevelLabel: activeLevelMeta?.levelLabel ?? reviewLevel,
      isFinalReviewLevel: activeLevelMeta?.isFinal ?? false,
      batchComment,
      batchSubmitting,
      onToggleSelected: handleToggleBatchSelected,
      onSelectAllPending: handleSelectAllPending,
      onClearSelection: handleClearBatchSelection,
      onBatchCommentChange: setBatchComment,
      onBatchApprove: () => void runBatchAction("approve"),
      onBatchReject: () => void runBatchAction("reject"),
      onBatchReturn: () => void runBatchAction("return"),
    };
  }, [
    activeLevelMeta,
    batchComment,
    batchSelectedIds,
    batchSubmitting,
    handleClearBatchSelection,
    handleSelectAllPending,
    handleToggleBatchSelected,
    pendingSelectableIds,
    queueScope,
    reviewLevel,
    runBatchAction,
  ]);

  const handleApplyQueueScopes = useCallback(
    (scope: AuditPoolQueueScope) => {
      setQueueScope(scope);
      syncSearch({ scope });
    },
    [setQueueScope, syncSearch],
  );

  const handleClearScope = useCallback(() => {
    setQueueScope(null);
    syncSearch({ scope: null });
  }, [setQueueScope, syncSearch]);

  const handleReloadGroups = useCallback(() => {
    void loadGroups({ reset: true }).catch((error: unknown) => {
      appMessage.errorUnlessHandled(formatReviewAccessError(error, "加载分组列表失败"), error);
    });
  }, [loadGroups]);

  const handleLoadMoreGroups = useCallback(() => {
    void loadMoreGroups().catch((error: unknown) => {
      appMessage.errorUnlessHandled(formatReviewAccessError(error, "加载更多分组失败"), error);
    });
  }, [loadMoreGroups]);

  const handleLoadMoreQueue = useCallback(() => {
    void loadMoreQueue().catch((error: unknown) => {
      appMessage.errorUnlessHandled(formatReviewAccessError(error, "加载更多队列条目失败"), error);
    });
  }, [loadMoreQueue]);

  const handleSelectReview = useCallback(
    (id: string) => {
      if (id === reviewId) {
        return;
      }
      setComment("");
      const nextSearch = buildAuditPoolSearch({
        status: statusFilter,
        groupBy: queueGroupBy,
        browseQ,
        scope: queueScope,
        reviewLevel,
      });
      navigate(`${modeConfig.listPath}/${id}${nextSearch}`, { replace: true, preventScrollReset: true });
    },
    [browseQ, modeConfig.listPath, navigate, queueGroupBy, queueScope, reviewId, reviewLevel, statusFilter],
  );

  const handlePrev = useCallback(() => {
    if (queueNav.prevId) {
      handleSelectReview(queueNav.prevId);
    }
  }, [handleSelectReview, queueNav.prevId]);

  const handleNext = useCallback(() => {
    if (queueNav.nextId) {
      handleSelectReview(queueNav.nextId);
    }
  }, [handleSelectReview, queueNav.nextId]);

  const handleToggleFocusMode = useCallback(() => {
    if (focusMode) {
      exitFocusMode();
    } else {
      enterFocusMode();
    }
  }, [enterFocusMode, exitFocusMode, focusMode]);

  const runAction = useCallback(
    async (action: "approve" | "reject" | "return") => {
      if (!currentId) {
        return;
      }
      const labels = {
        approve: detail?.isFinalReviewLevel ? "通过并结案" : "通过并进入下一审",
        reject: "驳回",
        return: "打回",
      };
      if (!comment.trim()) {
        appMessage.warning("请填写审核意见");
        return;
      }
      setSaving(true);
      try {
        await decideSubmission(currentId, action, comment.trim());
        appMessage.success(`已${labels[action]}`);
        setComment("");
        if (queueNav.nextId) {
          handleSelectReview(queueNav.nextId);
        }
      } catch (error: unknown) {
        appMessage.errorUnlessHandled(formatReviewAccessError(error, "操作失败"), error);
      } finally {
        setSaving(false);
      }
    },
    [comment, currentId, decideSubmission, detail?.isFinalReviewLevel, handleSelectReview, queueNav.nextId],
  );

  useReviewerAuditPoolHotkeys({
    enabled: Boolean(reviewId) && onAuditPoolPage,
    canPrev: Boolean(queueNav.prevId),
    canNext: Boolean(queueNav.nextId),
    detail,
    saving,
    comment,
    onApprove: () => void runAction("approve"),
    onReject: () => void runAction("reject"),
    onReturn: () => void runAction("return"),
    onPrev: handlePrev,
    onNext: handleNext,
  });

  return (
    <ReviewWorkbenchV2
      rows={rows}
      detail={detail}
      currentId={currentId}
      auditPoolEntryMode={entryMode}
      statusFilter={statusFilter}
      queueScope={queueScope}
      queueGroupBy={groupBy}
      groupBrowseKeyword={groupBrowseKeyword}
      queueTotal={queueTotal}
      queueHasMore={queueHasMore}
      auditPoolGroups={groups}
      groupsTotal={groupsTotal}
      groupsLoading={groupsLoading}
      groupsLoadingMore={groupsLoadingMore}
      statusCounts={statusCounts}
      reviewLevel={reviewLevel}
      auditPoolLevelMeta={levelMeta}
      auditPoolLevelMetaLoading={levelMetaLoading}
      auditPoolBrowseTitle={modeConfig.browseTitle}
      auditPoolBrowseDescription={modeConfig.browseDescription}
      auditPoolEmptyHint={modeConfig.emptyHint}
      auditPoolOpenBrowseLabel={modeConfig.openBrowseLabel}
      onReviewLevelChange={handleReviewLevelChange}
      auditPoolBatch={auditPoolBatch}
      comment={comment}
      saving={saving}
      focusMode={focusMode}
      queueLoading={queueLoading}
      queueLoadingMore={queueLoadingMore}
      queueNav={queueNav}
      onStatusFilterChange={handleStatusFilterChange}
      onQueueGroupByChange={handleGroupByChange}
      onGroupBrowseKeywordChange={handleBrowseKeywordChange}
      onApplyQueueScopes={handleApplyQueueScopes}
      onClearQueueScope={handleClearScope}
      onReloadAuditPoolGroups={handleReloadGroups}
      onLoadMoreAuditPoolGroups={handleLoadMoreGroups}
      onLoadMoreQueue={handleLoadMoreQueue}
      onSelectReview={handleSelectReview}
      onCommentChange={setComment}
      onApprove={() => void runAction("approve")}
      onReject={() => void runAction("reject")}
      onReturn={() => void runAction("return")}
      onToggleFocusMode={handleToggleFocusMode}
      onPrev={handlePrev}
      onNext={handleNext}
    />
  );
}
