import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Activity, Bot, GitBranch, Layers, Play, RefreshCw, Search, Sparkles } from "lucide-react";
import { matchPath, useLocation, useNavigate } from "react-router-dom";
import { AppPageContainer } from "@/app/layout/AppPageContainer";

import { HealthCatalogGroupedList } from "@/features/business/components/HealthCatalogGroupedList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { listTemplateVersions } from "@/features/template-designer/designer-api";
import type { TemplateVersionItem } from "@/features/template-designer/types";
import { appMessage } from "@/lib/message";
import { ApiError } from "@/utils/apiClient";
import { PromptSuggestionDetailDrawer } from "@/features/business/components/PromptSuggestionDetailDrawer";
import { startOptimizationResultWatch } from "@/features/notifications/utils/notification-auto-toast";
import {
  extractLatestHealthMetrics,
  fetchAiReviewHealthCatalog,
  fetchAiReviewHealthOverview,
  fetchPromptOptimizationTaskStatus,
  fetchPromptSuggestions,
  formatOptimizationOutcome,
  isTerminalOptimizationStatus,
  type PromptOptimizationTaskStatus,
  refreshAiReviewHealthOverview,
  triggerPromptOptimization,
  formatHealthRate,
  formatCalibrationRate,
  HEALTH_STATUS_META,
  SUGGESTION_STATUS_META,
  type AiReviewHealthCatalogItem,
  type AiReviewPromptHealthMetrics,
  type AiReviewPromptHealthOverview,
  type AiReviewPromptSuggestionSummary,
  type AiReviewScoreCalibrationSummary,
} from "@/features/business/owner-ai-review-health-api";

const AI_REVIEW_HEALTH_ROUTE = "/owner/ai-review-health/:templateId?";
const AGGREGATION_SCOPE_ALL = "__all_versions__";

function resolveTemplateId(routeParam?: string, queryParam?: string | null): string | null {
  const raw = routeParam?.trim() || queryParam?.trim() || "";
  if (!raw || !/^\d+$/.test(raw)) {
    return null;
  }
  return raw;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function createPollAbortSignal(timeoutMs: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cancel: () => window.clearTimeout(timeoutId),
  };
}

const OPTIMIZATION_POLL_MAX_ATTEMPTS = 450;
const OPTIMIZATION_POLL_INTERVAL_MS = 2000;

function isInFlightOptimizationStatus(status?: string | null): boolean {
  return status === "RUNNING" || status === "PENDING";
}

async function pollOptimizationUntilDone(
  templateId: string,
  knownSuggestionIds: Set<number>,
  isActive: () => boolean,
  onSuggestions: (suggestions: AiReviewPromptSuggestionSummary[]) => void,
  onOpenSuggestion: (suggestionId: number) => void,
  onRunningChange?: (running: boolean) => void,
  onTaskStatus?: (status: PromptOptimizationTaskStatus) => void,
) {
  const endOptimizationWatch = startOptimizationResultWatch();
  onRunningChange?.(true);
  try {
  for (let attempt = 0; attempt < OPTIMIZATION_POLL_MAX_ATTEMPTS && isActive(); attempt += 1) {
    await sleep(OPTIMIZATION_POLL_INTERVAL_MS);
    if (!isActive()) {
      return;
    }

    const poll = createPollAbortSignal(8000);
    try {
      const taskStatus = await fetchPromptOptimizationTaskStatus(templateId, poll.signal);
      if (!isTerminalOptimizationStatus(taskStatus.status)) {
        continue;
      }
      onTaskStatus?.(taskStatus);

      const suggestionList = await fetchPromptSuggestions({ templateId }, poll.signal);
      if (!isActive()) {
        return;
      }
      onSuggestions(suggestionList);

      const newcomer = suggestionList.find((item) => !knownSuggestionIds.has(item.id));
      if (newcomer) {
        appMessage.success("已生成新的提示词优化建议", newcomer.changeSummary || undefined);
        onOpenSuggestion(newcomer.id);
        return;
      }

      if (taskStatus.status === "SUCCESS") {
        const outcomeLabel = formatOptimizationOutcome(taskStatus);
        const detail =
          taskStatus.notificationBody?.trim() ||
          taskStatus.optimizationSummary?.trim() ||
          (outcomeLabel ? `结果：${outcomeLabel}` : undefined);
        if (taskStatus.optimizationOutcome === "SUGGESTION_CREATED") {
          appMessage.info("提示词优化任务已完成", detail ?? "已生成新的优化建议");
        } else {
          appMessage.info(
            outcomeLabel ? `提示词优化：${outcomeLabel}` : "提示词优化任务已完成",
            detail ?? "未生成新建议",
          );
        }
        return;
      }

      appMessage.error("提示词优化失败", taskStatus.lastErrorMessage ?? undefined);
      return;
    } catch {
      // 忽略单次轮询失败，继续等待任务终态
    } finally {
      poll.cancel();
    }
  }

  if (isActive()) {
    appMessage.info(
      "优化任务仍在执行中",
      "请稍后查看右上角通知，或在「异步任务」管理页查看任务状态",
    );
  }
  } finally {
    onRunningChange?.(false);
    endOptimizationWatch();
  }
}

