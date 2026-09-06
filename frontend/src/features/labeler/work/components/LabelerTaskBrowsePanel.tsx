import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { fetchLabelerMyTasks, type LabelerMyTaskRow } from "../../api/labeler-work-api";
import type { LabelerQueueScopeItem } from "../types/labeler-queue-scope";

function taskKey(taskId: number): string {
  return String(taskId);
}

function toScopeItem(task: LabelerMyTaskRow): LabelerQueueScopeItem {
  return {
    taskId: task.taskId,
    taskName: task.taskName?.trim() || `任务 ${task.taskId}`,
    sceneCode: task.sceneCode,
    openCount: task.openCount,
    totalCount: task.totalCount,
  };
}

export interface LabelerTaskBrowsePanelProps {
  initialSelectedTaskIds?: number[];
  onApplySelection: (items: LabelerQueueScopeItem[]) => void;
}

export function LabelerTaskBrowsePanel({
  initialSelectedTaskIds = [],
  onApplySelection,
}: LabelerTaskBrowsePanelProps) {
  const [keyword, setKeyword] = useState("");
  const [tasks, setTasks] = useState<LabelerMyTaskRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set(initialSelectedTaskIds.map(taskKey)),
  );

  const loadTasks = useCallback(async (nextPage: number, append: boolean) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await fetchLabelerMyTasks({
        page: nextPage,
        pageSize: 20,
        keyword: keyword.trim() || undefined,
      });
      setTasks((current) => (append ? [...current, ...response.list] : response.list));
      setTotal(response.total);
      setPage(nextPage);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [keyword]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTasks(1, false);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [loadTasks]);

  useEffect(() => {
    setSelectedKeys(new Set(initialSelectedTaskIds.map(taskKey)));
  }, [initialSelectedTaskIds.join("|")]);

  const pageKeys = useMemo(() => tasks.map((task) => taskKey(task.taskId)), [tasks]);
  const allPageSelected = pageKeys.length > 0 && pageKeys.every((key) => selectedKeys.has(key));
  const hasMore = tasks.length < total;

  function toggleKey(key: string, checked: boolean) {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }

  function toggleSelectAllPage() {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (allPageSelected) {
        for (const key of pageKeys) {
          next.delete(key);
        }
      } else {
        for (const key of pageKeys) {
          next.add(key);
        }
      }
      return next;
    });
  }

  function handleApply() {
    const selected = tasks.filter((task) => selectedKeys.has(taskKey(task.taskId))).map(toScopeItem);
    if (selected.length === 0) {
      return;
    }
    onApplySelection(selected);
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Input
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        placeholder="搜索任务名称或编号"
        className="h-9"
      />

      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs text-slate-500">
          <Checkbox
            checked={allPageSelected}
            onCheckedChange={toggleSelectAllPage}
            aria-label="全选本页"
          />
          全选本页
        </label>
        <span className="text-xs text-slate-400">已选 {selectedKeys.size} 个任务</span>
      </div>

      <ScrollArea className="min-h-0 flex-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
        <div className="space-y-2 p-2">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-20 animate-pulse rounded-xl bg-muted"
                />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-slate-500">暂无领取任务</p>
          ) : (
            tasks.map((task) => {
              const key = taskKey(task.taskId);
              const checked = selectedKeys.has(key);
              return (
                <label
                  key={key}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                    checked
                      ? "border-primary/30 bg-primary/10"
                      : "border-border/80 bg-card hover:bg-muted",
                  )}
                >
                  <Checkbox checked={checked} onCheckedChange={(value) => toggleKey(key, value === true)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">
                      {task.taskName?.trim() || `任务 ${task.taskId}`}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {task.sceneCode ? `${task.sceneCode} · ` : ""}
                      待作答 {task.openCount ?? 0} / 共 {task.totalCount ?? 0} 题
                    </p>
                  </div>
                </label>
              );
            })
          )}

          {!loading && hasMore ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={loadingMore}
              onClick={() => void loadTasks(page + 1, true)}
            >
              {loadingMore ? "加载中…" : "加载更多任务"}
            </Button>
          ) : null}
        </div>
      </ScrollArea>

      <Button type="button" className="rounded-full" disabled={selectedKeys.size === 0} onClick={handleApply}>
        加载所选任务队列
      </Button>
    </div>
  );
}
