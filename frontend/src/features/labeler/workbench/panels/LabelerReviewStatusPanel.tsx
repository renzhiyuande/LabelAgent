import { Bot, ClipboardCheck, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AuditTimeline } from "@/components/workbench/shared/AuditTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AI_REVIEW_STATUS_META,
  AI_REVIEW_VERDICT_META,
  formatAiReviewScore,
} from "@/features/business/owner-ai-review-shared";
import { cn } from "@/lib/utils";
import { DimensionScoreGrid } from "@/components/workbench/shared/DimensionScoreGrid";
import type { LabelerWorkDetailResponse, LabelerAiReviewSummary } from "../../api/labeler-work-api";
import { fetchLabelerAiReview } from "../../api/labeler-work-api";
import { useLabelerSubmissionTimeline } from "../hooks/use-labeler-submission-timeline";
import { PayloadPanelReviewBanner } from "./payload/PayloadPanelReviewBanner";
import { needsReviewCommentHint } from "../utils/extract-review-comment";
import {
  isFirstAnnotation,
  resolveSubmissionStatusMeta,
  shouldShowReviewPanel,
} from "../utils/submission-review";

const AI_REVIEW_STATUSES = new Set(["AI_PASSED", "AI_REJECTED", "HUMAN_REVIEWING", "AI_REVIEWING"]);

interface LabelerReviewStatusPanelProps {
  work: LabelerWorkDetailResponse;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  storageKey?: string;
  title?: string;
}

function readCollapsedPreference(storageKey: string, defaultCollapsed: boolean): boolean {
  if (typeof window === "undefined") {
    return defaultCollapsed;
  }
  const stored = localStorage.getItem(storageKey);
  if (stored === "true") {
    return true;
  }
  if (stored === "false") {
    return false;
  }
  return defaultCollapsed;
}

