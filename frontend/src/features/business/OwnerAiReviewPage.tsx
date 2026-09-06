import { useEffect, useState } from "react";
import { Bot, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppPageContainer } from "@/app/layout/AppPageContainer";
import { DimensionScoreGrid } from "@/components/workbench/shared/DimensionScoreGrid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { appMessage } from "@/lib/message";
import { cn } from "@/lib/utils";
import type { PageResponse } from "@/types";
import { ApiError, request } from "@/utils/apiClient";

type OwnerAiWorkbenchFilter = "attention" | "resolved" | "all";

interface OwnerSubmissionRow {
  id: string;
  taskTitle?: string | null;
  sourceItemKey?: string | null;
  itemSeqNo?: number | null;
  labelerName?: string | null;
  status?: string | null;
  currentRoundNo?: number | null;
  draftPreviewText?: string | null;
  payloadPreview?: Record<string, unknown> | null;
  lastSubmittedAt?: string | null;
  draftSavedAt?: string | null;
  createdAt?: string | null;
}

interface OwnerSubmissionDetail extends OwnerSubmissionRow {
  taskCode?: string | null;
  assignmentId?: string | null;
  itemId?: string | null;
  submitCount?: number | null;
  reviewerName?: string | null;
  draftData?: Record<string, unknown> | null;
  lifecycleTimeline?: Array<{
    id?: string | null;
    label?: string | null;
    detail?: string | null;
    occurredAt?: string | null;
    tone?: string | null;
  }>;
}

interface OwnerAiReviewSummary {
  verdict: string;
  totalScore: number;
  summary: string;
  modelId: string;
  analyzedAt: string;
  dimensions: Array<{
    dimensionKey: string;
    dimensionName: string;
    score: number;
    maxScore: number;
    weight: number;
    verdict: string;
  }>;
}

const ATTENTION_STATUSES = new Set(["SUBMITTED", "AI_REVIEWING", "HUMAN_REVIEWING"]);
const RESOLVED_STATUSES = new Set(["AI_PASSED", "AI_REJECTED", "APPROVED", "REJECTED", "NEEDS_REVISION"]);

const STATUS_META: Record<string, { label: string; variant: "secondary" | "warning" | "success" | "destructive" }> = {
  DRAFT: { label: "草稿", variant: "secondary" },
  SUBMITTED: { label: "已提交", variant: "secondary" },
  AI_REVIEWING: { label: "AI 审核中", variant: "warning" },
  HUMAN_REVIEWING: { label: "待人工复核", variant: "warning" },
  AI_PASSED: { label: "AI 通过", variant: "success" },
  AI_REJECTED: { label: "AI 驳回", variant: "destructive" },
  APPROVED: { label: "人工通过", variant: "success" },
  REJECTED: { label: "人工驳回", variant: "destructive" },
  NEEDS_REVISION: { label: "需返修", variant: "warning" },
};

const VERDICT_META: Record<string, { label: string; variant: "success" | "destructive" | "warning" | "secondary" }> = {
  PASS: { label: "AI 建议通过", variant: "success" },
  REJECT: { label: "AI 建议驳回", variant: "destructive" },
  REQUIRE_HUMAN: { label: "AI 建议人工复核", variant: "warning" },
  ERROR: { label: "AI 审核异常", variant: "secondary" },
};

function normalizeSubmissionRow(record: Record<string, unknown>): OwnerSubmissionRow {
  return {
    id: String(record.id ?? ""),
    taskTitle: record.taskTitle ? String(record.taskTitle) : null,
    sourceItemKey: record.sourceItemKey ? String(record.sourceItemKey) : null,
    itemSeqNo: typeof record.itemSeqNo === "number" ? record.itemSeqNo : null,
    labelerName: record.labelerName ? String(record.labelerName) : null,
    status: record.status ? String(record.status) : record.currentStatus ? String(record.currentStatus) : null,
    currentRoundNo: typeof record.currentRoundNo === "number" ? record.currentRoundNo : null,
    draftPreviewText: record.draftPreviewText ? String(record.draftPreviewText) : null,
    payloadPreview: isPlainObject(record.payloadPreview) ? record.payloadPreview : null,
    lastSubmittedAt: record.lastSubmittedAt ? String(record.lastSubmittedAt) : null,
    draftSavedAt: record.draftSavedAt ? String(record.draftSavedAt) : null,
    createdAt: record.createdAt ? String(record.createdAt) : null,
  };
}

