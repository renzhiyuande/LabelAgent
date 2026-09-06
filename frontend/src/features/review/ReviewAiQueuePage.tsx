import { useCallback, useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { appMessage } from "@/lib/message";
import { useAppShellStore } from "@/stores/app-shell";
import { AiQueueWorkbenchV2 } from "./workbench";
import type { AiQueueStatus } from "./types";
import { useReviewerAiQueueSessionStore } from "./stores/reviewer-ai-queue-session";
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

export function ReviewAiQueuePage() {
  const { submissionId } = useParams<{ submissionId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const focusMode = useAppShellStore((state) => state.focusMode);
  const enterFocusMode = useAppShellStore((state) => state.enterFocusMode);
  const exitFocusMode = useAppShellStore((state) => state.exitFocusMode);

  const rows = useReviewerAiQueueSessionStore((state) => state.rows);
  const detail = useReviewerAiQueueSessionStore((state) => state.detail);
  const queueLoading = useReviewerAiQueueSessionStore((state) => state.queueLoading);
  const detailLoading = useReviewerAiQueueSessionStore((state) => state.detailLoading);
  const statusCounts = useReviewerAiQueueSessionStore((state) => state.statusCounts);
  const stats = useReviewerAiQueueSessionStore((state) => state.stats);
  const statsLoading = useReviewerAiQueueSessionStore((state) => state.statsLoading);
  const loadQueue = useReviewerAiQueueSessionStore((state) => state.loadQueue);
  const ensureDetail = useReviewerAiQueueSessionStore((state) => state.ensureDetail);
  const advanceSubmission = useReviewerAiQueueSessionStore((state) => state.advanceSubmission);
  const retryAiReview = useReviewerAiQueueSessionStore((state) => state.retryAiReview);
  const resetSession = useReviewerAiQueueSessionStore((state) => state.reset);

  const statusFilter = (searchParams.get("status") as AiQueueStatus | "all" | null) ?? "pending";

  const filteredRows = useMemo(() => {
    if (statusFilter === "all") {
      return rows;
    }
    return rows.filter((row) => row.status === statusFilter);
  }, [rows, statusFilter]);

  const currentId =
    submissionId && rows.some((row) => row.id === submissionId)
      ? submissionId
      : filteredRows[0]?.id ?? rows[0]?.id ?? "";

  const queueNav = useMemo(() => resolveQueueNeighbors(filteredRows, currentId), [filteredRows, currentId]);

  useEffect(() => {
    let cancelled = false;
    void loadQueue(statusFilter).catch((error: unknown) => {
      if (!cancelled) {
        appMessage.errorUnlessHandled(formatReviewAccessError(error, "加载 AI 预审队列失败"), error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loadQueue, statusFilter]);

  useEffect(() => {
    if (!currentId) {
      return;
    }
    let cancelled = false;
    void ensureDetail(currentId).catch((error: unknown) => {
      if (!cancelled) {
        appMessage.errorUnlessHandled(formatReviewAccessError(error, "加载预审详情失败"), error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [currentId, ensureDetail]);

  useEffect(() => () => resetSession(), [resetSession]);

  const handleSelectItem = useCallback(
    (id: string) => {
      navigate(`/reviewer/ai-queue/${id}?status=${statusFilter}`, { replace: true, preventScrollReset: true });
    },
    [navigate, statusFilter],
  );

  const handleStatusFilterChange = useCallback(
    (status: AiQueueStatus | "all") => {
      setSearchParams({ status }, { replace: true });
    },
    [setSearchParams],
  );

  const handlePrev = useCallback(() => {
    if (queueNav.prevId) {
      handleSelectItem(queueNav.prevId);
    }
  }, [handleSelectItem, queueNav.prevId]);

  const handleNext = useCallback(() => {
    if (queueNav.nextId) {
      handleSelectItem(queueNav.nextId);
    }
  }, [handleSelectItem, queueNav.nextId]);

  const handleToggleFocusMode = useCallback(() => {
    if (focusMode) {
      exitFocusMode();
    } else {
      enterFocusMode();
    }
  }, [enterFocusMode, exitFocusMode, focusMode]);

  const handleRetryFailed = useCallback(() => {
    if (!currentId) {
      return;
    }
    void retryAiReview(currentId)
      .then(() => appMessage.success("已触发 AI 预审重跑"))
      .catch((error: unknown) => {
        appMessage.errorUnlessHandled(formatReviewAccessError(error, "重跑失败"), error);
      });
  }, [currentId, retryAiReview]);

  const handleApprove = useCallback(() => {
    if (!currentId) {
      return;
    }
    void advanceSubmission(currentId, "pass")
      .then(() => {
        appMessage.success("已通过");
        handleNext();
      })
      .catch((error: unknown) => {
        appMessage.errorUnlessHandled(formatReviewAccessError(error, "操作失败"), error);
      });
  }, [advanceSubmission, currentId, handleNext]);

  const handleReject = useCallback(() => {
    if (!currentId) {
      return;
    }
    void advanceSubmission(currentId, "reject")
      .then(() => {
        appMessage.error("已驳回");
        handleNext();
      })
      .catch((error: unknown) => {
        appMessage.errorUnlessHandled(formatReviewAccessError(error, "操作失败"), error);
      });
  }, [advanceSubmission, currentId, handleNext]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case "a":
          handleApprove();
          break;
        case "r":
          handleReject();
          break;
        case "s":
          handleNext();
          break;
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handleApprove, handleNext, handleReject]);

  return (
    <AiQueueWorkbenchV2
      rows={rows}
      detail={detail}
      currentId={currentId}
      statusFilter={statusFilter}
      focusMode={focusMode}
      queueNav={queueNav}
      queueLoading={queueLoading}
      detailLoading={detailLoading}
      statusCounts={statusCounts}
      queueStats={stats}
      statsLoading={statsLoading}
      onStatusFilterChange={handleStatusFilterChange}
      onSelectItem={handleSelectItem}
      onPrev={handlePrev}
      onNext={handleNext}
      onToggleFocusMode={handleToggleFocusMode}
      onRetryFailed={handleRetryFailed}
    />
  );
}
