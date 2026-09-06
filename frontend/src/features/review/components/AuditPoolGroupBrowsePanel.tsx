import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { AuditPoolGroupResponse } from "../api/reviewer-workbench-api";
import { auditPoolGroupKey, type AuditPoolGroupBy } from "../types";
import { scopeItemFromGroup } from "../utils/audit-pool-scope";
import { REVIEWER_AUDIT_POOL_EMPTY_GROUPS_HINT } from "../utils/reviewer-task-access";
import { ReviewerTaskAccessHint } from "./ReviewerTaskAccessHint";

const GROUP_BY_OPTIONS: { id: AuditPoolGroupBy; label: string }[] = [
  { id: "task", label: "按标注任务" },
  { id: "labeler", label: "按标注员" },
  { id: "item", label: "按题目" },
];

export interface AuditPoolGroupBrowsePanelProps {
  groupBy: AuditPoolGroupBy;
  keyword: string;
  groups: AuditPoolGroupResponse[];
  groupsTotal: number;
  loading?: boolean;
  loadingMore?: boolean;
  initialSelectedKeys?: string[];
  onGroupByChange: (groupBy: AuditPoolGroupBy) => void;
  onKeywordChange: (keyword: string) => void;
  onReloadGroups: () => void;
  onLoadMoreGroups: () => void;
  onApplySelection: (groups: AuditPoolGroupResponse[]) => void;
}

export function AuditPoolGroupBrowsePanel({
  groupBy,
  keyword,
  groups,
  groupsTotal,
  loading,
  loadingMore,
  initialSelectedKeys = [],
  onGroupByChange,
  onKeywordChange,
  onReloadGroups,
  onLoadMoreGroups,
  onApplySelection,
}: AuditPoolGroupBrowsePanelProps) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set(initialSelectedKeys));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void onReloadGroups();
    }, 320);
    return () => window.clearTimeout(timer);
  }, [groupBy, keyword, onReloadGroups]);

  useEffect(() => {
    setSelectedKeys(new Set(initialSelectedKeys));
  }, [groupBy, initialSelectedKeys.join("|")]);

  const hasMore = groups.length < groupsTotal;
  const pageKeys = useMemo(() => groups.map((group) => auditPoolGroupKey(group.groupBy, group.scopeId)), [groups]);
  const allPageSelected = pageKeys.length > 0 && pageKeys.every((key) => selectedKeys.has(key));
  const somePageSelected = pageKeys.some((key) => selectedKeys.has(key));

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
    const selected = groups.filter((group) => selectedKeys.has(auditPoolGroupKey(group.groupBy, group.scopeId)));
    onApplySelection(selected);
  }

  const selectedCount = selectedKeys.size;
  const selectedSubmissionTotal = groups
    .filter((group) => selectedKeys.has(auditPoolGroupKey(group.groupBy, group.scopeId)))
    .reduce((sum, group) => sum + group.submissionCount, 0);

  return (
    <div className="flex min-h-[calc(100dvh-7.5rem)] min-w-0 flex-col">
      <div className="shrink-0 space-y-2 border-b border-border/80 px-1 pb-3">
        <ReviewerTaskAccessHint compact />
        <p className="text-sm text-muted-foreground">
          勾选分组后点击「加载队列」；仅展示您已获授权任务下的待审数据，支持多选。
        </p>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            value={keyword}
            placeholder="搜索任务、标注员、题目…"
            className="h-9"
            onChange={(event) => onKeywordChange(event.target.value)}
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
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
              onCheckedChange={() => toggleSelectAllPage()}
            />
            全选本页
          </label>
          {selectedCount > 0 ? (
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setSelectedKeys(new Set())}>
              清空已选
            </Button>
          ) : null}
          <span className="text-xs text-muted-foreground">
            已选 {selectedCount} 组
            {selectedSubmissionTotal > 0 ? ` · 约 ${selectedSubmissionTotal} 条提交` : ""}
          </span>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 py-2">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-14 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="space-y-2 px-2 py-8 text-center">
              <p className="text-sm text-muted-foreground">{REVIEWER_AUDIT_POOL_EMPTY_GROUPS_HINT}</p>
              {groupBy !== "task" ? (
                <p className="text-xs text-muted-foreground">可切换为「按标注任务」查看已授权任务。</p>
              ) : null}
            </div>
          ) : (
            groups.map((group) => {
              const key = auditPoolGroupKey(group.groupBy, group.scopeId);
              const checked = selectedKeys.has(key);
              return (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                    checked
                      ? "border-primary/30 bg-primary/10"
                      : "border-border/80 bg-card hover:bg-muted",
                  )}
                  onClick={() => toggleKey(key, !checked)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleKey(key, !checked);
                    }
                  }}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => toggleKey(key, value === true)}
                    onClick={(event) => event.stopPropagation()}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{group.scopeLabel}</p>
                    {group.scopeSubtitle ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{group.scopeSubtitle}</p>
                    ) : null}
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{group.submissionCount} 条待审提交</p>
                  </div>
                </div>
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
              onClick={() => void onLoadMoreGroups()}
            >
              {loadingMore ? "加载中…" : "加载更多分组"}
            </Button>
          ) : null}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border/80 pt-3">
        <Button type="button" className="w-full" disabled={selectedCount === 0} onClick={handleApply}>
          加载队列（{selectedCount} 个分组）
        </Button>
      </div>
    </div>
  );
}