function beginOptimizationPolling(
  templateId: string,
  knownSuggestionIds: Set<number>,
  watchGeneration: number,
  optimizationWatchRef: MutableRefObject<number>,
  onSuggestions: (suggestions: AiReviewPromptSuggestionSummary[]) => void,
  onOpenSuggestion: (suggestionId: number) => void,
  onRunningChange: (running: boolean) => void,
  onTaskStatus?: (status: PromptOptimizationTaskStatus) => void,
) {
  void pollOptimizationUntilDone(
    templateId,
    knownSuggestionIds,
    () => watchGeneration === optimizationWatchRef.current,
    onSuggestions,
    onOpenSuggestion,
    onRunningChange,
    onTaskStatus,
  );
}

function parseHealthPageSuggestionId(search: string): number | null {
  const raw = new URLSearchParams(search).get("suggestionId")?.trim() ?? "";
  if (!raw || !/^\d+$/.test(raw)) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseHealthPageTemplateId(pathname: string, search: string): string | null {
  const match = matchPath({ path: AI_REVIEW_HEALTH_ROUTE, end: true }, pathname);
  if (!match) {
    return null;
  }
  const fromRoute = match.params.templateId?.trim();
  if (fromRoute) {
    return resolveTemplateId(fromRoute);
  }
  return resolveTemplateId(undefined, new URLSearchParams(search).get("templateId"));
}

function parseHealthPageVersionId(search: string): string | null {
  const raw = new URLSearchParams(search).get("versionId")?.trim() ?? "";
  if (!raw || !/^\d+$/.test(raw)) {
    return null;
  }
  return raw;
}

function buildHealthPagePath(
  templateId: string,
  taskId: string,
  versionId?: string | null,
): string {
  const params = new URLSearchParams({ taskId });
  if (versionId) {
    params.set("versionId", versionId);
  }
  return `/owner/ai-review-health/${templateId}?${params.toString()}`;
}

function normalizeVersionDisplayName(version: TemplateVersionItem): string {
  const raw = version.templateName?.trim() || version.description?.trim() || "未命名版本";
  const stripped = raw
    .replace(new RegExp(`^v${version.versionNo}\\s*[·•.-]?\\s*`, "i"), "")
    .replace(new RegExp(`\\s*v${version.versionNo}\\s*$`, "i"), "")
    .trim();
  return stripped || raw;
}

function formatVersionScopeLabel(version: TemplateVersionItem, style: "compact" | "menu" = "menu"): string {
  const name = normalizeVersionDisplayName(version);
  const base = `v${version.versionNo} · ${name}`;
  if (!version.isCurrent) {
    return base;
  }
  return style === "compact" ? `${base}（当前）` : `${base} · 当前`;
}

const AGGREGATION_SCOPE_TRIGGER_CLASS =
  "h-10 w-full min-w-0 max-w-full gap-2 overflow-hidden rounded-xl bg-background/80 sm:max-w-[320px] [&>span]:min-w-0 [&>span]:flex-1 [&>span]:truncate [&>span]:text-left";

function AggregationScopeSelectValue({
  scopeValue,
  versions,
}: {
  scopeValue: string;
  versions: TemplateVersionItem[];
}) {
  if (scopeValue === AGGREGATION_SCOPE_ALL) {
    return <span className="block truncate">全版本汇总</span>;
  }
  const version = versions.find((item) => item.id === scopeValue);
  if (!version) {
    return <span className="block truncate">选择聚合范围</span>;
  }
  const label = formatVersionScopeLabel(version, "compact");
  return (
    <span className="block truncate" title={label}>
      {label}
    </span>
  );
}

function HealthStatusBadge({ status }: { status: keyof typeof HEALTH_STATUS_META }) {
  const meta = HEALTH_STATUS_META[status];
  const variant =
    meta.tone === "success" ? "default" : meta.tone === "warning" ? "secondary" : "destructive";
  return <Badge variant={variant}>{meta.label}</Badge>;
}

function MetricCard({
  label,
  value,
  hint,
  large,
}: {
  label: string;
  value: string;
  hint?: string;
  large?: boolean;
}) {
  return (
    <Card className="rounded-[24px] border-border/70 bg-card/90 shadow-[0_12px_32px_hsl(var(--foreground)/0.05)]">
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className={large ? "text-3xl md:text-4xl" : "text-2xl"}>{value}</CardTitle>
      </CardHeader>
      {hint ? <CardContent className="pt-0 text-xs text-muted-foreground">{hint}</CardContent> : null}
    </Card>
  );
}

function TrendTable({ trend }: { trend: AiReviewPromptHealthMetrics[] }) {
  if (!trend.length) {
    return (
      <div className="rounded-[20px] border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
        近 7 日暂无趋势数据
      </div>
    );
  }

  const rows = [...trend].sort((a, b) => a.metricDate.localeCompare(b.metricDate));

  return (
    <div className="overflow-hidden rounded-[20px] border border-border/70">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">日期</th>
            <th className="px-4 py-3 font-medium">样本量</th>
            <th className="px-4 py-3 font-medium">一致率</th>
            <th className="px-4 py-3 font-medium">申诉推翻率</th>
            <th className="px-4 py-3 font-medium">状态</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={`${item.metricDate}-${item.id ?? "row"}`} className="border-t border-border/60">
              <td className="px-4 py-3 text-foreground">{item.metricDate}</td>
              <td className="px-4 py-3 text-muted-foreground">{item.sampleCount}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatHealthRate(item.metrics.aiHumanAgreementRate)}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatHealthRate(item.metrics.aiRejectAppealPassRate)}
              </td>
              <td className="px-4 py-3">
                <HealthStatusBadge status={item.healthStatus} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScoreCalibrationSection({ summary }: { summary: AiReviewScoreCalibrationSummary }) {
  if (summary.totalReviewCount <= 0) {
    return (
      <div className="rounded-[20px] border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
        近窗口期内暂无 AI 预审记录，无法统计锚点校准。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="锚点校准占比"
          value={formatCalibrationRate(summary)}
          hint={`${summary.calibratedReviewCount} / ${summary.totalReviewCount} 条预审被校准`}
        />
        <MetricCard
          label="校准事件数"
          value={String(summary.calibrationEventCount)}
          hint="各维度 rawScore 被 clamp 到锚点区间的总次数"
        />
        <MetricCard
          label="展示说明"
          value="原始 ≠ 展示"
          hint="下方列表中的「展示分」为 Owner/审核员看到的最终分数"
        />
      </div>

      {summary.recentEntries.length > 0 ? (
        <div className="overflow-hidden rounded-[20px] border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">提交</th>
                <th className="px-4 py-3 font-medium">维度</th>
                <th className="px-4 py-3 font-medium">LLM 原始分</th>
                <th className="px-4 py-3 font-medium">展示分</th>
                <th className="px-4 py-3 font-medium">锚点</th>
                <th className="px-4 py-3 font-medium">时间</th>
              </tr>
            </thead>
            <tbody>
              {summary.recentEntries.map((entry, index) => (
                <tr
                  key={`${entry.submissionId}-${entry.dimensionKey}-${index}`}
                  className="border-t border-border/60"
                >
                  <td className="px-4 py-3 text-foreground">#{entry.submissionId}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {entry.dimensionName ?? entry.dimensionKey}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{entry.rawScore}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{entry.calibratedScore}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {entry.anchor != null && entry.tolerance != null
                      ? `${entry.anchor}±${entry.tolerance}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {entry.analyzedAt ? new Date(entry.analyzedAt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-[20px] border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
          近窗口期内无锚点校准事件（LLM 原始分均在锚点容差内）。
        </div>
      )}
    </div>
  );
}

function SuggestionsSection({
  suggestions,
  loading,
  lastOptimizationTask,
  onSelect,
}: {
  suggestions: AiReviewPromptSuggestionSummary[];
  loading: boolean;
  lastOptimizationTask: PromptOptimizationTaskStatus | null;
  onSelect: (id: number) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-[20px]" />
        <Skeleton className="h-16 w-full rounded-[20px]" />
      </div>
    );
  }

  if (!suggestions.length) {
    const outcomeLabel = lastOptimizationTask
      ? formatOptimizationOutcome(lastOptimizationTask)
      : null;
    const outcomeDetail =
      lastOptimizationTask?.notificationBody?.trim() ||
      lastOptimizationTask?.optimizationSummary?.trim() ||
      null;
    return (
      <div className="space-y-3">
        {outcomeLabel && lastOptimizationTask?.status === "SUCCESS" ? (
          <div className="rounded-[20px] border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-foreground">
            <p className="font-medium">最近一次优化：{outcomeLabel}</p>
            {outcomeDetail ? (
              <p className="mt-1 text-xs text-muted-foreground">{outcomeDetail}</p>
            ) : null}
          </div>
        ) : null}
        <div className="rounded-[20px] border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
          当前模板暂无待处理的优化建议
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {suggestions.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          className="flex w-full items-start justify-between gap-4 rounded-[20px] border border-border/70 bg-background/80 px-4 py-4 text-left transition hover:border-primary/40 hover:shadow-[0_12px_28px_hsl(var(--primary)/0.08)]"
        >
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-foreground">建议 #{item.id}</p>
              <Badge variant={SUGGESTION_STATUS_META[item.status]?.variant ?? "secondary"}>
                {SUGGESTION_STATUS_META[item.status]?.label ?? item.status}
              </Badge>
              {item.taskName ? (
                <Badge variant="outline" className="text-[10px]">
                  {item.taskName}
                </Badge>
              ) : null}
            </div>
            <p className="line-clamp-2 text-sm text-muted-foreground">{item.changeSummary || "—"}</p>
            <p className="text-xs text-muted-foreground">
              {item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}
            </p>
          </div>
          <span className="shrink-0 text-xs text-primary">查看详情</span>
        </button>
      ))}
    </div>
  );
}

const CATALOG_PAGE_SIZE = 20;
const CATALOG_SEARCH_DEBOUNCE_MS = 300;

function mergeCatalogItems(
  previous: AiReviewHealthCatalogItem[],
  incoming: AiReviewHealthCatalogItem[],
): AiReviewHealthCatalogItem[] {
  const map = new Map<string, AiReviewHealthCatalogItem>();
  for (const item of previous) {
    map.set(item.templateId, item);
  }
  for (const item of incoming) {
    map.set(item.templateId, item);
  }
  return Array.from(map.values()).sort(
    (a, b) =>
      a.taskTitle.localeCompare(b.taskTitle, "zh-CN") ||
      a.templateName.localeCompare(b.templateName, "zh-CN"),
  );
}

export function OwnerAiReviewHealthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isPageVisible = useMemo(
    () => Boolean(matchPath({ path: AI_REVIEW_HEALTH_ROUTE, end: true }, location.pathname)),
    [location.pathname],
  );
  const resolvedTemplateId = useMemo(
    () =>
      isPageVisible ? parseHealthPageTemplateId(location.pathname, location.search) : null,
    [isPageVisible, location.pathname, location.search],
  );
  const resolvedVersionId = useMemo(
    () => (isPageVisible ? parseHealthPageVersionId(location.search) : null),
    [isPageVisible, location.search],
  );

  const [catalog, setCatalog] = useState<AiReviewHealthCatalogItem[]>([]);
  const [templateVersions, setTemplateVersions] = useState<TemplateVersionItem[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogPage, setCatalogPage] = useState(1);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingMoreCatalog, setLoadingMoreCatalog] = useState(false);
  const [catalogKeyword, setCatalogKeyword] = useState("");
  const [debouncedCatalogKeyword, setDebouncedCatalogKeyword] = useState("");
  const [overview, setOverview] = useState<AiReviewPromptHealthOverview | null>(null);
  const [suggestions, setSuggestions] = useState<AiReviewPromptSuggestionSummary[]>([]);
  const [lastOptimizationTask, setLastOptimizationTask] =
    useState<PromptOptimizationTaskStatus | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [triggeringOptimization, setTriggeringOptimization] = useState(false);
  const [optimizationRunning, setOptimizationRunning] = useState(false);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const loadGenerationRef = useRef(0);
  const optimizationWatchRef = useRef(0);
  const catalogRequestRef = useRef(0);

  const catalogHasMore = catalog.length < catalogTotal;

  const selectedCatalogItem = useMemo(
    () => catalog.find((item) => item.templateId === resolvedTemplateId) ?? null,
    [catalog, resolvedTemplateId],
  );

  const latestMetrics = useMemo(() => extractLatestHealthMetrics(overview), [overview]);

  const aggregationScopeLabel = overview?.aggregationScope?.label ?? null;
  const scopeSelectValue = resolvedVersionId ?? AGGREGATION_SCOPE_ALL;

  const healthQueryParams = useMemo(
    () =>
      resolvedTemplateId == null
        ? null
        : {
            templateId: resolvedTemplateId,
            templateVersionId: resolvedVersionId,
          },
    [resolvedTemplateId, resolvedVersionId],
  );

  const loadCatalog = useCallback(
    async (options: {
      page: number;
      append?: boolean;
      keyword?: string;
      includeTemplateId?: string | null;
      signal?: AbortSignal;
    }) => {
      const requestId = ++catalogRequestRef.current;
      const isStale = () => requestId !== catalogRequestRef.current;

      if (options.append) {
        setLoadingMoreCatalog(true);
      } else {
        setLoadingCatalog(true);
      }

      try {
        const result = await fetchAiReviewHealthCatalog(
          {
            page: options.page,
            pageSize: CATALOG_PAGE_SIZE,
            keyword: options.keyword,
            includeTemplateId: options.includeTemplateId,
          },
          options.signal,
        );
        if (isStale()) {
          return null;
        }
        setCatalogTotal(result.total);
        setCatalogPage(result.page);
        setCatalog((previous) =>
          options.append ? mergeCatalogItems(previous, result.list) : result.list,
        );
        return result;
      } catch (error) {
        if (!options.signal?.aborted && !isStale()) {
          appMessage.errorFrom(error, "加载任务模板列表失败");
          if (!options.append) {
            setCatalog([]);
            setCatalogTotal(0);
          }
        }
        return null;
      } finally {
        if (!options.signal?.aborted && !isStale()) {
          if (options.append) {
            setLoadingMoreCatalog(false);
          } else {
            setLoadingCatalog(false);
          }
        }
      }
    },
    [],
  );

  const loadData = useCallback(
    async (
      query: { templateId: string; templateVersionId?: string | null },
      generation: number,
    ) => {
    const isStale = () => generation !== loadGenerationRef.current;

    setLoadingHealth(true);
    setLoadingSuggestions(true);

    try {
      const health = await fetchAiReviewHealthOverview(query);
      if (!isStale()) {
        setOverview(health);
      }
    } catch (error) {
      if (!isStale()) {
        appMessage.errorFrom(error, "加载 AI 预审质检数据失败");
        setOverview(null);
      }
    } finally {
      if (!isStale()) {
        setLoadingHealth(false);
      }
    }

    try {
      const [suggestionList, optimizationTask] = await Promise.all([
        fetchPromptSuggestions({ templateId: query.templateId }),
        fetchPromptOptimizationTaskStatus(query.templateId),
      ]);
      if (!isStale()) {
        setSuggestions(suggestionList);
        setLastOptimizationTask(optimizationTask);
      }
    } catch (error) {
      if (!isStale()) {
        setSuggestions([]);
        setLastOptimizationTask(null);
        if (!(error instanceof ApiError && error.status === 404)) {
          appMessage.errorFrom(error, "加载优化建议失败");
        }
      }
    } finally {
      if (!isStale()) {
        setLoadingSuggestions(false);
      }
    }
  },
    [],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedCatalogKeyword(catalogKeyword.trim());
    }, CATALOG_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [catalogKeyword]);

  useEffect(() => {
    if (!isPageVisible) {
      return;
    }
    const controller = new AbortController();
    void loadCatalog({
      page: 1,
      keyword: debouncedCatalogKeyword,
      signal: controller.signal,
    });
    return () => controller.abort();
  }, [debouncedCatalogKeyword, isPageVisible, loadCatalog]);

  useEffect(() => {
    if (!isPageVisible || resolvedTemplateId == null || loadingCatalog) {
      return;
    }
    if (catalog.some((item) => item.templateId === resolvedTemplateId)) {
      return;
    }
    const controller = new AbortController();
    void fetchAiReviewHealthCatalog(
      {
        page: 1,
        pageSize: 1,
        keyword: debouncedCatalogKeyword,
        includeTemplateId: resolvedTemplateId,
      },
      controller.signal,
    )
      .then((result) => {
        if (result.list.length === 0) {
          return;
        }
        setCatalog((previous) => mergeCatalogItems(previous, result.list));
      })
      .catch(() => {
        // 深链模板不存在时忽略，主列表仍可用
      });
    return () => controller.abort();
  }, [catalog, debouncedCatalogKeyword, isPageVisible, loadingCatalog, resolvedTemplateId]);

  useEffect(() => {
    if (!isPageVisible || loadingCatalog || catalog.length === 0 || resolvedTemplateId != null) {
      return;
    }
    const first = catalog[0];
    if (!first) {
      return;
    }
    navigate(buildHealthPagePath(first.templateId, first.taskId), { replace: true });
  }, [catalog, isPageVisible, loadingCatalog, navigate, resolvedTemplateId]);

  useEffect(() => {
    if (!isPageVisible || resolvedTemplateId == null) {
      setTemplateVersions([]);
      return;
    }
    let cancelled = false;
    setLoadingVersions(true);
    void listTemplateVersions(resolvedTemplateId)
      .then((versions) => {
        if (!cancelled) {
          setTemplateVersions(
            [...versions].sort(
              (a, b) => Number(b.versionNo) - Number(a.versionNo) || b.createdAt - a.createdAt,
            ),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTemplateVersions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingVersions(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isPageVisible, resolvedTemplateId]);

  useEffect(() => {
    if (!isPageVisible) {
      return;
    }
    if (resolvedTemplateId == null) {
      setOverview(null);
      setSuggestions([]);
      setLastOptimizationTask(null);
      return;
    }
    if (healthQueryParams == null) {
      return;
    }
    const generation = ++loadGenerationRef.current;
    void loadData(healthQueryParams, generation);
  }, [healthQueryParams, isPageVisible, loadData, resolvedTemplateId]);

  useEffect(() => {
    if (!isPageVisible) {
      return;
    }
    const suggestionId = parseHealthPageSuggestionId(location.search);
    if (suggestionId == null) {
      return;
    }
    setSelectedSuggestionId(suggestionId);
    setDrawerOpen(true);
  }, [isPageVisible, location.search]);

  useEffect(() => {
    optimizationWatchRef.current += 1;
    setOptimizationRunning(false);
  }, [resolvedTemplateId, resolvedVersionId]);

  useEffect(() => {
    if (!isPageVisible || resolvedTemplateId == null) {
      return;
    }
    let cancelled = false;
    const templateId = resolvedTemplateId;
    const watchGeneration = optimizationWatchRef.current;

    void (async () => {
      try {
        const taskStatus = await fetchPromptOptimizationTaskStatus(templateId);
        if (cancelled || !isInFlightOptimizationStatus(taskStatus.status)) {
          return;
        }
        beginOptimizationPolling(
          templateId,
          new Set(suggestions.map((item) => item.id)),
          watchGeneration,
          optimizationWatchRef,
          setSuggestions,
          (suggestionId) => {
            setSelectedSuggestionId(suggestionId);
            setDrawerOpen(true);
          },
          setOptimizationRunning,
          setLastOptimizationTask,
        );
      } catch {
        // 忽略恢复轮询失败
      }
    })();

    return () => {
      cancelled = true;
    };
    // suggestions 仅用于初始化 known ids，切换模板时已通过 watchGeneration 终止旧轮询
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPageVisible, resolvedTemplateId]);

  function handleSelectTemplate(templateId: string) {
    if (templateId === resolvedTemplateId) {
      return;
    }
    const item = catalog.find((entry) => entry.templateId === templateId);
    if (!item) {
      return;
    }
    navigate(buildHealthPagePath(templateId, item.taskId), { replace: true });
  }

  function handleScopeChange(nextScope: string) {
    if (resolvedTemplateId == null) {
      return;
    }
    const taskId =
      selectedCatalogItem?.taskId ??
      new URLSearchParams(location.search).get("taskId") ??
      "";
    const nextVersionId = nextScope === AGGREGATION_SCOPE_ALL ? null : nextScope;
    navigate(buildHealthPagePath(resolvedTemplateId, taskId, nextVersionId), { replace: true });
  }

  function handleSuggestionSelect(id: number) {
    setSelectedSuggestionId(id);
    setDrawerOpen(true);
  }

  const isBootstrapping =
    loadingCatalog || (catalog.length > 0 && resolvedTemplateId == null);

  async function handleRefreshMetrics() {
    if (healthQueryParams == null) {
      return;
    }
    setRefreshing(true);
    try {
      const health = await refreshAiReviewHealthOverview(healthQueryParams);
      setOverview(health);
      const suggestionList = await fetchPromptSuggestions({
        templateId: healthQueryParams.templateId,
      });
      setSuggestions(suggestionList);
      appMessage.success("已重新聚合健康指标与误判样本");
    } catch (error) {
      appMessage.errorFrom(error, "聚合健康指标失败");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleTriggerOptimization() {
    if (resolvedTemplateId == null) {
      return;
    }
    const templateId = resolvedTemplateId;
    const knownSuggestionIds = new Set(suggestions.map((item) => item.id));
    const watchGeneration = ++optimizationWatchRef.current;

    setTriggeringOptimization(true);
    try {
      await triggerPromptOptimization(templateId);
      appMessage.success("已提交提示词优化任务");
    } catch (error) {
      appMessage.errorFrom(error, "触发提示词优化失败");
      return;
    } finally {
      setTriggeringOptimization(false);
    }

    beginOptimizationPolling(
      templateId,
      knownSuggestionIds,
      watchGeneration,
      optimizationWatchRef,
      setSuggestions,
      (suggestionId) => {
        setSelectedSuggestionId(suggestionId);
        setDrawerOpen(true);
      },
      setOptimizationRunning,
      setLastOptimizationTask,
    );
  }

  return (
    <AppPageContainer
      title="AI 预审质检大屏"
      description="从左侧任务模板列表切换查看 AI–人工一致性、趋势与提示词优化建议，无需手动输入 ID。"
      extra={
        selectedCatalogItem ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{selectedCatalogItem.taskTitle}</Badge>
            {selectedCatalogItem.taskCode ? (
              <Badge variant="outline" className="text-[10px]">
                任务 {selectedCatalogItem.taskCode}
              </Badge>
            ) : null}
            <Badge variant="outline" className="gap-1">
              <Bot className="h-3.5 w-3.5" />
              {selectedCatalogItem.templateName}
            </Badge>
            {selectedCatalogItem.templateCode ? (
              <Badge variant="outline" className="text-[10px]">
                {selectedCatalogItem.templateCode}
              </Badge>
            ) : null}
          </div>
        ) : null
      }
    >
      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        <Card className="flex w-[min(100%,320px)] shrink-0 flex-col overflow-hidden rounded-[28px] border-border/70 bg-card/90">
          <CardHeader className="shrink-0 space-y-3 border-b border-border/60 pb-4">
            <div>
              <CardTitle className="text-base">任务与模板</CardTitle>
              <CardDescription>选择任务查看质检大屏</CardDescription>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={catalogKeyword}
                onChange={(event) => setCatalogKeyword(event.target.value)}
                placeholder="搜索任务名、编码或模板"
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <HealthCatalogGroupedList
              catalog={catalog}
              currentTemplateId={resolvedTemplateId}
              loading={loadingCatalog}
              loadingMore={loadingMoreCatalog}
              keyword={debouncedCatalogKeyword}
              total={catalogTotal}
              hasMore={catalogHasMore}
              onLoadMore={() => {
                if (loadingMoreCatalog || !catalogHasMore) {
                  return;
                }
                void loadCatalog({
                  page: catalogPage + 1,
                  append: true,
                  keyword: debouncedCatalogKeyword,
                });
              }}
              onSelectTemplate={handleSelectTemplate}
              emptyMessage={
                debouncedCatalogKeyword
                  ? "没有匹配的任务或模板"
                  : "暂无已关联模板的任务"
              }
            />
          </CardContent>
        </Card>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-auto pb-6">
          {isBootstrapping || (resolvedTemplateId != null && loadingHealth && !overview) ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-32 rounded-[24px]" />
              ))}
            </div>
          ) : !resolvedTemplateId ? (
            <Card className="rounded-[28px] border-dashed border-border/70 bg-card/70">
              <CardHeader>
                <CardTitle>请选择模板</CardTitle>
                <CardDescription>从左侧列表选择任务下的模板，即可查看质检大屏指标。</CardDescription>
              </CardHeader>
            </Card>
          ) : !latestMetrics ? (
            <Card className="rounded-[28px] border-dashed border-border/70 bg-card/70">
              <CardHeader className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <CardTitle>暂无健康指标</CardTitle>
                    <CardDescription>
                      当前聚合范围内尚无 AI 预审样本，或日批任务尚未完成。可切换范围后点击「立即聚合」。
                    </CardDescription>
                  </div>
                  <div className="w-full min-w-0 sm:max-w-[320px]">
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">聚合范围</span>
                    <Select
                      value={scopeSelectValue}
                      onValueChange={handleScopeChange}
                      disabled={loadingVersions}
                    >
                      <SelectTrigger className={AGGREGATION_SCOPE_TRIGGER_CLASS}>
                        <SelectValue placeholder="选择聚合范围">
                          <AggregationScopeSelectValue
                            scopeValue={scopeSelectValue}
                            versions={templateVersions}
                          />
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-w-[min(100vw-2rem,360px)]">
                        <SelectItem value={AGGREGATION_SCOPE_ALL}>全版本汇总</SelectItem>
                        {templateVersions.map((version) => (
                          <SelectItem key={version.id} value={version.id} className="truncate">
                            {formatVersionScopeLabel(version, "menu")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Button
                    variant="outline"
                    onClick={() => void handleRefreshMetrics()}
                    disabled={refreshing || loadingHealth}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {refreshing ? "聚合中…" : "立即聚合"}
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ) : (
            <>
              <Card className="rounded-[24px] border-border/70 bg-card/90 shadow-[0_8px_24px_hsl(var(--foreground)/0.04)]">
                <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex w-full min-w-0 flex-col gap-1.5 sm:w-auto sm:max-w-[320px]">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        聚合范围
                      </span>
                      <Select
                        value={scopeSelectValue}
                        onValueChange={handleScopeChange}
                        disabled={loadingVersions}
                      >
                        <SelectTrigger className={AGGREGATION_SCOPE_TRIGGER_CLASS}>
                          <SelectValue placeholder="选择聚合范围">
                            <AggregationScopeSelectValue
                              scopeValue={scopeSelectValue}
                              versions={templateVersions}
                            />
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-w-[min(100vw-2rem,360px)]">
                          <SelectItem value={AGGREGATION_SCOPE_ALL}>
                            <span className="flex items-center gap-2">
                              <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="truncate">全版本汇总</span>
                            </span>
                          </SelectItem>
                          {templateVersions.map((version) => (
                            <SelectItem key={version.id} value={version.id}>
                              <span className="flex min-w-0 items-center gap-2">
                                <GitBranch className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="truncate">{formatVersionScopeLabel(version, "menu")}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {aggregationScopeLabel ? (
                      <div className="flex flex-wrap items-center gap-2 sm:pl-2">
                        <Badge variant="secondary" className="gap-1 rounded-full px-3 py-1">
                          {overview?.aggregationScope?.mode === "VERSION" ? (
                            <GitBranch className="h-3.5 w-3.5" />
                          ) : (
                            <Layers className="h-3.5 w-3.5" />
                          )}
                          按 {aggregationScopeLabel} 聚合
                        </Badge>
                        {overview?.latest?.metricDate ? (
                          <span className="text-xs text-muted-foreground">
                            统计日 {overview.latest.metricDate} · 窗口 {overview.latest.windowDays} 天
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (healthQueryParams == null) {
                          return;
                        }
                        const generation = ++loadGenerationRef.current;
                        void loadData(healthQueryParams, generation);
                      }}
                      disabled={loadingHealth || loadingSuggestions}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      刷新
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleRefreshMetrics()}
                      disabled={refreshing || loadingHealth}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      {refreshing ? "聚合中…" : "立即聚合"}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => void handleTriggerOptimization()}
                      disabled={triggeringOptimization || optimizationRunning}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      {triggeringOptimization
                        ? "提交中…"
                        : optimizationRunning
                          ? "优化运行中…"
                          : "触发优化"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="AI–人工一致率"
                  value={formatHealthRate(latestMetrics.aiHumanAgreementRate)}
                  hint="AI 判定与人工真相标签一致的样本占比"
                  large
                />
                <MetricCard
                  label="申诉推翻率"
                  value={formatHealthRate(latestMetrics.aiRejectAppealPassRate)}
                  hint="AI 驳回后申诉通过的占比，偏高表示 AI 过严"
                  large
                />
                <MetricCard
                  label="样本量"
                  value={String(latestMetrics.sampleCount)}
                  hint={`近 ${overview?.latest?.windowDays ?? 30} 天纳入统计的样本数`}
                  large
                />
                <Card className="rounded-[24px] border-border/70 bg-card/90 shadow-[0_12px_32px_hsl(var(--foreground)/0.05)]">
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      健康状态
                    </CardDescription>
                    <CardTitle className="flex items-center gap-2 text-3xl md:text-4xl">
                      <HealthStatusBadge status={latestMetrics.healthStatus} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-xs text-muted-foreground">
                    人工驳回率 {formatHealthRate(latestMetrics.aiPassHumanRejectRate)} · 人工复核占比{" "}
                    {formatHealthRate(latestMetrics.requireHumanRatio)}
                  </CardContent>
                </Card>
              </section>

              <div className="grid gap-5 xl:grid-cols-2">
                <Card className="rounded-[28px] border-border/70 bg-card/90">
                  <CardHeader>
                    <CardTitle className="text-lg">近 7 日趋势</CardTitle>
                    <CardDescription>按日聚合的一致率、申诉推翻率与状态变化。</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TrendTable trend={overview?.trendLast7Days ?? []} />
                  </CardContent>
                </Card>

                <Card className="rounded-[28px] border-border/70 bg-card/90">
                  <CardHeader>
                    <CardTitle className="text-lg">锚点分数校准</CardTitle>
                    <CardDescription>
                      展示 LLM 原始分被 clamp 到维度锚点区间的记录，避免 Owner 误以为展示分即模型原始输出。
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScoreCalibrationSection
                      summary={
                        overview?.scoreCalibrationSummary ?? {
                          totalReviewCount: 0,
                          calibratedReviewCount: 0,
                          calibrationEventCount: 0,
                          recentEntries: [],
                        }
                      }
                    />
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {resolvedTemplateId ? (
            <Card className="rounded-[28px] border-border/70 bg-card/90">
              <CardHeader>
                <CardTitle className="text-lg">提示词优化建议</CardTitle>
                <CardDescription>
                  系统基于误判样本与离线 A/B 验证生成的候选 Prompt，需 Owner 确认后才会写入草稿版本。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SuggestionsSection
                  suggestions={suggestions}
                  loading={loadingSuggestions}
                  lastOptimizationTask={lastOptimizationTask}
                  onSelect={handleSuggestionSelect}
                />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <PromptSuggestionDetailDrawer
        suggestionId={selectedSuggestionId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onResolved={() => {
          if (healthQueryParams != null) {
            const generation = ++loadGenerationRef.current;
            void loadData(healthQueryParams, generation);
          }
        }}
      />
    </AppPageContainer>
  );
}
