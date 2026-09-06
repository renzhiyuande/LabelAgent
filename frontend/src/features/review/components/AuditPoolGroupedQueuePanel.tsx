import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { StatusFilterTab } from "@/components/workbench";
import { StatusFilterTabs } from "@/components/workbench/shared/StatusFilterTabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { MANUAL_REVIEW_STATUS_META, type AuditPoolGroupBy, type ManualReviewRow, type ManualReviewStatus } from "../types";
import {
  buildAuditPoolQueueTree,
  collectAuditPoolExpandableIds,
  filterAuditPoolRows,
  listAuditPoolRootIds,
  type AuditPoolQueueTreeNode,
} from "../utils/audit-pool-queue-tree";

const GROUP_BY_OPTIONS: { id: AuditPoolGroupBy; label: string }[] = [
  { id: "task", label: "按标注任务" },
  { id: "labeler", label: "按标注员" },
  { id: "item", label: "按题目" },
];

export interface AuditPoolGroupedQueuePanelProps {
  rows: ManualReviewRow[];
  currentId: string;
  statusFilter: ManualReviewStatus | "all";
  groupBy: AuditPoolGroupBy;
  queueKeyword: string;
  loading?: boolean;
  queueLocked?: boolean;
  statusCounts?: Record<string, number>;
  onStatusFilterChange: (status: ManualReviewStatus | "all") => void;
  onGroupByChange: (groupBy: AuditPoolGroupBy) => void;
  onQueueKeywordChange: (keyword: string) => void;
  onSelectItem: (id: string) => void;
  /** 侧拉任务视图内不重复展示状态 Tab，由左侧队列负责 */
  showStatusFilters?: boolean;
}

function TreeBranch({
  node,
  depth,
  expanded,
  currentId,
  queueLocked,
  onToggle,
  onSelectItem,
}: {
  node: AuditPoolQueueTreeNode;
  depth: number;
  expanded: Set<string>;
  currentId: string;
  queueLocked?: boolean;
  onToggle: (id: string) => void;
  onSelectItem: (id: string) => void;
}) {
  if (node.leaf) {
    const row = node.leaf;
    const active = row.id === currentId;
    const meta = MANUAL_REVIEW_STATUS_META[row.status];
    return (
      <button
        type="button"
        disabled={queueLocked}
        className={cn(
          "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
          active
            ? "border-blue-200 bg-blue-50/90 shadow-sm dark:border-blue-500/40 dark:bg-blue-500/10"
            : "border-transparent bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80",
        )}
        style={{ marginLeft: depth * 12 }}
        onClick={() => onSelectItem(row.id)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">{node.label}</p>
            {node.subtitle ? <p className="mt-0.5 truncate text-xs text-slate-500">{node.subtitle}</p> : null}
            <p className="mt-0.5 truncate text-[11px] text-slate-400">
              {row.labeler} · 第 {row.itemSeqNo} 题 · {new Date(row.submittedAt).toLocaleString()}
            </p>
          </div>
          <Badge variant={meta.badge}>
            {row.aiScore != null ? `${meta.label} (${row.aiScore})` : meta.label}
          </Badge>
        </div>
      </button>
    );
  }

  const isOpen = expanded.has(node.id);
  return (
    <div className="space-y-1">
      <button
        type="button"
        className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
        style={{ paddingLeft: 8 + depth * 12 }}
        onClick={() => onToggle(node.id)}
      >
        {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        <span className="min-w-0 flex-1 truncate">{node.label}</span>
        <span className="shrink-0 text-xs text-slate-400">{node.count}</span>
      </button>
      {node.subtitle && isOpen ? (
        <p className="truncate text-[11px] text-slate-400" style={{ paddingLeft: 28 + depth * 12 }}>
          {node.subtitle}
        </p>
      ) : null}
      {isOpen
        ? node.children.map((child) => (
            <TreeBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              currentId={currentId}
              queueLocked={queueLocked}
              onToggle={onToggle}
              onSelectItem={onSelectItem}
            />
          ))
        : null}
    </div>
  );
}

export function AuditPoolGroupedQueuePanel({
  rows,
  currentId,
  statusFilter,
  groupBy,
  queueKeyword,
  loading,
  queueLocked,
  statusCounts = {},
  onStatusFilterChange,
  onGroupByChange,
  onQueueKeywordChange,
  onSelectItem,
  showStatusFilters = true,
}: AuditPoolGroupedQueuePanelProps) {
  const filters: StatusFilterTab[] = [
    { id: "all", label: "全部", count: statusCounts.all ?? rows.length },
    { id: "pending", label: MANUAL_REVIEW_STATUS_META.pending.label, count: statusCounts.pending ?? 0 },
    { id: "approved", label: MANUAL_REVIEW_STATUS_META.approved.label, count: statusCounts.approved ?? 0 },
    { id: "returned", label: MANUAL_REVIEW_STATUS_META.returned.label, count: statusCounts.returned ?? 0 },
    { id: "rejected", label: MANUAL_REVIEW_STATUS_META.rejected.label, count: statusCounts.rejected ?? 0 },
  ];

  const statusFilteredRows = useMemo(() => {
    if (statusFilter === "all") {
      return rows;
    }
    return rows.filter((row) => row.status === statusFilter);
  }, [rows, statusFilter]);

  const visibleRows = useMemo(
    () => filterAuditPoolRows(statusFilteredRows, queueKeyword),
    [queueKeyword, statusFilteredRows],
  );

  const tree = useMemo(() => buildAuditPoolQueueTree(visibleRows, groupBy), [groupBy, visibleRows]);

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const next = new Set<string>();
    collectAuditPoolExpandableIds(tree, currentId, next);
    for (const id of listAuditPoolRootIds(tree)) {
      next.add(id);
    }
    setExpanded(next);
  }, [currentId, groupBy, queueKeyword, statusFilter, tree]);

  function toggleGroup(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const pendingCount = statusCounts.pending ?? rows.filter((row) => row.status === "pending").length;
  const taskCount = new Set(visibleRows.map((row) => row.taskId)).size;
  const labelerCount = new Set(visibleRows.map((row) => row.labelerId)).size;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-2 border-b border-slate-200/80 px-3 py-3 dark:border-slate-800">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          待审核 <span className="font-semibold text-slate-900 dark:text-slate-50">{pendingCount}</span>
          {" · "}
          <span className="text-slate-500">
            {taskCount} 个任务 / {labelerCount} 位标注员 / {visibleRows.length} 条提交
          </span>
        </p>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            value={queueKeyword}
            placeholder="搜索任务、标注员、题号、提交单号…"
            className="h-9"
            onChange={(event) => onQueueKeywordChange(event.target.value)}
          />
          <Select value={groupBy} onValueChange={(value) => onGroupByChange(value as AuditPoolGroupBy)}>
            <SelectTrigger className="h-9 w-full min-w-[132px] sm:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GROUP_BY_OPTIONS.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {showStatusFilters ? (
          <StatusFilterTabs tabs={filters} activeTabId={statusFilter} onTabChange={(id) => onStatusFilterChange(id as ManualReviewStatus | "all")} />
        ) : null}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-3">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          ) : tree.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-slate-500">当前筛选下暂无待审条目</p>
          ) : (
            tree.map((node) => (
              <TreeBranch
                key={node.id}
                node={node}
                depth={0}
                expanded={expanded}
                currentId={currentId}
                queueLocked={queueLocked}
                onToggle={toggleGroup}
                onSelectItem={onSelectItem}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
