import { useMemo } from "react";
import type { StatusFilterTab, WorkbenchQueueItem } from "@/components/workbench";
import { WorkbenchQueueList } from "@/components/workbench";
import { AI_QUEUE_STATUS_META, type AiQueueRow, type AiQueueStatus } from "../types";
import type { AiQueueStatsResponse } from "../api/reviewer-workbench-api";
import { ReviewerTaskAccessHint } from "./ReviewerTaskAccessHint";

interface AiQueuePanelProps {
  rows: AiQueueRow[];
  currentId: string;
  statusFilter: AiQueueStatus | "all";
  loading?: boolean;
  queueLocked?: boolean;
  statusCounts?: Record<string, number>;
  queueStats?: AiQueueStatsResponse | null;
  statsLoading?: boolean;
  onStatusFilterChange: (status: AiQueueStatus | "all") => void;
  onSelectItem: (id: string) => void;
}

function formatStat(value: number | null | undefined, digits = 1, suffix = ""): string {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  return `${value.toFixed(digits)}${suffix}`;
}

export function AiQueuePanel({
  rows,
  currentId,
  statusFilter,
  loading,
  queueLocked,
  statusCounts = {},
  queueStats,
  statsLoading,
  onStatusFilterChange,
  onSelectItem,
}: AiQueuePanelProps) {
  const filters: StatusFilterTab[] = [
    { id: "all", label: "全部", count: statusCounts.all ?? rows.length },
    { id: "pending", label: AI_QUEUE_STATUS_META.pending.label, count: statusCounts.pending ?? 0 },
    { id: "passed", label: AI_QUEUE_STATUS_META.passed.label, count: statusCounts.passed ?? 0 },
    { id: "returned", label: AI_QUEUE_STATUS_META.returned.label, count: statusCounts.returned ?? 0 },
    { id: "manual", label: AI_QUEUE_STATUS_META.manual.label, count: statusCounts.manual ?? 0 },
    { id: "failed", label: AI_QUEUE_STATUS_META.failed.label, count: statusCounts.failed ?? 0 },
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
    meta: `${row.submitter} · ${new Date(row.submittedAt).toLocaleString()}`,
    badge: {
      label: row.hasRealAiReview
        ? `${AI_QUEUE_STATUS_META[row.status].label} (${row.aiInsight.overallScore})`
        : AI_QUEUE_STATUS_META[row.status].label,
      variant:
        row.aiInsight.status === "suggest_pass"
          ? "success"
          : row.aiInsight.status === "suggest_reject"
            ? "destructive"
            : "warning",
    },
  }));

  const summaryTaskName = queueStats?.taskName;

  return (
    <WorkbenchQueueList
      items={items}
      currentItemId={currentId}
      loading={loading}
      queueLocked={queueLocked}
      onSelectItem={onSelectItem}
      filters={filters}
      activeFilterId={statusFilter}
      onFilterChange={(id) => onStatusFilterChange(id as AiQueueStatus | "all")}
      headerSummary={
        <div className="space-y-2">
          <ReviewerTaskAccessHint compact />
          <div className="rounded-xl border border-border/80 bg-muted/80 px-3 py-2 text-xs text-muted-foreground">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span>
                吞吐{" "}
                <strong className="text-foreground">
                  {statsLoading ? "…" : formatStat(queueStats?.throughputPerSecond, 1)}
                </strong>
                /s
              </span>
              <span>
                均时{" "}
                <strong className="text-foreground">
                  {statsLoading ? "…" : formatStat(queueStats?.averageLatencySeconds, 1, "s")}
                </strong>
              </span>
              <span>
                重复率{" "}
                <strong className="text-foreground">
                  {statsLoading ? "…" : formatStat(queueStats?.duplicateRatePercent, 1, "%")}
                </strong>
              </span>
            </div>
            {summaryTaskName ? (
              <p className="mt-1 text-[11px] text-muted-foreground">{summaryTaskName}</p>
            ) : null}
          </div>
        </div>
      }
      emptyMessage="当前状态下暂无预审条目"
    />
  );
}
