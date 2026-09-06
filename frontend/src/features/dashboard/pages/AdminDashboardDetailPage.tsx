import { ArrowLeft } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "react-router-dom";
import { AppPageContainer } from "@/app/layout/AppPageContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardMetricGrid } from "../components/DashboardMetricGrid";
import {
  AnalyticsCard,
  AnalyticsEmptyState,
  DashboardTooltip,
  OWNER_CHART_COLORS,
  formatShortDate,
} from "../components/DashboardAnalyticsPrimitives";
import { formatCount, formatPercent, metricsForWorkspace } from "../lib/dashboard-config";
import { useDashboardOverview } from "../lib/use-dashboard-overview";

const ADMIN_CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--foreground) / 0.8)",
  "hsl(var(--primary) / 0.55)",
  "hsl(var(--muted-foreground) / 0.82)",
  "hsl(var(--accent-foreground) / 0.65)",
];

export function AdminDashboardDetailPage() {
  const { overview, adminAnalytics, loading, errors } = useDashboardOverview(["admin"], { includeAdminAnalytics: true });
  const adminOverview = overview.admin;
  const analytics = adminAnalytics;
  const metrics = metricsForWorkspace("admin", overview);

  const summaryCards = adminOverview && analytics
    ? [
        { label: "平台用户", value: formatCount(adminOverview.platform.totalUsers), hint: "当前租户内有效用户总数" },
        { label: "平台任务", value: formatCount(adminOverview.platform.totalTasks), hint: `已发布 ${formatCount(adminOverview.platform.publishedTasks)} / 草稿 ${formatCount(adminOverview.platform.draftTasks)}` },
        { label: "待复核提交", value: formatCount(adminOverview.platform.pendingReviewCount), hint: `提交总量 ${formatCount(adminOverview.platform.totalSubmissions)}` },
        { label: "提交通过率", value: formatPercent(analytics.approvalRate), hint: `已通过 ${formatCount(adminOverview.platform.approvedSubmissions)} / 总提交 ${formatCount(adminOverview.platform.totalSubmissions)}` },
        { label: "AI 实时处理", value: formatCount(adminOverview.aiObservability?.queueRunning ?? 0), hint: `待处理 ${formatCount(adminOverview.aiObservability?.queuePending ?? 0)}` },
        { label: "AI 24h 吞吐", value: formatCount(adminOverview.aiObservability?.reviewsLast24Hours ?? 0), hint: `失败率 ${formatPercent(adminOverview.aiObservability?.failureRateLast24Hours ?? 0)}` },
      ]
    : [];

  const hasUserGrowth = analytics?.userGrowthTrend.some(
    (item) => item.newUserCount > 0 || item.cumulativeUserCount > 0,
  ) ?? false;
  const hasTaskStatus = analytics?.taskStatusDistribution.some((item) => item.count > 0) ?? false;
  const hasSubmissionFunnel = analytics?.submissionFunnel.some((item) => item.count > 0) ?? false;
  const hasRoleDistribution = analytics?.roleDistribution.some((item) => item.userCount > 0) ?? false;

  return (
    <AppPageContainer
      title="Admin 平台看板"
      description="查看平台用户、任务、提交与 AI 接力等运营指标分析。"
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
        <Card className="rounded-[28px] border-border/70 bg-card/90 shadow-[0_20px_50px_hsl(var(--foreground)/0.08)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">实时指标</CardTitle>
            <CardDescription>点击指标可进入对应业务页面继续处理。</CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardMetricGrid workspaceKey="admin" metrics={metrics} loading={loading} error={errors.admin} columns="xl:grid-cols-2" />
          </CardContent>
        </Card>

        {loading && !analytics ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`admin-analytics-skeleton-${index}`} className="rounded-[22px] border border-border/70 bg-background/72 p-4">
                <div className="mb-3 h-3 w-20 rounded-full bg-muted/70" />
                <div className="mb-4 h-8 w-28 rounded-full bg-muted/60" />
                <div className="h-36 rounded-[18px] bg-muted/55" />
              </div>
            ))}
          </div>
        ) : errors.admin && !analytics ? (
          <Card className="rounded-[28px] border-dashed border-primary/35 bg-accent/35">
            <CardContent className="py-6 text-sm text-foreground">{errors.admin}</CardContent>
          </Card>
        ) : analytics && adminOverview ? (
          <section className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => (
                <div key={card.label} className="rounded-[22px] border border-border/70 bg-background/78 p-4 shadow-[0_14px_34px_hsl(var(--foreground)/0.04)]">
                  <Badge variant="outline" className="mb-3 w-fit bg-background/70">
                    {card.label}
                  </Badge>
                  <p className="text-3xl font-semibold tracking-tight text-foreground">{card.value}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.hint}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <AnalyticsCard title="用户增长折线图" description="最近 7 天按日展示新增用户与累计用户。">
                {hasUserGrowth ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={analytics.userGrowthTrend}>
                      <CartesianGrid stroke="hsl(var(--border) / 0.55)" vertical={false} />
                      <XAxis dataKey="statDate" tickFormatter={formatShortDate} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <Tooltip content={<DashboardTooltip formatLabel={formatShortDate} />} />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Line yAxisId="left" type="monotone" dataKey="newUserCount" name="新增用户" stroke="hsl(var(--primary))" strokeWidth={2.2} dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="cumulativeUserCount" name="累计用户" stroke="hsl(var(--foreground) / 0.78)" strokeWidth={2.2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <AnalyticsEmptyState message="最近 7 天还没有可展示的用户增长数据。" />
                )}
              </AnalyticsCard>

              <AnalyticsCard title="任务状态环形图" description="按平台任务状态聚合当前盘面。">
                {hasTaskStatus ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Tooltip content={<DashboardTooltip />} />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Pie data={analytics.taskStatusDistribution} dataKey="count" nameKey="status" innerRadius={62} outerRadius={92} paddingAngle={3}>
                        {analytics.taskStatusDistribution.map((entry, index) => (
                          <Cell key={`${entry.status}-${index}`} fill={OWNER_CHART_COLORS[index % OWNER_CHART_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <AnalyticsEmptyState message="当前还没有足够的任务状态分布数据。" />
                )}
              </AnalyticsCard>

              <AnalyticsCard title="提交漏斗图" description="从提交总量到已通过的关键环节聚合。">
                {hasSubmissionFunnel ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={analytics.submissionFunnel}>
                      <CartesianGrid stroke="hsl(var(--border) / 0.55)" vertical={false} />
                      <XAxis dataKey="stage" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <Tooltip content={<DashboardTooltip />} />
                      <Bar dataKey="count" name="条目数" fill="hsl(var(--primary))" radius={[10, 10, 0, 0]}>
                        {analytics.submissionFunnel.map((entry, index) => (
                          <Cell key={`${entry.stage}-${index}`} fill={ADMIN_CHART_COLORS[index % ADMIN_CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <AnalyticsEmptyState message="当前还没有足够的提交漏斗数据。" />
                )}
              </AnalyticsCard>

              <AnalyticsCard title="角色占比图" description="按平台角色聚合当前有效用户。">
                {hasRoleDistribution ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Tooltip content={<DashboardTooltip />} />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Pie data={analytics.roleDistribution} dataKey="userCount" nameKey="roleName" innerRadius={62} outerRadius={92} paddingAngle={3}>
                        {analytics.roleDistribution.map((entry, index) => (
                          <Cell key={`${entry.roleCode}-${index}`} fill={ADMIN_CHART_COLORS[index % ADMIN_CHART_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <AnalyticsEmptyState message="当前还没有足够的角色分布数据。" />
                )}
              </AnalyticsCard>
            </div>
          </section>
        ) : null}
      </div>
    </AppPageContainer>
  );
}

