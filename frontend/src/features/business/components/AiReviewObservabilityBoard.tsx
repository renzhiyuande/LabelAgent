import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Activity, Bot, Clock3, Maximize2, RefreshCw, Search, X, Zap } from "lucide-react";
import { AppPageContainer } from "@/app/layout/AppPageContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuditTimeline } from "@/components/workbench/shared/AuditTimeline";
import { appMessage } from "@/lib/message";
import { cn } from "@/lib/utils";
import {
  buildAiReviewExecutionTimelineEntries,
  resolveAiReviewStatusLabel,
} from "@/features/business/lib/ai-review-observability-labels";
import { AI_REVIEW_VERDICT_META } from "@/features/business/owner-ai-review-shared";
import {
  fetchAiReviewObservabilityOverview,
  fetchAiReviewObservabilityRecordDetail,
  fetchAiReviewObservabilityRecords,
  formatEstimatedCost,
  formatLatency,
  formatTokenCount,
  formatTokenUsage,
  formatTraceability,
  type AiReviewObservabilityOverview,
  type AiReviewObservabilityRecordDetail,
  type AiReviewObservabilityRecordSummary,
  type AiReviewTopKItem,
} from "@/features/business/ai-review-observability-api";

const POLL_INTERVAL_MS = 8000;
const PANEL_FLY_DURATION_MS = 360;
const PANEL_FLY_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

type PanelOriginRect = Pick<DOMRect, "top" | "left" | "width" | "height">;

function getExpandedPanelRect(): PanelOriginRect {
  const width = Math.min(window.innerWidth * 0.92, 1152);
  const height = Math.min(window.innerHeight * 0.92, Math.max(window.innerHeight - 24, 420));
  return {
    width,
    height,
    left: (window.innerWidth - width) / 2,
    top: (window.innerHeight - height) / 2,
  };
}

function buildPanelFlyStyle(rect: PanelOriginRect, animate: boolean): CSSProperties {
  const expanded = getExpandedPanelRect();
  const isExpanded =
    Math.abs(rect.width - expanded.width) < 12 && Math.abs(rect.height - expanded.height) < 12;

  const motionTransition = animate
    ? `left ${PANEL_FLY_DURATION_MS}ms ${PANEL_FLY_EASING}, top ${PANEL_FLY_DURATION_MS}ms ${PANEL_FLY_EASING}, width ${PANEL_FLY_DURATION_MS}ms ${PANEL_FLY_EASING}, height ${PANEL_FLY_DURATION_MS}ms ${PANEL_FLY_EASING}, border-radius ${PANEL_FLY_DURATION_MS}ms ${PANEL_FLY_EASING}, box-shadow ${PANEL_FLY_DURATION_MS}ms ${PANEL_FLY_EASING}`
    : "none";

  return {
    position: "fixed",
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    margin: 0,
    maxWidth: "none",
    maxHeight: "none",
    transform: "none",
    borderRadius: isExpanded ? 16 : 24,
    transition: motionTransition,
  };
}

type DashboardPanelId = "throughput" | "records" | "models" | "topk";

const PANEL_META: Record<DashboardPanelId, { title: string; description: string }> = {
  throughput: { title: "吞吐趋势", description: "近 24 小时分桶统计" },
  records: { title: "执行记录", description: "筛选并查看 AI 审核执行明细" },
  models: { title: "模型分布 TopK", description: "按模型聚合的调用与失败分布" },
  topk: { title: "异常 TopK", description: "最慢、失败与高重试样本" },
};

function SnapshotBlock({ title, content, className }: { title: string; content: string; className?: string }) {
  return (
    <div className={className}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <pre className="max-h-[min(420px,50vh)] min-w-0 overflow-auto whitespace-pre-wrap break-words rounded-[14px] border border-border/70 bg-muted/40 p-3 text-xs leading-6 text-foreground">
        {content || "（空）"}
      </pre>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  compact = false,
}: {
  label: string;
  value: string;
  hint?: string;
  compact?: boolean;
}) {
  return (
    <Card className="rounded-[20px] border-border/70 bg-card/90 shadow-[0_8px_24px_hsl(var(--foreground)/0.04)]">
      <CardHeader className={compact ? "space-y-1 p-4 pb-2" : "pb-2"}>
        <CardDescription className="text-xs">{label}</CardDescription>
        <CardTitle className={compact ? "text-2xl" : "text-3xl"}>{value}</CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent className={compact ? "px-4 pb-4 pt-0 text-xs text-muted-foreground" : "pt-0 text-xs text-muted-foreground"}>
          {hint}
        </CardContent>
      ) : null}
    </Card>
  );
}

