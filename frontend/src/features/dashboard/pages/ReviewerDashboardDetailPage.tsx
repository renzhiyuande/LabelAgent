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
  formatShortDate,
} from "../components/DashboardAnalyticsPrimitives";
import { formatCount, formatPercent, metricsForWorkspace } from "../lib/dashboard-config";
import { useDashboardOverview } from "../lib/use-dashboard-overview";

const REVIEWER_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--foreground) / 0.78)",
  "hsl(var(--primary) / 0.45)",
];

export function ReviewerDashboardDetailPage() {
  const { overview, reviewerAnalytics, loading, errors } = useDashboardOverview(["reviewer"], { includeReviewerAnalytics: true });
  const reviewerOverview = overview.reviewer;
  const analytics = reviewerAnalytics;
  const metrics = metricsForWorkspace("reviewer", overview);

  const summaryCards = analytics && reviewerOverview
    ? [
        { label: "今日已审", value: formatCount(analytics.todayReviewedCount), hint: "今天个人完成的审核动作" },
        { label: "通过率", value: formatPercent(analytics.approvalRate), hint: "近 14 天通过 / 总审核动作" },
        { label: "平均耗时", value: formatMinutes(analytics.avgReviewLatencyMinutes), hint: "近 14 天个人平均审核耗时" },
        { label: "待人工接力", value: formatCount(reviewerOverview.manualCount), hint: `当前队列积压 ${formatCount(reviewerOverview.pendingCount)}` },
      ]
    : [];

  const hasTrendData = analytics?.reviewTrend.some(
    (item) => item.approvedCount > 0 || item.rejectedCount > 0 || item.returnedCount > 0,
  ) ?? false;
  const hasDurationData = analytics?.reviewTrend.some((item) => item.avgReviewLatencyMinutes > 0) ?? false;
  const hasDecisionData = analytics?.decisionDistribution.some((item) => item.count > 0) ?? false;
  const hasComparisonData = analytics?.personalVsTeam.some(
    (item) => item.personalCount > 0 || item.teamAverageCount > 0,
  ) ?? false;

  return (
    <AppPageContainer
      title="Reviewer 质检看板"
      description="查看审核趋势、决策分布、耗时走势与个人对比等审核效能分析。"
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
            <CardDescription>点击指标可进入对应审核页面继续处理。</CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardMetricGrid workspaceKey="reviewer" metrics={metrics} loading={loading} error={errors.reviewer} columns="xl:grid-cols-2" />
          </CardContent>
        </Card>

        {loading && !analytics ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`reviewer-analytics-skeleton-${index}`} className="rounded-[22px] border border-border/70 bg-background/72 p-4">
                <div className="mb-3 h-3 w-20 rounded-full bg-muted/70" />
                <div className="mb-4 h-8 w-28 rounded-full bg-muted/60" />
                <div className="h-36 rounded-[18px] bg-muted/55" />
              </div>
            ))}
          </div>
        ) : errors.reviewer && !analytics ? (
          <Card className="rounded-[28px] border-dashed border-primary/35 bg-accent/35">
            <CardContent className="py-6 text-sm text-foreground">{errors.reviewer}</CardContent>
          </Card>
        ) : analytics && reviewerOverview ? (
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
              <AnalyticsCard title="审核量趋势" description="最近 7 天通过、驳回和打回的个人审核走势。">
                {hasTrendData ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={analytics.reviewTrend}>
                      <CartesianGrid stroke="hsl(var(--border) / 0.55)" vertical={false} />
                      <XAxis dataKey="statDate" tickFormatter={formatShortDate} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <Tooltip content={<DashboardTooltip formatLabel={formatShortDate} />} />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Line type="monotone" dataKey="approvedCount" name="通过" stroke="hsl(var(--primary))" strokeWidth={2.3} dot={false} />
                      <Line type="monotone" dataKey="rejectedCount" name="驳回" stroke="hsl(var(--foreground) / 0.78)" strokeWidth={2.1} dot={false} />
                      <Line type="monotone" dataKey="returnedCount" name="打回" stroke="hsl(var(--primary) / 0.45)" strokeWidth={2.1} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <AnalyticsEmptyState message="最近 7 天还没有足够的审核趋势数据。" />
                )}
              </AnalyticsCard>

              <AnalyticsCard title="决策分布" description="最近 14 天个人审核动作的决策分布。">
                {hasDecisionData ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Tooltip content={<DashboardTooltip />} />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Pie data={analytics.decisionDistribution} dataKey="count" nameKey="decision" innerRadius={62} outerRadius={92} paddingAngle={3}>
                        {analytics.decisionDistribution.map((entry, index) => (
                          <Cell key={`${entry.decision}-${index}`} fill={REVIEWER_COLORS[index % REVIEWER_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <AnalyticsEmptyState message="最近 14 天还没有足够的决策分布数据。" />
                )}
              </AnalyticsCard>

              <AnalyticsCard title="耗时趋势" description="最近 7 天个人平均审核耗时，单位分钟。">
                {hasDurationData ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={analytics.reviewTrend}>
                      <CartesianGrid stroke="hsl(var(--border) / 0.55)" vertical={false} />
                      <XAxis dataKey="statDate" tickFormatter={formatShortDate} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <Tooltip content={<DashboardTooltip formatLabel={formatShortDate} />} />
                      <Line type="monotone" dataKey="avgReviewLatencyMinutes" name="平均耗时(分钟)" stroke="hsl(var(--primary))" strokeWidth={2.3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <AnalyticsEmptyState message="当前还没有足够的审核耗时趋势数据。" />
                )}
              </AnalyticsCard>

              <AnalyticsCard title="个人 vs 团队" description="个人完成量与团队平均完成量对比。">
                {hasComparisonData ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={analytics.personalVsTeam}>
                      <CartesianGrid stroke="hsl(var(--border) / 0.55)" vertical={false} />
                      <XAxis dataKey="scopeLabel" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <Tooltip content={<DashboardTooltip />} />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Bar dataKey="personalCount" name="个人完成量" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="teamAverageCount" name="团队人均" fill="hsl(var(--foreground) / 0.78)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <AnalyticsEmptyState message="当前还没有足够的个人与团队对比数据。" />
                )}
              </AnalyticsCard>
            </div>
          </section>
        ) : null}
      </div>
    </AppPageContainer>
  );
}

function formatMinutes(value: number) {
  if (value <= 0) {
    return "—";
  }
  return `${value.toFixed(1)} 分钟`;
}