function normalizeSubmissionDetail(record: Record<string, unknown>): OwnerSubmissionDetail {
  const summary = normalizeSubmissionRow(record);
  return {
    ...summary,
    taskCode: record.taskCode ? String(record.taskCode) : null,
    assignmentId: record.assignmentId ? String(record.assignmentId) : null,
    itemId: record.itemId ? String(record.itemId) : null,
    submitCount: typeof record.submitCount === "number" ? record.submitCount : null,
    reviewerName: record.reviewerName ? String(record.reviewerName) : null,
    draftData: isPlainObject(record.draftData) ? record.draftData : null,
    lifecycleTimeline: Array.isArray(record.lifecycleTimeline)
      ? record.lifecycleTimeline.map((item) => ({
          id: isPlainObject(item) && item.id ? String(item.id) : null,
          label: isPlainObject(item) && item.label ? String(item.label) : null,
          detail: isPlainObject(item) && item.detail ? String(item.detail) : null,
          occurredAt: isPlainObject(item) && item.occurredAt ? String(item.occurredAt) : null,
          tone: isPlainObject(item) && item.tone ? String(item.tone) : null,
        }))
      : [],
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function matchesFilter(row: OwnerSubmissionRow, filter: OwnerAiWorkbenchFilter) {
  if (filter === "all") {
    return true;
  }
  const status = row.status ?? "";
  if (filter === "attention") {
    return ATTENTION_STATUSES.has(status);
  }
  return RESOLVED_STATUSES.has(status);
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function formatJson(value: unknown) {
  if (value == null) return "—";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function isMissingAiReview(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

function parseFilter(value: string | null): OwnerAiWorkbenchFilter {
  if (value === "resolved" || value === "all") {
    return value;
  }
  return "attention";
}

export function OwnerAiReviewPage() {
  const { submissionId } = useParams<{ submissionId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [rows, setRows] = useState<OwnerSubmissionRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [detail, setDetail] = useState<OwnerSubmissionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [aiReview, setAiReview] = useState<OwnerAiReviewSummary | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const filter = parseFilter(searchParams.get("status"));
  const filteredRows = rows.filter((row) => matchesFilter(row, filter));
  const currentId =
    submissionId && rows.some((row) => row.id === submissionId)
      ? submissionId
      : filteredRows[0]?.id ?? rows[0]?.id ?? "";

  const attentionCount = rows.filter((row) => matchesFilter(row, "attention")).length;
  const resolvedCount = rows.filter((row) => matchesFilter(row, "resolved")).length;

  useEffect(() => {
    let cancelled = false;
    setRowsLoading(true);
    request<PageResponse<Record<string, unknown>>>(`/api/v1/owner/submissions?page=1&pageSize=100`, {}, { notifyOnError: false })
      .then((page) => {
        if (cancelled) return;
        setRows((page.list ?? []).map((item) => normalizeSubmissionRow(item)));
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          appMessage.errorFrom(error, "加载 Owner 提交列表失败");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRowsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (!currentId) {
      return;
    }
    if (currentId !== submissionId) {
      navigate(`/owner/ai-review/${currentId}?status=${filter}`, { replace: true, preventScrollReset: true });
    }
  }, [currentId, filter, navigate, submissionId]);

  useEffect(() => {
    if (!currentId) {
      setDetail(null);
      setAiReview(null);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setReviewLoading(true);

    request<Record<string, unknown>>(`/api/v1/owner/submissions/${encodeURIComponent(currentId)}`, {}, { notifyOnError: false })
      .then((response) => {
        if (!cancelled) {
          setDetail(normalizeSubmissionDetail(response));
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          appMessage.errorFrom(error, "加载提交详情失败");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoading(false);
        }
      });

    request<OwnerAiReviewSummary | null>(`/api/v1/owner/submissions/${encodeURIComponent(currentId)}/ai-review`, {}, { notifyOnError: false })
      .then((response) => {
        if (!cancelled) {
          setAiReview(response ?? null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setAiReview(null);
          if (!isMissingAiReview(error)) {
            appMessage.errorFrom(error, "加载 AI 审核结果失败");
          }
        }
      })
      .finally(() => {
        if (!cancelled) {
          setReviewLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentId]);

  return (
    <AppPageContainer
      title="Owner AI 审核台"
      description="围绕提交巡检、AI 预审结果查看和人工接力判断，给 Owner 提供独立主页面，而不是只停留在低代码列表的单条弹窗。"
      extra={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setRefreshKey((value) => value + 1)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新列表
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/owner/submissions">打开提交记录</Link>
          </Button>
        </div>
      }
    >
      <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="min-h-0 rounded-[28px] border-border/70 bg-card/95 shadow-[0_18px_42px_hsl(var(--foreground)/0.08)]">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Badge variant="warning" className="mb-2 w-fit">待关注</Badge>
                <CardTitle>提交流转队列</CardTitle>
                <CardDescription>优先盯 `SUBMITTED / AI_REVIEWING / HUMAN_REVIEWING`，快速找到需要 Owner 跟进的样本。</CardDescription>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div>{attentionCount} 条待关注</div>
                <div>{resolvedCount} 条已出结果</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "attention", label: "待关注" },
                { key: "resolved", label: "已出结果" },
                { key: "all", label: "全部" },
              ].map((item) => (
                <Button
                  key={item.key}
                  size="sm"
                  variant={filter === item.key ? "default" : "outline"}
                  onClick={() => setSearchParams({ status: item.key }, { replace: true })}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="min-h-0 pb-6">
            <ScrollArea className="min-h-0 max-h-[calc(100vh-22rem)] pr-1">
              <div className="space-y-3">
                {rowsLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="rounded-[22px] border border-border/70 p-4">
                      <Skeleton className="mb-3 h-5 w-32" />
                      <Skeleton className="mb-2 h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ))
                ) : filteredRows.length ? (
                  filteredRows.map((row) => {
                    const statusMeta = STATUS_META[row.status ?? ""] ?? { label: row.status ?? "未知状态", variant: "secondary" as const };
                    return (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => navigate(`/owner/ai-review/${row.id}?status=${filter}`, { replace: true, preventScrollReset: true })}
                        className={cn(
                          "w-full rounded-[22px] border p-4 text-left transition",
                          currentId === row.id
                            ? "border-primary/45 bg-primary/5 shadow-[0_16px_32px_hsl(var(--primary)/0.12)]"
                            : "border-border/70 bg-background/80 hover:border-primary/30 hover:bg-accent/30",
                        )}
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-foreground">
                              {row.taskTitle || "未命名任务"} · #{row.itemSeqNo ?? "?"}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {row.sourceItemKey || "未知题目"} · {row.labelerName || "未识别标注员"}
                            </div>
                          </div>
                          <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                        </div>
                        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                          {row.draftPreviewText || formatJson(row.payloadPreview)}
                        </p>
                        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                          <span>轮次 {row.currentRoundNo ?? "—"}</span>
                          <span>{formatDateTime(row.lastSubmittedAt || row.createdAt)}</span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-[22px] border border-dashed border-border/80 bg-background/70 p-6 text-sm text-muted-foreground">
                    当前筛选下没有提交记录。
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="grid min-h-0 gap-5">
          <Card className="rounded-[28px] border-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.2),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.94))] text-white shadow-[0_24px_60px_rgba(15,23,42,0.24)]">
            <CardHeader className="pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-white/70">
                    <Bot className="h-4 w-4" />
                    Owner AI Review
                  </div>
                  <CardTitle className="text-2xl text-white">
                    {detail?.taskTitle || "选择一条提交查看 AI 预审"}
                  </CardTitle>
                  <CardDescription className="mt-2 max-w-3xl text-slate-200">
                    {detail
                      ? `${detail.sourceItemKey || "未知题目"} · 标注员 ${detail.labelerName || "未识别"}`
                      : "左侧列表会优先聚合需要 Owner 关注的提交流转状态。"}
                  </CardDescription>
                </div>
                {detail ? (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-white/15 text-white">提交 #{detail.id}</Badge>
                    <Badge variant="outline" className="border-white/15 text-white">轮次 {detail.currentRoundNo ?? "—"}</Badge>
                    {detail.status ? (
                      <Badge variant="outline" className="border-white/15 text-white">
                        {STATUS_META[detail.status]?.label ?? detail.status}
                      </Badge>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <SignalCard title="待关注状态" value={String(attentionCount)} hint="需要继续盯的提交" />
              <SignalCard title="已出结果" value={String(resolvedCount)} hint="AI 或人工已有结论" />
              <SignalCard
                title="当前建议"
                value={aiReview ? (VERDICT_META[aiReview.verdict]?.label ?? aiReview.verdict) : "暂无记录"}
                hint={aiReview?.modelId || "尚未产生 AI 审核结果"}
              />
            </CardContent>
          </Card>

          <div className="grid min-h-0 gap-5 2xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="rounded-[28px] border-border/70 bg-card/95 shadow-[0_18px_42px_hsl(var(--foreground)/0.08)]">
              <CardHeader className="pb-3">
                <CardTitle>AI 预审结果</CardTitle>
                <CardDescription>沿用现有 owner 提交 AI 详情接口，强化 Owner 视角的集中查看体验。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {reviewLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-28 w-full" />
                  </div>
                ) : aiReview ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-border/70 bg-background/70 p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant={VERDICT_META[aiReview.verdict]?.variant ?? "secondary"}>
                          {VERDICT_META[aiReview.verdict]?.label ?? aiReview.verdict}
                        </Badge>
                        <div className="text-2xl font-semibold text-foreground">{aiReview.totalScore?.toFixed(1) ?? "—"} 分</div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {aiReview.modelId || "未知模型"} · {formatDateTime(aiReview.analyzedAt)}
                      </div>
                    </div>
                    {aiReview.summary ? (
                      <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">审核摘要</div>
                        <p className="text-sm leading-6 text-foreground">{aiReview.summary}</p>
                      </div>
                    ) : null}
                    {aiReview.dimensions?.length ? (
                      <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
                        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">维度评分</div>
                        <DimensionScoreGrid
                          dimensions={aiReview.dimensions.map((item) => ({
                            key: item.dimensionKey,
                            label: item.dimensionName,
                            score: item.score,
                            maxScore: item.maxScore,
                          }))}
                        />
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="rounded-[22px] border border-dashed border-border/80 bg-background/70 p-6 text-sm text-muted-foreground">
                    当前提交暂无 AI 审核记录，可能仍未进入 AI 预审，或本地联调尚未产出结果。
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-border/70 bg-card/95 shadow-[0_18px_42px_hsl(var(--foreground)/0.08)]">
              <CardHeader className="pb-3">
                <CardTitle>提交上下文</CardTitle>
                <CardDescription>把 Owner 做判断最需要的基础元数据、题目摘要和生命周期集中到同一屏。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {detailLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-28 w-full" />
                  </div>
                ) : detail ? (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      <ContextField label="任务编码" value={detail.taskCode} />
                      <ContextField label="提交 ID" value={detail.id} />
                      <ContextField label="分配 ID" value={detail.assignmentId} />
                      <ContextField label="题目 ID" value={detail.itemId} />
                      <ContextField label="审核人" value={detail.reviewerName} />
                      <ContextField label="提交次数" value={detail.submitCount} />
                    </div>

                    <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">题目摘要</div>
                      <pre className="overflow-auto whitespace-pre-wrap break-all text-xs leading-6 text-foreground">
                        {formatJson(detail.payloadPreview)}
                      </pre>
                    </div>

                    <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
                      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">生命周期</div>
                      <div className="space-y-3">
                        {detail.lifecycleTimeline?.length ? (
                          detail.lifecycleTimeline.slice(0, 6).map((item, index) => (
                            <div key={item.id || `${item.label}-${index}`} className="flex gap-3">
                              <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <ChevronRight className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-foreground">{item.label || "状态流转"}</div>
                                <div className="text-xs leading-5 text-muted-foreground">
                                  {item.detail || "—"} · {formatDateTime(item.occurredAt)}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-muted-foreground">当前没有可展示的生命周期记录。</div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-[22px] border border-dashed border-border/80 bg-background/70 p-6 text-sm text-muted-foreground">
                    {rowsLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        正在加载提交数据
                      </span>
                    ) : (
                      "当前没有可查看的提交。"
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppPageContainer>
  );
}

function SignalCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/8 p-4 backdrop-blur">
      <div className="mb-2 text-[11px] uppercase tracking-[0.24em] text-white/70">{title}</div>
      <div className="text-xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm text-slate-200">{hint}</div>
    </div>
  );
}

function ContextField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground">{value == null || value === "" ? "—" : String(value)}</div>
    </div>
  );
}
