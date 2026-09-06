import {
  Area,
  AreaChart,
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
import { ArrowLeft } from "lucide-react";
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
  OWNER_CHART_COLORS,
} from "../components/DashboardAnalyticsPrimitives";
import { formatCount, formatPercent, metricsForWorkspace } from "../lib/dashboard-config";
import { useDashboardOverview } from "../lib/use-dashboard-overview";

export function OwnerDashboardDetailPage() {
  const { overview, ownerAnalytics, loading, errors } = useDashboardOverview(["owner"], { includeOwnerAnalytics: true });
  const ownerOverview = overview.owner;
  const analytics = ownerAnalytics;
  const metrics = metricsForWorkspace("owner", overview);

  const summaryCards = analytics && ownerOverview
    ? [
        { label: "Owner 题目数", value: formatCount(analytics.taskCount), hint: "当前账号负责的任务" },
        { label: "活跃标注员", value: formatCount(analytics.activeLabelerCount), hint: "当前任务下参与标注的去重人数" },
        { label: "通过率", value: formatPercent(analytics.approvalRate), hint: `已通过 ${formatCount(ownerOverview.approvedTotal)} / 提交 ${formatCount(ownerOverview.submissionTotal)}` },
        { label: "AI 平均分", value: analytics.avgAiScore > 0 ? analytics.avgAiScore.toFixed(1) : "—", hint: "近 14 天 AI 预审均分" },
        { label: "AI 队列运行中", value: formatCount(ownerOverview.aiObservability?.queueRunning ?? 0), hint: `1h 吞吐 ${formatCount(ownerOverview.aiObservability?.reviewsLastHour ?? 0)}` },
        { label: "AI 关注项", value: formatCount(ownerOverview.aiObservability?.attentionCount ?? 0), hint: `24h 失败 ${formatCount(ownerOverview.aiObservability?.failedLast24Hours ?? 0)}` },
      ]
    : [];

  const hasStatusData = analytics?.statusDistribution.some((item) => item.count > 0) ?? false;
  const hasTrendData = analytics?.submissionTrend.some(
    (item) => item.submittedCount > 0 || item.approvedCount > 0 || item.needsRevisionCount > 0,
  ) ?? false;
  const hasAiScoreData = analytics?.submissionTrend.some((item) => item.avgAiScore > 0) ?? false;
  const hasLabelerData = analytics?.labelerEfficiency.some((item) => item.submitCount > 0) ?? false;

  return (
    <AppPageContainer
      title="Owner 交付看板"
      description="查看提交趋势、状态分布、AI 评分走势与标注员效率等经营分析。"
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
            <DashboardMetricGrid workspaceKey="owner" metrics={metrics} loading={loading} error={errors.owner} columns="xl:grid-cols-2" />
          </CardContent>
        </Card>

        {loading && !analytics ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`owner-analytics-skeleton-${index}`} className="rounded-[22px] border border-border/70 bg-background/72 p-4">
                <div className="mb-3 h-3 w-20 rounded-full bg-muted/70" />
                <div className="mb-4 h-8 w-28 rounded-full bg-muted/60" />
                <div className="h-36 rounded-[18px] bg-muted/55" />
              </div>
            ))}
          </div>
        ) : errors.owner && !analytics ? (
          <Card className="rounded-[28px] border-dashed border-primary/35 bg-accent/35">
            <CardContent className="py-6 text-sm text-foreground">{errors.owner}</CardContent>
          </Card>
        ) : analytics && ownerOverview ? (
          <section className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-[22px] border border-border/70 bg-background/78 p-4 shadow-[0_14px_34px_hsl(var(--foreground)/0.04)]"
                >
                  <Badge variant="outline" className="mb-3 w-fit bg-background/70">
                    {card.label}
                  </Badge>
                  <p className="text-3xl font-semibold tracking-tight text-foreground">{card.value}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.hint}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <AnalyticsCard title="提交趋势" description="最近 7 天按 Owner 任务聚合提交、通过与待修改走势。">
                {hasTrendData ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={analytics.submissionTrend}>
                      <CartesianGrid stroke="hsl(var(--border) / 0.55)" vertical={false} />
                      <XAxis dataKey="statDate" tickFormatter={formatShortDate} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <Tooltip content={<DashboardTooltip formatLabel={formatShortDate} />} />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Line type="monotone" dataKey="submittedCount" name="已提交" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="approvedCount" name="已通过" stroke="hsl(var(--foreground) / 0.78)" strokeWidth={2.2} dot={false} />
                      <Line type="monotone" dataKey="needsRevisionCount" name="待修改" stroke="hsl(var(--primary) / 0.45)" strokeWidth={2.2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <AnalyticsEmptyState message="最近 7 天还没有可绘制的 Owner 提交趋势数据。" />
                )}
              </AnalyticsCard>

              <AnalyticsCard title="状态分布" description="聚合进行中、待审核、待修改和已通过的当前盘面。">
                {hasStatusData ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Tooltip content={<DashboardTooltip />} />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Pie data={analytics.statusDistribution} dataKey="count" nameKey="status" innerRadius={62} outerRadius={92} paddingAngle={3}>
                        {analytics.statusDistribution.map((entry, index) => (
                          <Cell key={`${entry.status}-${index}`} fill={OWNER_CHART_COLORS[index % OWNER_CHART_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <AnalyticsEmptyState message="当前 Owner 任务还没有可展示的状态分布数据。" />
                )}
              </AnalyticsCard>

              <AnalyticsCard title="AI 评分走势" description="最近 7 天按日报表聚合的 AI 平均分，用于观察预审质量波动。">
                {hasAiScoreData ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={analytics.submissionTrend}>
                      <defs>
                        <linearGradient id="owner-ai-score-fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="hsl(var(--border) / 0.55)" vertical={false} />
                      <XAxis dataKey="statDate" tickFormatter={formatShortDate} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip content={<DashboardTooltip formatLabel={formatShortDate} />} />
                      <Area type="monotone" dataKey="avgAiScore" name="AI 平均分" stroke="hsl(var(--primary))" fill="url(#owner-ai-score-fill)" strokeWidth={2.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <AnalyticsEmptyState message="统计表里还没有足够的 AI 分数日趋势数据。" />
                )}
              </AnalyticsCard>

              <AnalyticsCard title="标注员效率" description="最近 14 天提交量 Top 6，并叠加质量分均值。">
                {hasLabelerData ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={analytics.labelerEfficiency}>
                      <CartesianGrid stroke="hsl(var(--border) / 0.55)" vertical={false} />
                      <XAxis dataKey="labelerName" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <Tooltip content={<DashboardTooltip />} />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Bar yAxisId="left" dataKey="submitCount" name="提交量" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="qualityScore" name="质量分" stroke="hsl(var(--foreground) / 0.82)" strokeWidth={2.2} dot={{ r: 3 }} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <AnalyticsEmptyState message="当前还没有足够的标注员效率聚合数据。" />
                )}
              </AnalyticsCard>
            </div>
          </section>
        ) : null}
      </div>
    </AppPageContainer>
  );
}
