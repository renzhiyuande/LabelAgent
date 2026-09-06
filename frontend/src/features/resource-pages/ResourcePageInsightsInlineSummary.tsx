import { ArrowRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import type { ResourcePageSummarySchema } from "@/low-code/schema/types";
import { cn } from "@/lib/utils";
import { isNavigableMetricHref, type ResourceInsightSnapshot } from "./resource-page-insights";

interface ResourcePageInsightsInlineSummaryProps {
  summary: ResourcePageSummarySchema;
  snapshot: ResourceInsightSnapshot;
  loading?: boolean;
  refreshing?: boolean;
  hasRecords: boolean;
  toneClassName: Record<string, string>;
}

export function ResourcePageInsightsInlineSummary({
  summary,
  snapshot,
  loading = false,
  refreshing = false,
  hasRecords,
  toneClassName,
}: ResourcePageInsightsInlineSummaryProps) {
  const { pathname } = useLocation();

  return (
    <div className="mb-2 overflow-x-auto pb-1">
      <div className="lh-scrollbar-none flex min-w-max items-stretch gap-2">
        <div className="flex w-[220px] shrink-0 items-center rounded-[18px] border border-border/70 bg-card/82 px-3 py-2.5 shadow-[0_8px_22px_hsl(var(--foreground)/0.04)]">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant={hasRecords ? "secondary" : "outline"}>{snapshot.badge ?? summary.badge ?? "筛选摘要"}</Badge>
              {refreshing ? <Badge variant="outline">刷新中</Badge> : null}
            </div>
            <div className="mt-1 min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-foreground">{summary.title}</p>
              {summary.description ? (
                <p className="mt-0.5 truncate text-[11px] leading-5 text-muted-foreground">
                  {loading && !hasRecords ? "正在汇总当前筛选结果。" : summary.description}
                </p>
              ) : null}
            </div>
          </div>
          {summary.actions?.[0] ? (
            <Link
              to={summary.actions[0].href}
              className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-full border border-border/70 bg-background/78 px-2 py-1 text-[11px] font-medium text-foreground transition hover:border-primary/35 hover:text-primary"
            >
              详情
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>

        {hasRecords ? (
          summary.metrics.map((metric) => {
            const value = snapshot.metrics[metric.key];
            if (!value) {
              return null;
            }

            const className = cn(
              "flex min-w-[150px] shrink-0 items-center gap-3 rounded-[18px] border px-3 py-2.5 shadow-[0_8px_22px_hsl(var(--foreground)/0.04)] transition",
              toneClassName[value.tone ?? "default"],
            );

            const navigableHref = isNavigableMetricHref(metric.href, pathname) ? metric.href : undefined;

            const content = (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-muted-foreground">{metric.label}</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <p className="shrink-0 text-lg font-semibold tracking-tight text-foreground">{value.value}</p>
                    <p className="truncate text-[11px] leading-5 text-muted-foreground">{value.hint}</p>
                  </div>
                </div>
                {navigableHref ? <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : null}
              </>
            );

            return navigableHref ? (
              <Link key={metric.key} to={navigableHref} className={className}>
                {content}
              </Link>
            ) : (
              <div key={metric.key} className={className}>
                {content}
              </div>
            );
          })
        ) : (
          <div className="flex min-w-[280px] shrink-0 items-center rounded-[18px] border border-dashed border-border/80 bg-background/68 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{summary.emptyTitle}</p>
              <p className="mt-0.5 truncate text-[11px] leading-5 text-muted-foreground">{summary.emptyDescription}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
