import { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { appMessage } from "@/lib/message";
import { request } from "@/utils/apiClient";
import { DimensionScoreGrid } from "@/components/workbench/shared/DimensionScoreGrid";
import {
  AI_REVIEW_STATUS_META,
  AI_REVIEW_VERDICT_META,
  formatAiReviewScore,
  type AiReviewSummary,
} from "@/features/business/owner-ai-review-shared";

export function OwnerAiReviewDialog({
  submissionId,
  onClosed,
}: {
  submissionId: number;
  onClosed?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [data, setData] = useState<AiReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!submissionId) return;
    const controller = new AbortController();
    setLoading(true);
    request<AiReviewSummary | null>(
      `/api/v1/owner/submissions/${submissionId}/ai-review`,
      { signal: controller.signal },
      { notifyOnError: false },
    )
      .then((res) => {
        setData(res ?? null);
      })
      .catch((err) => {
        if (controller.signal.aborted) {
          return;
        }
        appMessage.errorFrom(err, "加载 AI 审核结果失败");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [submissionId]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          onClosed?.();
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-violet-600" />
            AI 预审结果
          </DialogTitle>
          <DialogDescription>该提交的 AI 自动审核结果详情</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : !data ? (
          <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
            <Bot className="h-10 w-10 text-muted-foreground/50" />
            <p>暂无 AI 审核记录</p>
            <p className="text-xs">该提交可能尚未经过 AI 预审或审核尚未完成。</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Verdict + Score */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge variant={AI_REVIEW_STATUS_META[data.status ?? ""]?.badge ?? "secondary"}>
                  {AI_REVIEW_STATUS_META[data.status ?? ""]?.label ?? (data.status || "AI 状态未知")}
                </Badge>
                {data.verdict ? (
                  <Badge variant={AI_REVIEW_VERDICT_META[data.verdict]?.badge ?? "secondary"}>
                    {AI_REVIEW_VERDICT_META[data.verdict]?.label ?? data.verdict}
                  </Badge>
                ) : null}
                <span className="text-lg font-bold text-foreground">{formatAiReviewScore(data.totalScore)} 分</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {data.modelId || "模型未知"} · {data.analyzedAt ? new Date(data.analyzedAt).toLocaleString() : "—"}
              </span>
            </div>

            {data.failureReason ? (
              <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
                {data.failureReason}
              </div>
            ) : null}

            {/* Dimension scores */}
            {data.dimensions && data.dimensions.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  维度评分
                </p>
                <DimensionScoreGrid
                  dimensions={data.dimensions.map((d) => ({
                    key: d.dimensionKey,
                    label: d.dimensionName,
                    score: d.score,
                    maxScore: d.maxScore,
                    comment: d.comment ?? undefined,
                  }))}
                  className="rounded-lg border border-border bg-muted/50 p-3"
                />
              </div>
            ) : null}

            {/* Summary */}
            {data.summary ? (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  审核摘要
                </p>
                <p className="rounded-lg border border-border bg-card p-3 text-sm leading-6 text-foreground">
                  {data.summary}
                </p>
              </div>
            ) : null}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