function PreviewDashboardCard({
  panelId,
  onOpen,
  title,
  description,
  icon,
  hidden,
  children,
}: {
  panelId: DashboardPanelId;
  onOpen: (panelId: DashboardPanelId, origin: PanelOriginRect) => void;
  title: string;
  description?: string;
  icon: ReactNode;
  hidden?: boolean;
  children: ReactNode;
}) {
  return (
    <Card
      className={cn(
        "group flex h-full min-h-0 cursor-pointer flex-col overflow-hidden rounded-[24px] border-border/70 transition-all duration-200 hover:border-primary/35 hover:shadow-[0_12px_32px_hsl(var(--foreground)/0.08)]",
        hidden && "pointer-events-none opacity-0",
      )}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        onOpen(panelId, {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      }}
    >
      <CardHeader className="shrink-0 space-y-1 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              {icon}
              {title}
            </CardTitle>
            {description ? <CardDescription className="mt-1 line-clamp-1">{description}</CardDescription> : null}
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <Maximize2 className="h-4 w-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative min-h-0 flex-1 overflow-hidden pb-4 pt-0">
        <div className="pointer-events-none h-full overflow-hidden">{children}</div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card via-card/80 to-transparent" />
      </CardContent>
    </Card>
  );
}

function FlyInDashboardPanelDialog({
  panelId,
  open,
  originRect,
  onOpenChange,
  icon,
  children,
}: {
  panelId: DashboardPanelId | null;
  open: boolean;
  originRect: PanelOriginRect | null;
  onOpenChange: (open: boolean) => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  const meta = panelId ? PANEL_META[panelId] : null;
  const closeTimerRef = useRef<number | null>(null);
  const [motionRect, setMotionRect] = useState<PanelOriginRect>(getExpandedPanelRect);
  const [motionReady, setMotionReady] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useLayoutEffect(() => {
    if (!open || !originRect) {
      setMotionReady(false);
      setIsClosing(false);
      return;
    }

    setMotionRect(originRect);
    setMotionReady(false);
    setIsClosing(false);

    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setMotionReady(true);
        setMotionRect(getExpandedPanelRect());
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, panelId, originRect]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }

    if (isClosing) {
      return;
    }

    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
    }

    if (originRect) {
      setIsClosing(true);
      setMotionReady(true);
      setMotionRect(originRect);
      closeTimerRef.current = window.setTimeout(() => {
        setIsClosing(false);
        onOpenChange(false);
        closeTimerRef.current = null;
      }, PANEL_FLY_DURATION_MS);
      return;
    }

    onOpenChange(false);
  };

  const overlayOpacity = isClosing ? 0 : 0.7;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogOverlay
          className={cn(
            "fixed inset-0 z-50 bg-black transition-opacity ease-out",
            "data-[state=closed]:animate-none data-[state=open]:animate-none",
            !isClosing && open && "animate-in fade-in-0 duration-200",
          )}
          style={{
            opacity: overlayOpacity,
            transitionDuration: `${PANEL_FLY_DURATION_MS}ms`,
            pointerEvents: isClosing ? "none" : "auto",
          }}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden border border-border/80 bg-background shadow-2xl outline-none",
            "data-[state=open]:animate-none data-[state=closed]:animate-none",
          )}
          style={buildPanelFlyStyle(motionRect, motionReady)}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => {
            if (isClosing) {
              event.preventDefault();
            }
          }}
          onInteractOutside={(event) => {
            if (isClosing) {
              event.preventDefault();
            }
          }}
        >
          {meta ? (
            <>
              <DialogHeader className="border-b border-border/70 px-6 py-5">
                <DialogTitle className="flex items-center gap-2 text-xl">
                  {icon}
                  {meta.title}
                </DialogTitle>
                <DialogDescription>{meta.description}</DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
            </>
          ) : null}
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

