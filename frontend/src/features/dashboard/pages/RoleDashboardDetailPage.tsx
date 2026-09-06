import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { AppPageContainer } from "@/app/layout/AppPageContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  detailPageHighlights,
  detailPageIcons,
  detailPageNotes,
  metricsForWorkspace,
  roleWorkspaces,
  type WorkspaceKey,
} from "../lib/dashboard-config";
import { useDashboardOverview } from "../lib/use-dashboard-overview";
import { DashboardMetricGrid } from "../components/DashboardMetricGrid";

export function RoleDashboardDetailPage({ workspaceKey }: { workspaceKey: WorkspaceKey }) {
  const workspace = roleWorkspaces.find((item) => item.key === workspaceKey);
  const { overview, loading, errors } = useDashboardOverview([workspaceKey]);

  if (!workspace) {
    return null;
  }

  const Icon = detailPageIcons[workspaceKey];
  const metrics = metricsForWorkspace(workspaceKey, overview);
  const notes = detailPageNotes[workspaceKey];
  const highlights = detailPageHighlights[workspaceKey];

  return (
    <AppPageContainer
      title={workspace.title}
      description={workspace.summary}
      extra={
        <Button asChild size="sm" variant="outline">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回工作台
          </Link>
        </Button>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto pb-6">
        <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="relative overflow-hidden rounded-[28px] border-border/70 bg-card/95 text-card-foreground shadow-[0_24px_70px_hsl(var(--foreground)/0.12)]">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-background/10 via-transparent to-muted/50" />
            <CardHeader className="relative pb-3">
              <Badge variant="outline" className="mb-3 w-fit bg-background/70">
                {workspace.badge}
              </Badge>
              <CardTitle className="flex items-center gap-3 text-3xl font-semibold tracking-tight">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-background/80 shadow-sm">
                  <Icon className="h-5 w-5 text-foreground" />
                </span>
                {workspace.title}
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-6 text-muted-foreground">{workspace.summary}</CardDescription>
            </CardHeader>
            <CardContent className="relative grid gap-3 md:grid-cols-2">
              {notes.map((note) => (
                <div key={note.title} className="rounded-[22px] border border-border/60 bg-background/72 p-4 backdrop-blur">
                  <p className="font-medium text-foreground">{note.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{note.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-border/70 bg-card/90 shadow-[0_20px_50px_hsl(var(--foreground)/0.08)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">统计维度</CardTitle>
              <CardDescription>查看该角色的趋势、分布与效率分析。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {highlights.map((item) => (
                <div key={item} className="flex items-center justify-between rounded-[20px] border border-border/70 bg-background/80 px-4 py-3">
                  <p className="font-medium text-foreground">{item}</p>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4">
          <Card className="rounded-[28px] border-border/70 bg-card/95 shadow-[0_18px_42px_hsl(var(--foreground)/0.07)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">实时指标</CardTitle>
              <CardDescription>点击指标可进入对应业务页面继续处理。</CardDescription>
            </CardHeader>
            <CardContent>
              <DashboardMetricGrid
                workspaceKey={workspaceKey}
                metrics={metrics}
                loading={loading}
                error={errors[workspaceKey]}
                columns="xl:grid-cols-2"
              />
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-border/70 bg-card/95 shadow-[0_18px_42px_hsl(var(--foreground)/0.07)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">业务入口</CardTitle>
              <CardDescription>从统计页快速进入常用业务页面。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {workspace.links.map((link) => (
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
            </CardContent>
          </Card>
        </section>
      </div>
    </AppPageContainer>
  );
}