export function LabelerReviewStatusPanel({
  work,
  className,
  collapsible = false,
  defaultCollapsed = false,
  storageKey = "labeler.reviewPanel.collapsed",
  title = "审核进度",
}: LabelerReviewStatusPanelProps) {
  const showReview = shouldShowReviewPanel(work);
  const status = work.submission.currentStatus;
  const meta = resolveSubmissionStatusMeta(status);
  const reviewerName = work.lastReview?.reviewerName?.trim() || null;
  const reviewedAt = work.lastReview?.reviewedAt
    ? new Date(work.lastReview.reviewedAt).toLocaleString()
    : null;

  const { entries, reviewComment, loading, error } = useLabelerSubmissionTimeline(
    work.submission.id,
    showReview,
    work.lastReview?.comment,
  );

  const [collapsed, setCollapsed] = useState(() =>
    collapsible ? readCollapsedPreference(storageKey, defaultCollapsed) : false,
  );

  const [aiData, setAiData] = useState<LabelerAiReviewSummary | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(false);

  const hasAiReview = AI_REVIEW_STATUSES.has(status) || (status === "SUBMITTED" && aiData !== null);

  useEffect(() => {
    if (collapsible) {
      localStorage.setItem(storageKey, String(collapsed));
    }
  }, [collapsed, collapsible, storageKey]);

  useEffect(() => {
    if (!showReview || !AI_REVIEW_STATUSES.has(status)) {
      setAiData(null);
      return;
    }
    let cancelled = false;
    setAiLoading(true);
    void fetchLabelerAiReview(work.submission.id)
      .then((result) => {
        if (!cancelled) {
          setAiData(result);
        }
      })
      .catch(() => {
        if (!cancelled) setAiData(null);
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });
    return () => { cancelled = true; };
  }, [work.submission.id, showReview, status]);

  if (!showReview) {
    return (
      <div
        className={cn(
          "flex h-full min-h-[120px] flex-col items-center justify-center px-6 text-center text-sm text-slate-500 dark:text-slate-400",
          className,
        )}
      >
        首次标注中，提交后可在此查看人工审核状态、打回意见与审计日志。
      </div>
    );
  }

  return (
    <section className={cn(collapsed ? "p-3" : "p-3.5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ClipboardCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</p>
              {!collapsed ? <Badge variant={meta.badge}>{meta.label}</Badge> : null}
            </div>
            {!collapsed && meta.hint ? (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{meta.hint}</p>
            ) : (
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{meta.label}</p>
            )}
          </div>
        </div>
        {collapsible ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-slate-500"
            onClick={() => setCollapsed((current) => !current)}
          >
            {collapsed ? (
              <>
                展开
                <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </>
            ) : (
              <>
                收起
                <ChevronUp className="ml-1 h-3.5 w-3.5" />
              </>
            )}
          </Button>
        ) : null}
      </div>

      {!collapsed ? (
        <div className="mt-3 space-y-3">
          {reviewComment ? (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
              <PayloadPanelReviewBanner comment={reviewComment} />
              {reviewerName || reviewedAt ? (
                <p className="mt-2 text-[11px] text-amber-800/80 dark:text-amber-200/80">
                  {reviewerName ? `审核人：${reviewerName}` : null}
                  {reviewerName && reviewedAt ? " · " : null}
                  {reviewedAt ?? null}
                </p>
              ) : null}
            </div>
          ) : needsReviewCommentHint(status) && !loading ? (
            <p className="rounded-lg border border-dashed border-slate-200/80 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
              暂无详细打回意见，请展开审计日志查看审核记录。
            </p>
          ) : null}

          {/* AI 预审结果（折叠面板） */}
          {aiData && aiData.status && aiData.status !== "SUCCESS" ? (
            <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-3 dark:border-violet-500/20 dark:bg-violet-500/5">
              <div className="flex items-center gap-2">
                <Badge variant={AI_REVIEW_STATUS_META[aiData.status]?.badge ?? "secondary"} className="text-[10px]">
                  {AI_REVIEW_STATUS_META[aiData.status]?.label ?? aiData.status}
                </Badge>
                <span className="text-[11px] text-violet-600/80 dark:text-violet-300/70">
                  {aiData.failureReason || "当前提交的 AI 预审尚未产出可展示的评分结果。"}
                </span>
              </div>
            </div>
          ) : aiData && !aiData.summary ? (
            <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-3 dark:border-violet-500/20 dark:bg-violet-500/5">
              <p className="text-xs font-medium text-violet-700 dark:text-violet-300">AI 预审完成</p>
              <p className="mt-1 text-xs text-violet-600/80 dark:text-violet-300/70">
                分数：{formatAiReviewScore(aiData.totalScore)} · 判定：{aiData.verdict ?? "—"}
              </p>
            </div>
          ) : aiData && aiExpanded ? (
            <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-3 dark:border-violet-500/20 dark:bg-violet-500/5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-violet-700 dark:text-violet-300">AI 预审结果</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-violet-500"
                  onClick={() => setAiExpanded(false)}
                >
                  收起
                  <ChevronUp className="ml-1 h-3 w-3" />
                </Button>
              </div>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={AI_REVIEW_VERDICT_META[aiData.verdict ?? ""]?.badge ?? "secondary"} className="text-[10px]">
                    {AI_REVIEW_VERDICT_META[aiData.verdict ?? ""]?.label ?? (aiData.verdict || "AI 判定未知")}
                  </Badge>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {formatAiReviewScore(aiData.totalScore)}
                  </span>
                  <span className="text-[10px] text-slate-500">{aiData.modelId}</span>
                </div>
                {aiData.dimensions && aiData.dimensions.length > 0 ? (
                  <DimensionScoreGrid
                    dimensions={aiData.dimensions.map((d) => ({
                      key: d.dimensionKey,
                      label: d.dimensionName,
                      score: d.score,
                      maxScore: d.maxScore,
                    }))}
                    columns={2}
                  />
                ) : null}
                {aiData.summary ? (
                  <p className="text-xs leading-5 text-slate-600 dark:text-slate-400">{aiData.summary}</p>
                ) : null}
                {aiData.failureReason ? (
                  <p className="text-xs leading-5 text-destructive">{aiData.failureReason}</p>
                ) : null}
              </div>
            </div>
          ) : aiData ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg border border-violet-100 bg-violet-50/50 px-3 py-2 text-left text-xs text-violet-700 transition-colors hover:bg-violet-100/60 dark:border-violet-500/20 dark:bg-violet-500/5 dark:text-violet-300 dark:hover:bg-violet-500/10"
              onClick={() => setAiExpanded(true)}
            >
              <Bot className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">
                AI 预审 · {formatAiReviewScore(aiData.totalScore)} 分
                {aiData.verdict === "PASS" ? " · 建议通过" : aiData.verdict === "REJECT" ? " · 建议驳回" : " · 需人工复核"}
              </span>
              <ChevronDown className="h-3 w-3 shrink-0" />
            </button>
          ) : aiLoading ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              加载 AI 审核结果…
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">审计日志</p>
            {loading ? (
              <p className="text-sm text-slate-500">加载中…</p>
            ) : error ? (
              <p className="text-sm text-slate-500">{error}</p>
            ) : (
              <AuditTimeline entries={entries} variant="compact" className="border-0 bg-transparent p-0 shadow-none" />
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function isLabelerFirstAnnotation(work: LabelerWorkDetailResponse): boolean {
  return isFirstAnnotation(work);
}
