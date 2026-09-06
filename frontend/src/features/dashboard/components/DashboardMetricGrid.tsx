import { ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WorkspaceKey, WorkspaceMetric } from "../lib/dashboard-config";

export function DashboardMetricGrid({
  workspaceKey,
  metrics,
  loading,
  error,
  columns = "xl:grid-cols-4",
}: {
  workspaceKey: WorkspaceKey;
  metrics: WorkspaceMetric[];
  loading: boolean;
  error?: string;
  columns?: string;
}) {
  if (loading && !metrics.length) {
    return (
      <div className={cn("grid gap-3 md:grid-cols-2", columns)}>
        {Array.from({ length: workspaceKey === "owner" || workspaceKey === "labeler" ? 5 : 4 }).map((_, index) => (
          <div
            key={`${workspaceKey}-metric-skeleton-${index}`}
            className="rounded-[22px] border border-border/70 bg-background/70 p-4"
          >
            <div className="mb-4 h-3 w-20 rounded-full bg-muted/70" />
            <div className="mb-3 h-8 w-24 rounded-full bg-muted/70" />
            <div className="h-3 w-28 rounded-full bg-muted/60" />
          </div>
        ))}
      </div>
    );
  }

  if (error && !metrics.length) {
    return (
      <div className="flex items-start gap-3 rounded-[22px] border border-dashed border-primary/35 bg-accent/35 px-4 py-4 text-sm text-foreground">
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />
        <span>{error}</span>
      </div>
    );
  }

  if (!metrics.length) {
    return (
      <div className="rounded-[22px] border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
        当前角色暂无可展示的实时业务指标。
      </div>
    );
  }

  return (
    <div className={cn("grid gap-3 md:grid-cols-2", columns)}>
      {metrics.map((metric) => (
        <Link
          key={`${workspaceKey}-${metric.label}`}
          to={metric.href}
          className={cn(
            "group rounded-[22px] border bg-background/85 p-4 transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_hsl(var(--primary)/0.12)]",
            metric.tone === "warning" && "border-primary/25 bg-accent/20 hover:border-primary/45",
            metric.tone === "success" && "border-primary/20 bg-primary/5 hover:border-primary/35",
            metric.tone === "destructive" && "border-destructive/35 bg-destructive/5 hover:border-destructive/55",
            metric.tone === "default" && "border-border/70 hover:border-primary/35",
            !metric.tone && "border-border/70 hover:border-primary/35",
          )}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <Badge variant="outline" className="w-fit bg-background/70">
              {metric.label}
            </Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
          </div>
          <p className="text-3xl font-semibold tracking-tight text-foreground">{metric.value}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{metric.hint}</p>
        </Link>
      ))}
    </div>
  );
}
