import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ResourcePageSummarySchema } from "@/low-code/schema/types";
import { cn } from "@/lib/utils";
import { isNavigableMetricHref, type ResourceInsightSnapshot } from "./resource-page-insights";

interface ResourcePageInsightsStripSummaryProps {
  summary: ResourcePageSummarySchema;
  snapshot: ResourceInsightSnapshot;
  loading?: boolean;
  refreshing?: boolean;
  hasRecords: boolean;
  toneClassName: Record<string, string>;
}

export function ResourcePageInsightsStripSummary({
  summary,
  snapshot,
  loading = false,
  refreshing = false,
  hasRecords,
  toneClassName,
}: ResourcePageInsightsStripSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const { pathname } = useLocation();
  const detailAction = summary.actions?.[0];
  const hasExpandableMeta = Boolean(summary.description || snapshot.tips.length > 0);

  return (
    <div className="mb-2">
      <div className="overflow-hidden rounded-[18px] border border-border/70 bg-card/84 shadow-[0_8px_22px_hsl(var(--foreground)/0.04)]">
        <div className="lh-scrollbar-none overflow-x-auto px-2 py-2">
          <div className="flex min-w-max items-center gap-2">
            <div className="flex w-[208px] shrink-0 items-center gap-2 rounded-[14px] border border-border/70 bg-background/72 px-2.5 py-2">
              <Badge variant={hasRecords ? "secondary" : "outline"}>{snapshot.badge ?? summary.badge ?? "筛选摘要"}</Badge>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold tracking-tight text-foreground">{summary.title}</p>
                <p className="truncate text-[10px] leading-4 text-muted-foreground">
                  {loading && !hasRecords ? "正在汇总当前筛选结果" : hasRecords ? "当前筛选下的验收处理概览" : summary.emptyTitle}
                </p>
              </div>
            </div>

            {hasRecords ? (
              summary.metrics.map((metric) => {
                const value = snapshot.metrics[metric.key];
                if (!value) {
                  return null;
                }

                const className = cn(
                  "flex min-w-[136px] shrink-0 items-center gap-2 rounded-[14px] border px-2.5 py-2 transition",
                  toneClassName[value.tone ?? "default"],
                );

                const navigableHref = isNavigableMetricHref(metric.href, pathname) ? metric.href : undefined;

                const content = (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/90">
                        {metric.label}
                      </p>
                      <div className="mt-0.5 flex items-baseline gap-1.5">
                        <p className="shrink-0 text-base font-semibold tracking-tight text-foreground">{value.value}</p>
                        <p className="truncate text-[10px] leading-4 text-muted-foreground">{value.hint}</p>
                      </div>
                    </div>
                    {navigableHref ? <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : null}
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
              <div className="flex min-w-[260px] shrink-0 items-center rounded-[14px] border border-dashed border-border/80 bg-background/68 px-2.5 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">{summary.emptyTitle}</p>
                  <p className="truncate text-[10px] leading-4 text-muted-foreground">{summary.emptyDescription}</p>
                </div>
              </div>
            )}

            {detailAction ? (
              <Link
                to={detailAction.href}
                className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-border/70 bg-background/78 px-3 text-[11px] font-medium text-foreground transition hover:border-primary/35 hover:text-primary"
              >
                {detailAction.label}
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            ) : null}

            {hasExpandableMeta ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 shrink-0 rounded-full px-3 text-[11px] text-muted-foreground"
                onClick={() => setExpanded((current) => !current)}
              >
                {expanded ? "收起说明" : "查看说明"}
                {expanded ? <ChevronUp className="ml-1 h-3.5 w-3.5" /> : <ChevronDown className="ml-1 h-3.5 w-3.5" />}
              </Button>
            ) : null}
          </div>
        </div>

        {expanded ? (
          <div className="border-t border-border/60 bg-background/55 px-3 py-2.5">
            {summary.description ? (
              <p className="text-[11px] leading-5 text-muted-foreground">{summary.description}</p>
            ) : null}
            {snapshot.tips.length > 0 ? (
              <div className={cn("grid gap-2", summary.description ? "mt-2" : "")}>
                {snapshot.tips.slice(0, 2).map((tip) => (
                  <div
                    key={tip}
                    className="rounded-[12px] border border-border/60 bg-card/70 px-2.5 py-2 text-[11px] leading-5 text-muted-foreground"
                  >
                    {tip}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
