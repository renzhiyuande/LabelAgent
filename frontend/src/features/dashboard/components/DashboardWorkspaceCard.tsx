import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { detailPageHighlights, type RoleWorkspace, type WorkspaceMetric } from "../lib/dashboard-config";
import { DashboardMetricGrid } from "./DashboardMetricGrid";

export function DashboardWorkspaceCard({
  workspace,
  metrics,
  loading,
  error,
}: {
  workspace: RoleWorkspace;
  metrics: WorkspaceMetric[];
  loading: boolean;
  error?: string;
}) {
  const Icon = workspace.icon;
  const highlights = detailPageHighlights[workspace.key];

  return (
    <Card className="relative overflow-hidden rounded-[28px] border-border/70 bg-card/95 shadow-[0_18px_42px_hsl(var(--foreground)/0.07)]">
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", workspace.accent)} />
      <CardHeader className="relative pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge variant="outline" className="mb-3 w-fit bg-background/70">
              {workspace.badge}
            </Badge>
            <CardTitle className="text-2xl">{workspace.title}</CardTitle>
            <CardDescription className="mt-2 max-w-2xl text-sm leading-6">{workspace.summary}</CardDescription>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-background/80 shadow-sm">
            <Icon className="h-5 w-5 text-foreground" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative grid gap-4">
        <div className="grid gap-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            实时指标
          </div>
          <DashboardMetricGrid workspaceKey={workspace.key} metrics={metrics} loading={loading} error={error} />
        </div>

        <div className="rounded-[24px] border border-border/70 bg-background/78 p-4 shadow-[0_14px_34px_hsl(var(--foreground)/0.04)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-foreground">统计分析</p>
              <p className="mt-1 text-sm text-muted-foreground">查看趋势图、分布图与效率分析。</p>
            </div>
            <Link
              to={workspace.detailPath}
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
            >
              进入详情
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {highlights.map((item) => (
              <Badge key={item} variant="outline" className="rounded-full px-3 py-1 text-xs font-normal">
                {item}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {workspace.links.slice(0, 4).map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="group rounded-[22px] border border-border/70 bg-background/80 p-4 transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_16px_30px_hsl(var(--primary)/0.12)]"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="font-medium text-foreground">{link.title}</p>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{link.description}</p>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
