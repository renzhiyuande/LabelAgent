import { ArrowLeft } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart as RechartsPieChart,
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
import { formatCount, metricsForWorkspace } from "../lib/dashboard-config";
import { useDashboardOverview } from "../lib/use-dashboard-overview";

const LABELER_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--foreground) / 0.78)",
  "hsl(var(--primary) / 0.5)",
];

export function LabelerDashboardDetailPage() {
  const { overview, labelerAnalytics, loading, errors } = useDashboardOverview(["labeler"], { includeLabelerAnalytics: true });
  const labelerOverview = overview.labeler;
  const analytics = labelerAnalytics;
  const metrics = metricsForWorkspace("labeler", overview);

  const summaryCards = analytics
    ? [
        { label: "今日提交", value: formatCount(analytics.todaySubmittedCount), hint: "今日个人提交数量" },
        { label: "参与任务", value: formatCount(analytics.activeTaskCount), hint: "当前账号可见的我的任务聚合" },
        { label: "平均质量分", value: analytics.avgQualityScore > 0 ? analytics.avgQualityScore.toFixed(1) : "—", hint: "近 14 天个人质量均值" },
        { label: "累计奖励", value: analytics.rewardAmountTotal > 0 ? `¥${analytics.rewardAmountTotal.toFixed(1)}` : "¥0", hint: "按我的奖励明细累计" },
      ]
    : [];

  const hasTrendData = analytics?.submissionTrend.some(
    (item) => item.submittedCount > 0 || item.approvedCount > 0 || item.needsRevisionCount > 0,
  ) ?? false;
  const hasQualityData = analytics?.submissionTrend.some(
    (item) => item.qualityScore > 0 || item.platformQualityBaseline > 0,
  ) ?? false;
  const hasResultData = analytics?.resultDistribution.some((item) => item.count > 0) ?? false;
  const hasTaskParticipation = analytics?.taskParticipation.length ? analytics.taskParticipation.some(
    (item) => item.openCount > 0 || item.submittedEverCount > 0 || item.approvedCount > 0 || item.needsRevisionCount > 0,
  ) : false;

  return (
    <AppPageContainer
      title="Labeler 工作看板"
      description="查看提交趋势、结果分布、质量分走势与参与任务等个人产出分析。"
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
            <DashboardMetricGrid workspaceKey="labeler" metrics={metrics} loading={loading} error={errors.labeler} columns="xl:grid-cols-2" />
          </CardContent>
        </Card>

        {loading && !analytics ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`labeler-analytics-skeleton-${index}`} className="rounded-[22px] border border-border/70 bg-background/72 p-4">
                <div className="mb-3 h-3 w-20 rounded-full bg-muted/70" />
                <div className="mb-4 h-8 w-28 rounded-full bg-muted/60" />
                <div className="h-36 rounded-[18px] bg-muted/55" />
              </div>
            ))}
          </div>
        ) : errors.labeler && !analytics ? (
          <Card className="rounded-[28px] border-dashed border-primary/35 bg-accent/35">
            <CardContent className="py-6 text-sm text-foreground">{errors.labeler}</CardContent>
          </Card>
        ) : analytics && labelerOverview ? (
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
              <AnalyticsCard title="个人提交趋势" description="最近 7 天的提交、通过与待修改走势。">
                {hasTrendData ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={analytics.submissionTrend}>
                      <defs>
                        <linearGradient id="labeler-submit-fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.04} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="hsl(var(--border) / 0.55)" vertical={false} />
                      <XAxis dataKey="statDate" tickFormatter={formatShortDate} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <Tooltip content={<DashboardTooltip formatLabel={formatShortDate} />} />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Area type="monotone" dataKey="submittedCount" name="已提交" stroke="hsl(var(--primary))" fill="url(#labeler-submit-fill)" strokeWidth={2.2} />
                      <Line type="monotone" dataKey="approvedCount" name="已通过" stroke="hsl(var(--foreground) / 0.78)" strokeWidth={2.2} dot={false} />
                      <Line type="monotone" dataKey="needsRevisionCount" name="待修改" stroke="hsl(var(--primary) / 0.45)" strokeWidth={2.2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <AnalyticsEmptyState message="最近 7 天还没有足够的个人提交趋势数据。" />
                )}
              </AnalyticsCard>

              <AnalyticsCard title="结果分布" description="最近 14 天的通过、驳回和待修改结果。">
                {hasResultData ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <RechartsPieChart>
                      <Tooltip content={<DashboardTooltip />} />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Pie data={analytics.resultDistribution} dataKey="count" nameKey="status" innerRadius={62} outerRadius={92} paddingAngle={3}>
                        {analytics.resultDistribution.map((entry, index) => (
                          <Cell key={`${entry.status}-${index}`} fill={LABELER_COLORS[index % LABELER_COLORS.length]} />
                        ))}
                      </Pie>
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <AnalyticsEmptyState message="最近 14 天还没有足够的结果分布数据。" />
                )}
              </AnalyticsCard>

              <AnalyticsCard title="质量分走势" description="个人质量分与平台基准线同时展示。">
                {hasQualityData ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={analytics.submissionTrend}>
                      <CartesianGrid stroke="hsl(var(--border) / 0.55)" vertical={false} />
                      <XAxis dataKey="statDate" tickFormatter={formatShortDate} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip content={<DashboardTooltip formatLabel={formatShortDate} />} />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Line type="monotone" dataKey="qualityScore" name="个人质量分" stroke="hsl(var(--primary))" strokeWidth={2.3} dot={false} />
                      <Line type="monotone" dataKey="platformQualityBaseline" name="平台基准线" stroke="hsl(var(--foreground) / 0.78)" strokeWidth={2.1} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <AnalyticsEmptyState message="当前还没有足够的质量分趋势数据。" />
                )}
              </AnalyticsCard>

              <AnalyticsCard title="参与任务列表" description="当前账号最活跃的任务参与情况。">
                {hasTaskParticipation ? (
                  <div className="grid gap-3">
                    {analytics.taskParticipation.map((task) => (
                      <div
                        key={task.taskId}
                        className="rounded-[18px] border border-border/70 bg-background/75 px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{task.taskName}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {task.deadlineAt ? `截止 ${formatDateTime(task.deadlineAt)}` : "未设置截止时间"}
                            </p>
                          </div>
                          <Badge variant="outline">{formatCount(task.submittedEverCount)} 次提交</Badge>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <StatPill label="待作答" value={task.openCount} />
                          <StatPill label="已通过" value={task.approvedCount} />
                          <StatPill label="需修改" value={task.needsRevisionCount} />
                          <StatPill label="累计提交" value={task.submittedEverCount} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <AnalyticsEmptyState message="当前还没有足够的参与任务明细数据。" />
                )}
              </AnalyticsCard>
            </div>
          </section>
        ) : null}
      </div>
    </AppPageContainer>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium text-foreground">{formatCount(value)}</p>
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