function ThroughputPanelContent({
  trend,
  throughputMax,
  expanded,
}: {
  trend: AiReviewObservabilityOverview["throughputTrend"];
  throughputMax: number;
  expanded: boolean;
}) {
  return (
    <div className={cn("h-full space-y-1.5", expanded && "min-h-0 overflow-y-auto pr-1")}>
      {trend.map((point) => (
        <div key={point.bucketStart} className="space-y-0.5">
          <div className="flex items-center justify-between gap-2 text-[11px] leading-4 text-muted-foreground">
            <span className="shrink-0 tabular-nums">{point.bucketStart}</span>
            <span className="truncate text-right">
              {point.completedCount} 完成 · {point.failedCount} 失败 · {formatLatency(point.avgLatencyMs)}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-primary transition-all"
              style={{ width: `${Math.max(6, (point.completedCount / throughputMax) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function RecordsPanelContent({
  records,
  statusFilter,
  modelFilter,
  onStatusFilterChange,
  onModelFilterChange,
  onApplyFilter,
  onOpenDetail,
  expanded,
  showSensitive,
}: {
  records: AiReviewObservabilityRecordSummary[];
  statusFilter: string;
  modelFilter: string;
  onStatusFilterChange: (value: string) => void;
  onModelFilterChange: (value: string) => void;
  onApplyFilter: () => void;
  onOpenDetail: (id: string) => void;
  expanded: boolean;
  showSensitive: boolean;
}) {
  return (
    <div className={cn("flex h-full flex-col", expanded && "min-h-0")}>
      {expanded ? (
        <div className="mb-3 flex flex-wrap gap-2">
          <div className="relative min-w-[160px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="按状态筛选，如 SUCCESS"
              value={statusFilter}
              onChange={(event) => onStatusFilterChange(event.target.value)}
            />
          </div>
          {showSensitive ? (
            <Input
              className="min-w-[160px] flex-1"
              placeholder="按模型筛选"
              value={modelFilter}
              onChange={(event) => onModelFilterChange(event.target.value)}
            />
          ) : null}
          <Button variant="outline" onClick={onApplyFilter}>
            应用筛选
          </Button>
        </div>
      ) : null}
      <div className={cn("min-h-0", expanded ? "flex-1 overflow-auto" : "h-full overflow-hidden")}>
        <table className="w-full min-w-[640px] text-sm">
          <thead className={cn(
            "text-left text-xs uppercase tracking-wide text-muted-foreground",
            expanded && "sticky top-0 z-10 bg-card shadow-[0_1px_0_hsl(var(--border)/0.6)]",
          )}>
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">任务</th>
              {showSensitive ? <th className="px-3 py-2">模型</th> : null}
              <th className="px-3 py-2">状态</th>
              <th className="px-3 py-2">尝试</th>
              <th className="px-3 py-2">耗时</th>
              {showSensitive ? <th className="px-3 py-2">Token</th> : null}
              {showSensitive ? <th className="px-3 py-2">预估成本</th> : null}
              <th className="px-3 py-2">追溯</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr
                key={record.id}
                className="cursor-pointer border-t border-border/60 hover:bg-muted/30"
                onClick={() => onOpenDetail(record.id)}
              >
                <td className="px-3 py-2.5">{record.id}</td>
                <td className="max-w-[180px] truncate px-3 py-2.5">
                  {record.taskTitle || record.taskCode || record.taskId}
                </td>
                {showSensitive ? (
                  <td className="max-w-[140px] truncate px-3 py-2.5">{record.modelId}</td>
                ) : null}
                <td className="px-3 py-2.5">{record.status}</td>
                <td className="px-3 py-2.5">{record.attemptCount ?? "—"}</td>
                <td className="px-3 py-2.5">{formatLatency(record.totalLatencyMs)}</td>
                {showSensitive ? (
                  <td className="px-3 py-2.5 tabular-nums">{formatTokenCount(record.totalTokens)}</td>
                ) : null}
                {showSensitive ? (
                  <td className="px-3 py-2.5 tabular-nums">
                    {formatEstimatedCost(record.estimatedCost) ?? "—"}
                  </td>
                ) : null}
                <td className="px-3 py-2.5">{formatTraceability(record.traceabilityStatus)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModelsPanelContent({
  distribution,
  expanded,
}: {
  distribution: AiReviewObservabilityOverview["modelDistribution"];
  expanded: boolean;
}) {
  if (!distribution.length) {
    return (
      <div className="rounded-[14px] border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        暂无数据
      </div>
    );
  }

  return (
    <div className={cn("h-full space-y-2", expanded && "min-h-0 overflow-y-auto pr-1")}>
      {distribution.map((bucket) => (
        <div key={`${bucket.platformKey}-${bucket.modelId}`} className="rounded-[14px] border px-3 py-2 text-sm">
          <div className="truncate font-medium">{bucket.modelId}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {bucket.platformKey} · {bucket.count} 次 · 失败 {bucket.failedCount} · {formatLatency(bucket.avgLatencyMs)}
          </div>
        </div>
      ))}
    </div>
  );
}

function TopKPanelContent({
  overview,
  onSelect,
  expanded,
  showSensitive,
}: {
  overview: AiReviewObservabilityOverview;
  onSelect: (id: string) => void;
  expanded: boolean;
  showSensitive: boolean;
}) {
  return (
    <Tabs defaultValue="slow" className={cn("flex h-full flex-col", expanded && "min-h-0")}>
      <TabsList className="mb-3 grid h-auto w-full shrink-0 grid-cols-3 gap-1 rounded-[14px] bg-muted/60 p-1">
        <TabsTrigger value="slow" className="rounded-[10px] px-2 py-2 text-xs">
          最慢
        </TabsTrigger>
        <TabsTrigger value="failed" className="rounded-[10px] px-2 py-2 text-xs">
          失败
        </TabsTrigger>
        <TabsTrigger value="retry" className="rounded-[10px] px-2 py-2 text-xs">
          高重试
        </TabsTrigger>
      </TabsList>
      <TabsContent value="slow" className={cn("mt-0", expanded && "min-h-0 flex-1 overflow-y-auto pr-1")}>
        <TopKList items={overview.topSlow ?? []} onSelect={onSelect} showSensitive={showSensitive} />
      </TabsContent>
      <TabsContent value="failed" className={cn("mt-0", expanded && "min-h-0 flex-1 overflow-y-auto pr-1")}>
        <TopKList items={overview.topFailed ?? []} onSelect={onSelect} showSensitive={showSensitive} />
      </TabsContent>
      <TabsContent value="retry" className={cn("mt-0", expanded && "min-h-0 flex-1 overflow-y-auto pr-1")}>
        <TopKList items={overview.topRetry ?? []} onSelect={onSelect} showSensitive={showSensitive} />
      </TabsContent>
    </Tabs>
  );
}

function TopKList({
  items,
  onSelect,
  showSensitive,
}: {
  items: AiReviewTopKItem[];
  onSelect: (id: string) => void;
  showSensitive: boolean;
}) {
  if (!items.length) {
    return (
      <div className="rounded-[14px] border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        暂无数据
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <button
          key={item.aiReviewId}
          type="button"
          className="flex w-full items-start justify-between gap-3 rounded-[14px] border border-border/70 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
          onClick={() => onSelect(item.aiReviewId)}
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">
              {item.taskTitle || item.taskCode || `任务 ${item.taskId}`}
            </div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">
              审核 #{item.aiReviewId} · 提交 #{item.submissionId}
            </div>
          </div>
          <div className="shrink-0 text-right text-xs text-muted-foreground">
            {showSensitive ? <div className="max-w-[120px] truncate">{item.modelId}</div> : null}
            <div className={showSensitive ? "mt-0.5" : undefined}>{formatLatency(item.totalLatencyMs)}</div>
            {showSensitive ? (
              <div className="mt-0.5 tabular-nums">token {formatTokenCount(item.totalTokens)}</div>
            ) : null}
            {showSensitive && formatEstimatedCost(item.estimatedCost) ? (
              <div className="mt-0.5 tabular-nums">成本 {formatEstimatedCost(item.estimatedCost)}</div>
            ) : null}
          </div>
        </button>
      ))}
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-border/70 bg-muted/20 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function DetailDrawer({
  open,
  detail,
  loading,
  onOpenChange,
  showSensitive,
}: {
  open: boolean;
  detail: AiReviewObservabilityRecordDetail | null;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  showSensitive: boolean;
}) {
  const summary = detail?.summary;
  const timelineEntries = useMemo(
    () => (detail ? buildAiReviewExecutionTimelineEntries(detail) : []),
    [detail],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-6xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-border/70 px-6 py-5">
          <DialogTitle className="text-xl">AI 审核执行详情</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2 pt-1">
            {summary ? (
              <>
                <span>记录 #{summary.id}</span>
                <Badge variant="secondary">{resolveAiReviewStatusLabel(summary.status)}</Badge>
                <span className="text-muted-foreground">·</span>
                <span>{formatLatency(summary.totalLatencyMs)}</span>
                {showSensitive ? (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span>{summary.modelId}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="tabular-nums">
                      {formatTokenUsage(summary.promptTokens, summary.completionTokens, summary.totalTokens)}
                    </span>
                    {formatEstimatedCost(summary.estimatedCost) ? (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span className="tabular-nums">预估成本 {formatEstimatedCost(summary.estimatedCost)}</span>
                      </>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : (
              "加载中..."
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 px-6 py-5">
            <Skeleton className="h-16 w-full rounded-[16px]" />
            <Skeleton className="h-48 w-full rounded-[16px]" />
          </div>
        ) : detail ? (
          <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-border/70 px-6 pt-4">
              <TabsList className="h-auto w-full justify-start gap-1 rounded-[14px] bg-muted/60 p-1">
                <TabsTrigger value="overview" className="rounded-[10px] px-4 py-2">
                  概览
                </TabsTrigger>
                <TabsTrigger value="timeline" className="rounded-[10px] px-4 py-2">
                  执行时间线
                </TabsTrigger>
                <TabsTrigger value="attempts" className="rounded-[10px] px-4 py-2">
                  Attempt 明细
                </TabsTrigger>
                {showSensitive ? (
                  <TabsTrigger value="snapshots" className="rounded-[10px] px-4 py-2">
                    Prompt / 响应
                  </TabsTrigger>
                ) : null}
              </TabsList>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <TabsContent value="overview" className="mt-0 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <DetailStat label="状态" value={resolveAiReviewStatusLabel(detail.summary.status)} />
                  {showSensitive ? <DetailStat label="模型" value={detail.summary.modelId} /> : null}
                  <DetailStat label="尝试次数" value={String(detail.summary.attemptCount ?? "—")} />
                  <DetailStat label="耗时" value={formatLatency(detail.summary.totalLatencyMs)} />
                  {showSensitive ? (
                    <>
                      <DetailStat
                        label="Token 用量"
                        value={formatTokenUsage(
                          detail.summary.promptTokens,
                          detail.summary.completionTokens,
                          detail.summary.totalTokens,
                        )}
                      />
                      <DetailStat
                        label="预估成本"
                        value={formatEstimatedCost(detail.summary.estimatedCost) ?? "未配置模型单价"}
                      />
                    </>
                  ) : null}
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  <DetailStat
                    label="任务"
                    value={detail.summary.taskTitle || detail.summary.taskCode || String(detail.summary.taskId)}
                  />
                  <DetailStat label="追溯状态" value={formatTraceability(detail.summary.traceabilityStatus)} />
                  <DetailStat label="提交 ID" value={detail.summary.submissionId} />
                  <DetailStat
                    label="结论"
                    value={
                      detail.summary.verdict
                        ? (AI_REVIEW_VERDICT_META[detail.summary.verdict]?.label ?? detail.summary.verdict)
                        : "—"
                    }
                  />
                </div>
                {detail.summary.failureReason ? (
                  <div className="rounded-[14px] border border-destructive/30 bg-destructive/5 px-4 py-3">
                    <p className="text-xs font-semibold text-destructive">失败原因</p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-destructive/90">
                      {detail.summary.failureReason}
                    </p>
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="timeline" className="mt-0">
                {timelineEntries.length ? (
                  <AuditTimeline entries={timelineEntries} title="执行时间线" variant="compact" />
                ) : (
                  <p className="text-sm text-muted-foreground">暂无时间线数据</p>
                )}
              </TabsContent>

              <TabsContent value="attempts" className="mt-0 space-y-3">
                {detail.attempts.length ? (
                  detail.attempts.map((attempt) => (
                    <div key={attempt.attemptNo} className="rounded-[14px] border px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">第 {attempt.attemptNo} 次</span>
                        <Badge variant={attempt.success ? "default" : "destructive"}>
                          {attempt.success ? "成功" : "失败"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatLatency(attempt.latencyMs)}
                        {showSensitive ? (
                          <>
                            {" "}
                            ·{" "}
                            {formatTokenUsage(attempt.promptTokens, attempt.completionTokens, attempt.totalTokens)} ·{" "}
                            {formatEstimatedCost(attempt.estimatedCost)
                              ? `预估成本 ${formatEstimatedCost(attempt.estimatedCost)}`
                              : "预估成本 —"}{" "}
                          </>
                        ) : null}
                        · {formatTraceability(attempt.traceabilityStatus)}
                      </p>
                      {attempt.errorMessage ? (
                        <p className="mt-2 whitespace-pre-wrap break-words rounded bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive">
                          {attempt.errorMessage}
                        </p>
                      ) : null}
                      {showSensitive && (attempt.promptSnapshot || attempt.responseSnapshot) ? (
                        <div className="mt-3 grid gap-3 lg:grid-cols-2">
                          {attempt.promptSnapshot ? (
                            <SnapshotBlock title="Prompt 快照" content={attempt.promptSnapshot} />
                          ) : null}
                          {attempt.responseSnapshot ? (
                            <SnapshotBlock title="响应快照" content={attempt.responseSnapshot} />
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">暂无 Attempt 记录</p>
                )}
              </TabsContent>

              {showSensitive ? (
                <TabsContent value="snapshots" className="mt-0">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <SnapshotBlock title="最终 Prompt" content={detail.promptSnapshot ?? ""} />
                    <SnapshotBlock title="最终返回" content={detail.rawResponseText ?? ""} />
                  </div>
                </TabsContent>
              ) : null}
            </div>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function AiReviewObservabilityBoard({
  scope,
  title,
  description,
  showSensitive,
}: {
  scope: "admin" | "owner";
  title: string;
  description: string;
  showSensitive: boolean;
}) {
  const [overview, setOverview] = useState<AiReviewObservabilityOverview | null>(null);
  const [records, setRecords] = useState<AiReviewObservabilityRecordSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AiReviewObservabilityRecordDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [openPanel, setOpenPanel] = useState<DashboardPanelId | null>(null);
  const [panelDialogOpen, setPanelDialogOpen] = useState(false);
  const [panelOriginRect, setPanelOriginRect] = useState<PanelOriginRect | null>(null);
  const [suppressedPanel, setSuppressedPanel] = useState<DashboardPanelId | null>(null);

  const openDashboardPanel = useCallback((panelId: DashboardPanelId, origin: PanelOriginRect) => {
    setOpenPanel(panelId);
    setPanelOriginRect(origin);
    setSuppressedPanel(panelId);
    setPanelDialogOpen(true);
  }, []);

  const closeDashboardPanel = useCallback((open: boolean) => {
    if (open) {
      setPanelDialogOpen(true);
      return;
    }
    setPanelDialogOpen(false);
    window.setTimeout(() => {
      setOpenPanel(null);
      setPanelOriginRect(null);
      setSuppressedPanel(null);
    }, 48);
  }, []);

  const load = useCallback(async () => {
    try {
      const [overviewData, recordPage] = await Promise.all([
        fetchAiReviewObservabilityOverview(scope),
        fetchAiReviewObservabilityRecords(scope, {
          page: 1,
          size: 20,
          status: statusFilter || undefined,
          modelId: showSensitive && modelFilter ? modelFilter : undefined,
        }),
      ]);
      setOverview(overviewData);
      setRecords(recordPage.page.list);
    } catch (error) {
      appMessage.errorUnlessHandled("加载 AI 审核观测数据失败", error);
    } finally {
      setLoading(false);
    }
  }, [scope, statusFilter, modelFilter, showSensitive]);

  useEffect(() => {
    setLoading(true);
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const openDetail = useCallback(
    async (aiReviewId: string) => {
      setSelectedId(aiReviewId);
      setDetailLoading(true);
      try {
        const data = await fetchAiReviewObservabilityRecordDetail(scope, aiReviewId);
        setDetail(data);
      } catch (error) {
        appMessage.errorUnlessHandled("加载详情失败", error);
      } finally {
        setDetailLoading(false);
      }
    },
    [scope],
  );

  const summary = overview?.summary;
  const throughputMax = useMemo(
    () => Math.max(1, ...(overview?.throughputTrend.map((item) => item.completedCount) ?? [1])),
    [overview],
  );

  const panelCards: Array<{
    id: DashboardPanelId;
    icon: ReactNode;
    content: (expanded: boolean) => ReactNode;
  }> = overview
    ? [
        {
          id: "throughput",
          icon: <Zap className="h-4 w-4" />,
          content: (expanded) => (
            <ThroughputPanelContent trend={overview.throughputTrend} throughputMax={throughputMax} expanded={expanded} />
          ),
        },
        {
          id: "records",
          icon: <Clock3 className="h-4 w-4" />,
          content: (expanded) => (
            <RecordsPanelContent
              records={records}
              statusFilter={statusFilter}
              modelFilter={modelFilter}
              onStatusFilterChange={setStatusFilter}
              onModelFilterChange={setModelFilter}
              onApplyFilter={() => void load()}
              onOpenDetail={(id) => void openDetail(id)}
              expanded={expanded}
              showSensitive={showSensitive}
            />
          ),
        },
        ...(showSensitive
          ? [
              {
                id: "models" as const,
                icon: <Bot className="h-4 w-4" />,
                content: (expanded: boolean) => (
                  <ModelsPanelContent distribution={overview.modelDistribution} expanded={expanded} />
                ),
              },
            ]
          : []),
        {
          id: "topk",
          icon: <Activity className="h-4 w-4" />,
          content: (expanded) => (
            <TopKPanelContent
              overview={overview}
              onSelect={(id) => void openDetail(id)}
              expanded={expanded}
              showSensitive={showSensitive}
            />
          ),
        },
      ]
    : [];

  const activePanel = openPanel ? panelCards.find((panel) => panel.id === openPanel) : null;

  return (
    <AppPageContainer>
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
        <div className="shrink-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4" />
                AI 审核观测
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => void load()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新
            </Button>
          </div>

          {loading && !overview ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-20 rounded-[20px]" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                compact
                label="队列待处理"
                value={String(summary?.queuePending ?? 0)}
                hint={`运行中 ${summary?.queueRunning ?? 0}`}
              />
              <MetricCard
                compact
                label="近 1 小时吞吐"
                value={String(summary?.reviewsLastHour ?? 0)}
                hint={`24h ${summary?.reviewsLast24Hours ?? 0}`}
              />
              <MetricCard
                compact
                label="24h 失败率"
                value={`${summary?.failureRateLast24Hours?.toFixed(1) ?? "0.0"}%`}
                hint={`失败 ${summary?.failedLast24Hours ?? 0}`}
              />
              <MetricCard
                compact
                label="平均耗时"
                value={formatLatency(summary?.avgLatencyMsLast24Hours)}
                hint={
                  showSensitive
                    ? [
                        `24h token ${formatTokenCount(summary?.totalTokensLast24Hours ?? 0)}`,
                        formatEstimatedCost(summary?.estimatedCostLast24Hours)
                          ? `预估成本 ${formatEstimatedCost(summary?.estimatedCostLast24Hours)}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : `关注项 ${summary?.attentionCount ?? 0}`
                }
              />
            </div>
          )}
        </div>

        {loading && !overview ? (
          <div
            className={cn(
              "grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2",
              showSensitive ? "md:grid-rows-2" : "md:grid-rows-[1fr_1fr]",
            )}
          >
            {Array.from({ length: showSensitive ? 4 : 3 }).map((_, index) => (
              <Skeleton key={index} className="h-full min-h-0 rounded-[24px]" />
            ))}
          </div>
        ) : overview ? (
          <div
            className={cn(
              "grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2",
              panelCards.length > 3 ? "md:grid-rows-2" : "md:grid-rows-[1fr_1fr]",
            )}
          >
            {panelCards.map((panel) => (
              <PreviewDashboardCard
                key={panel.id}
                panelId={panel.id}
                onOpen={openDashboardPanel}
                hidden={suppressedPanel === panel.id}
                title={PANEL_META[panel.id].title}
                description={PANEL_META[panel.id].description}
                icon={panel.icon}
              >
                {panel.content(false)}
              </PreviewDashboardCard>
            ))}
          </div>
        ) : null}

        <FlyInDashboardPanelDialog
          panelId={openPanel}
          open={panelDialogOpen}
          originRect={panelOriginRect}
          onOpenChange={closeDashboardPanel}
          icon={activePanel?.icon ?? <Activity className="h-4 w-4" />}
        >
          {activePanel ? activePanel.content(true) : null}
        </FlyInDashboardPanelDialog>

        <DetailDrawer
          open={Boolean(selectedId)}
          detail={detail}
          loading={detailLoading}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedId(null);
              setDetail(null);
            }
          }}
          showSensitive={showSensitive}
        />
      </div>
    </AppPageContainer>
  );
}
