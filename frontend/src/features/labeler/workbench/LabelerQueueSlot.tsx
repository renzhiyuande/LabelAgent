import { useMemo, useState } from "react";
import { LayoutList, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { WorkbenchQueueList } from "@/components/workbench";
import { Button } from "@/components/ui/button";
import type { LabelerMyWorkRow } from "../api/labeler-work-api";
import { LabelerTaskBrowseDrawer } from "../work/components/LabelerTaskBrowseDrawer";
import { useLabelerWorkSessionStore } from "../work/stores/labeler-work-session";
import {
  formatLabelerQueueScopeLabel,
  type LabelerQueueScopeItem,
} from "../work/types/labeler-queue-scope";
import {
  countLabelerQueueFilters,
  filterLabelerQueueRows,
  LABELER_QUEUE_FILTER_META,
  type LabelerQueueFilter,
} from "../work/utils/queue-filter";
import {
  queueRowStatusLabel,
  queueRowStatusTone,
  resolveQueueRowSeqNo,
} from "../work/utils/queue-row-display";

type QueueViewMode = "inline" | "cards" | "json";

export interface LabelerQueueSlotProps {
  rows: LabelerMyWorkRow[];
  currentAssignmentId: string;
  currentOrdinalLabel?: string | null;
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  queueLocked?: boolean;
  mode?: QueueViewMode;
  onSelectAssignment: (assignmentId: string) => void;
  onLoadMore?: () => void;
  onApplyQueueScope?: (items: LabelerQueueScopeItem[]) => void | Promise<void>;
}

const FILTER_ORDER: LabelerQueueFilter[] = [
  "all",
  "open",
  "submitted",
  "needs_revision",
  "approved",
  "rejected",
];

export function LabelerQueueSlot({
  rows,
  currentAssignmentId,
  currentOrdinalLabel,
  loading = false,
  loadingMore = false,
  hasMore = false,
  queueLocked = false,
  mode = "inline",
  onSelectAssignment,
  onLoadMore,
  onApplyQueueScope,
}: LabelerQueueSlotProps) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<LabelerQueueFilter>("open");
  const [browseOpen, setBrowseOpen] = useState(false);
  const queueScope = useLabelerWorkSessionStore((state) => state.queueScope);
  const clearQueueScope = useLabelerWorkSessionStore((state) => state.clearQueueScope);
  const applyQueueScope = useLabelerWorkSessionStore((state) => state.applyQueueScope);

  const statusCounts = useMemo(() => countLabelerQueueFilters(rows), [rows]);
  const filteredRows = useMemo(() => filterLabelerQueueRows(rows, filter), [filter, rows]);

  const filters = FILTER_ORDER.map((id) => ({
    id,
    label: LABELER_QUEUE_FILTER_META[id],
    count: statusCounts[id],
  }));

  const items = useMemo(
    () =>
      filteredRows.map((row) => {
        const queueIndex = rows.findIndex((candidate) => candidate.assignmentId === row.assignmentId);
        const seqNo = resolveQueueRowSeqNo(row, queueIndex >= 0 ? queueIndex : 0);
        return {
          id: String(row.assignmentId),
          title: `第 ${seqNo} 题`,
          subtitle: row.itemId ? `#${row.itemId}` : undefined,
          meta: [row.taskName, row.sceneCode, `分配 ${row.assignmentId}`].filter(Boolean).join(" · "),
          badge: {
            label: queueRowStatusLabel(row),
            variant: queueRowStatusTone(row),
          },
        };
      }),
    [filteredRows, rows],
  );

  async function handleApplyScope(items: LabelerQueueScopeItem[]) {
    if (onApplyQueueScope) {
      await onApplyQueueScope(items);
      return;
    }
    const nextAssignmentId = await applyQueueScope(items);
    if (nextAssignmentId && nextAssignmentId !== currentAssignmentId) {
      onSelectAssignment(nextAssignmentId);
    }
  }

  if (mode === "json") {
    return (
      <pre className="min-h-[220px] overflow-auto bg-slate-950 p-3 text-xs leading-6 text-emerald-300">
        {JSON.stringify(
          {
            currentAssignmentId,
            currentOrdinalLabel,
            filter,
            queueScope,
            statusCounts,
            total: rows.length,
            rows: filteredRows,
          },
          null,
          2,
        )}
      </pre>
    );
  }

  if (!queueScope || queueScope.items.length === 0) {
    return (
      <>
        <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            请先从任务视图勾选任务（可多选），再加载标注队列
          </p>
          <Button type="button" variant="default" size="sm" className="rounded-full" onClick={() => setBrowseOpen(true)}>
            <LayoutList className="mr-1.5 h-4 w-4" />
            打开任务视图
          </Button>
        </div>
        <LabelerTaskBrowseDrawer
          open={browseOpen}
          onClose={() => setBrowseOpen(false)}
          activeScope={queueScope}
          onApplyScope={(items) => void handleApplyScope(items)}
        />
      </>
    );
  }

  const scopeSummary = formatLabelerQueueScopeLabel(queueScope);

  return (
    <>
      <WorkbenchQueueList
        items={items}
        currentItemId={currentAssignmentId}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        queueLocked={queueLocked}
        onSelectItem={onSelectAssignment}
        onLoadMore={onLoadMore}
        filters={filters}
        activeFilterId={filter}
        onFilterChange={(id) => setFilter(id as LabelerQueueFilter)}
        headerSummary={
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] text-slate-400">
                  标注任务 · 已选 {queueScope.items.length} 个
                </p>
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">{scopeSummary}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full px-2.5 text-xs"
                  onClick={() => setBrowseOpen(true)}
                >
                  调整
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => clearQueueScope()}
                  aria-label="清除范围"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              当前题号{" "}
              <span className="font-semibold text-slate-900 dark:text-slate-100">{currentOrdinalLabel ?? "—"}</span>
              <span className="px-1.5">·</span>
              已加载 {filteredRows.length} / 共 {rows.length} 题
            </p>
          </div>
        }
        emptyMessage="当前筛选下暂无题目"
        footer={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 w-full rounded-xl"
            onClick={() => navigate("/labeler/my-tasks")}
          >
            返回我的任务
          </Button>
        }
      />
      <LabelerTaskBrowseDrawer
        open={browseOpen}
        onClose={() => setBrowseOpen(false)}
        activeScope={queueScope}
        onApplyScope={(items) => void handleApplyScope(items)}
      />
    </>
  );
}
