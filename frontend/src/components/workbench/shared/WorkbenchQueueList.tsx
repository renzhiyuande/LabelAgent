import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { StatusFilterTabs, type StatusFilterTab } from "./StatusFilterTabs";

export interface WorkbenchQueueItem {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: {
    label: string;
    variant?: "default" | "secondary" | "success" | "warning" | "destructive";
  };
}

interface WorkbenchQueueListProps {
  items: WorkbenchQueueItem[];
  currentItemId: string;
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  queueLocked?: boolean;
  onSelectItem: (itemId: string) => void;
  onLoadMore?: () => void;
  filters?: StatusFilterTab[];
  activeFilterId?: string;
  onFilterChange?: (filterId: string) => void;
  headerSummary?: ReactNode;
  footer?: ReactNode;
  emptyMessage?: string;
  /** 批量多选：仅用于人工审核池等场景 */
  selectedIds?: string[];
  onToggleSelected?: (itemId: string, selected: boolean) => void;
  selectableItemIds?: string[];
}

export function WorkbenchQueueList({
  items,
  currentItemId,
  loading = false,
  loadingMore = false,
  hasMore = false,
  queueLocked = false,
  onSelectItem,
  onLoadMore,
  filters,
  activeFilterId,
  onFilterChange,
  headerSummary,
  footer,
  emptyMessage = "当前筛选下暂无条目",
  selectedIds = [],
  onToggleSelected,
  selectableItemIds,
}: WorkbenchQueueListProps) {
  const selectionEnabled = Boolean(onToggleSelected && selectableItemIds);
  const selectedSet = new Set(selectedIds);
  return (
    <div className="flex h-full min-h-0 flex-col">
      {headerSummary || filters ? (
        <div className="shrink-0 space-y-2 border-b border-border/80 px-3 py-3">
          {headerSummary}
          {filters && activeFilterId && onFilterChange ? (
            <StatusFilterTabs tabs={filters} activeTabId={activeFilterId} onTabChange={onFilterChange} />
          ) : null}
        </div>
      ) : null}

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-3">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            items.map((item) => {
              const active = item.id === currentItemId;
              const canSelect = !selectableItemIds || selectableItemIds.includes(item.id);
              const checked = selectedSet.has(item.id);
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex w-full items-stretch gap-2 rounded-2xl border transition-colors duration-150",
                    active
                      ? "border-primary/20 bg-primary/10 shadow-sm dark:border-primary/40 dark:bg-primary/10"
                      : "border-border/80 bg-card",
                  )}
                >
                  {selectionEnabled && canSelect ? (
                    <label className="flex shrink-0 items-center px-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border"
                        checked={checked}
                        disabled={queueLocked}
                        onChange={(event) => onToggleSelected?.(item.id, event.target.checked)}
                        onClick={(event) => event.stopPropagation()}
                      />
                    </label>
                  ) : null}
                  <button
                    type="button"
                    disabled={queueLocked}
                    className={cn(
                      "min-w-0 flex-1 px-3 py-3 text-left hover:bg-muted/80",
                      selectionEnabled && !canSelect ? "opacity-60" : undefined,
                    )}
                    onClick={() => onSelectItem(item.id)}
                  >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                      {item.subtitle ? (
                        <p className="mt-1 truncate text-xs text-muted-foreground">{item.subtitle}</p>
                      ) : null}
                      {item.meta ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.meta}</p> : null}
                    </div>
                    {item.badge ? <Badge variant={item.badge.variant ?? "secondary"}>{item.badge.label}</Badge> : null}
                  </div>
                  </button>
                </div>
              );
            })
          )}

          {!loading && hasMore ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-1 w-full"
              disabled={loadingMore || queueLocked}
              onClick={() => onLoadMore?.()}
            >
              {loadingMore ? "加载中…" : "加载更多"}
            </Button>
          ) : null}
        </div>
      </ScrollArea>

      {footer ? <div className="shrink-0 border-t border-border/80 p-3">{footer}</div> : null}
    </div>
  );
}
