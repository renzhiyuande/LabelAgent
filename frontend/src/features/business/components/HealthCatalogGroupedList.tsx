import { useMemo } from "react";
import { FileStack, FolderKanban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { AiReviewHealthCatalogItem } from "@/features/business/owner-ai-review-health-api";

export interface HealthCatalogTaskGroup {
  taskId: string;
  taskTitle: string;
  taskCode?: string;
  templates: AiReviewHealthCatalogItem[];
}

export function groupCatalogByTask(catalog: AiReviewHealthCatalogItem[]): HealthCatalogTaskGroup[] {
  const map = new Map<string, HealthCatalogTaskGroup>();
  for (const item of catalog) {
    let group = map.get(item.taskId);
    if (!group) {
      group = {
        taskId: item.taskId,
        taskTitle: item.taskTitle,
        taskCode: item.taskCode,
        templates: [],
      };
      map.set(item.taskId, group);
    }
    group.templates.push(item);
  }

  for (const group of map.values()) {
    group.templates.sort((a, b) =>
      a.templateName.localeCompare(b.templateName, "zh-CN") ||
      (a.templateCode ?? "").localeCompare(b.templateCode ?? "", "zh-CN"),
    );
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      a.taskTitle.localeCompare(b.taskTitle, "zh-CN") ||
      (a.taskCode ?? "").localeCompare(b.taskCode ?? "", "zh-CN"),
  );
}

interface HealthCatalogGroupedListProps {
  catalog: AiReviewHealthCatalogItem[];
  currentTemplateId: string | null;
  loading?: boolean;
  loadingMore?: boolean;
  keyword?: string;
  total?: number;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onSelectTemplate: (templateId: string) => void;
  emptyMessage?: string;
}

function TaskListItem({
  group,
  active,
  onSelect,
}: {
  group: HealthCatalogTaskGroup;
  active: boolean;
  onSelect: () => void;
}) {
  const template = group.templates[0];
  if (!template) {
    return null;
  }

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-start gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition-colors",
        active
          ? "border-primary/25 bg-primary/10 shadow-sm"
          : "border-border/70 bg-card/80 hover:border-border hover:bg-muted/40",
      )}
      onClick={onSelect}
    >
      <FolderKanban className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-foreground">{group.taskTitle}</span>
          {group.taskCode ? (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
              {group.taskCode}
            </Badge>
          ) : null}
        </span>
        <span className="mt-1 flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <FileStack className="mt-px h-3 w-3 shrink-0" />
          <span className="min-w-0">
            <span className="block truncate">{template.templateName}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
              {template.templateCode ? <span>编码 {template.templateCode}</span> : null}
              <span>任务 #{group.taskId}</span>
            </span>
          </span>
        </span>
      </span>
    </button>
  );
}

export function HealthCatalogGroupedList({
  catalog,
  currentTemplateId,
  loading = false,
  loadingMore = false,
  keyword = "",
  total = 0,
  hasMore = false,
  onLoadMore,
  onSelectTemplate,
  emptyMessage = "暂无模板",
}: HealthCatalogGroupedListProps) {
  const groups = useMemo(() => groupCatalogByTask(catalog), [catalog]);

  const loadedTaskCount = groups.length;
  const hasKeyword = keyword.trim().length > 0;
  const showTotal = total > 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-1 border-b border-border/80 px-3 py-3">
        <p className="text-xs text-muted-foreground">
          已加载 {loadedTaskCount} 个任务
          {showTotal ? ` · 共 ${total} 个` : ""}
          {hasKeyword ? " · 远程搜索结果" : ""}
        </p>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-3">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            groups.map((group) => {
              const template = group.templates[0];
              if (!template) {
                return null;
              }

              return (
                <TaskListItem
                  key={group.taskId}
                  group={group}
                  active={template.templateId === currentTemplateId}
                  onSelect={() => onSelectTemplate(template.templateId)}
                />
              );
            })
          )}
          {hasMore && onLoadMore ? (
            <div className="px-2 pb-2">
              <button
                type="button"
                className="w-full rounded-xl border border-dashed border-border/70 px-3 py-2 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-50"
                onClick={onLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? "加载中…" : "加载更多"}
              </button>
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}
