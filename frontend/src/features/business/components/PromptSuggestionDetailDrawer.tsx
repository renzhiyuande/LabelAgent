import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { appMessage } from "@/lib/message";
import {
  acceptPromptSuggestion,
  buildAbTestTableRows,
  dismissPromptSuggestion,
  fetchPromptSuggestionDetail,
  formatHealthRate,
  SUGGESTION_STATUS_META,
  type AiReviewPromptSuggestionDetail,
} from "@/features/business/owner-ai-review-health-api";

interface PromptSuggestionDetailDrawerProps {
  suggestionId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolved?: () => void;
}

function PromptBlock({ title, content }: { title: string; content: string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-[16px] border border-border/70 bg-muted/40 p-3 text-xs leading-6 text-foreground">
        {content || "（空）"}
      </pre>
    </div>
  );
}

export function PromptSuggestionDetailDrawer({
  suggestionId,
  open,
  onOpenChange,
  onResolved,
}: PromptSuggestionDetailDrawerProps) {
  const [detail, setDetail] = useState<AiReviewPromptSuggestionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState<"accept" | "dismiss" | null>(null);
  const [confirmAction, setConfirmAction] = useState<"accept" | "dismiss" | null>(null);
  const [dismissReason, setDismissReason] = useState("");

  useEffect(() => {
    if (!open || suggestionId == null) {
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetchPromptSuggestionDetail(suggestionId, controller.signal)
      .then((result) => setDetail(result))
      .catch((error) => {
        if (!controller.signal.aborted) {
          appMessage.errorFrom(error, "加载优化建议详情失败");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [open, suggestionId]);

  useEffect(() => {
    if (!open) {
      setDetail(null);
      setConfirmAction(null);
      setDismissReason("");
    }
  }, [open]);

  const abRows = useMemo(() => buildAbTestTableRows(detail?.abTestReport), [detail?.abTestReport]);
  const canDecide = detail?.status === "PENDING";

  async function handleAccept() {
    if (!detail) return;
    setSubmitting("accept");
    try {
      const result = await acceptPromptSuggestion(detail.id);
      appMessage.success(`已采纳建议，新模板版本草稿 ID：${result.acceptedTemplateVersionId}`);
      setConfirmAction(null);
      onOpenChange(false);
      onResolved?.();
    } catch (error) {
      appMessage.errorFrom(error, "采纳建议失败");
    } finally {
      setSubmitting(null);
    }
  }

  async function handleDismiss() {
    if (!detail) return;
    const reason = dismissReason.trim();
    if (!reason) {
      appMessage.info("请填写忽略原因");
      return;
    }
    setSubmitting("dismiss");
    try {
      await dismissPromptSuggestion(detail.id, { dismissReason: reason });
      appMessage.success("已忽略该优化建议");
      setConfirmAction(null);
      onOpenChange(false);
      onResolved?.();
    } catch (error) {
      appMessage.errorFrom(error, "忽略建议失败");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[92vh] max-w-5xl flex-col overflow-hidden p-0">
          <DialogHeader className="border-b border-border/70 px-6 py-5">
            <DialogTitle className="flex flex-wrap items-center gap-2 text-xl">
              提示词优化建议
              {detail ? (
                <Badge variant={SUGGESTION_STATUS_META[detail.status]?.variant ?? "secondary"}>
                  {SUGGESTION_STATUS_META[detail.status]?.label ?? detail.status}
                </Badge>
              ) : null}
            </DialogTitle>
            <DialogDescription>
              对比基线与候选 Prompt，查看离线 A/B 报告后决定是否采纳为新模板版本草稿。
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : !detail ? (
              <p className="text-sm text-muted-foreground">暂无建议详情</p>
            ) : (
              <div className="space-y-6">
                <div className="rounded-[20px] border border-border/70 bg-card/80 p-4">
                  <p className="text-sm font-medium text-foreground">变更摘要</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail.changeSummary || "—"}</p>
                  {detail.baselineMetrics ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      触发时一致率 {formatHealthRate(detail.baselineMetrics.metrics.aiHumanAgreementRate)} · 样本量{" "}
                      {detail.baselineMetrics.sampleCount}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <PromptBlock title="基线 Prompt" content={detail.baselinePromptTemplate} />
                  <PromptBlock title="候选 Prompt" content={detail.candidatePromptTemplate} />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">A/B 离线评估</p>
                    {detail.abTestReport?.overallPassed != null ? (
                      <Badge variant={detail.abTestReport.overallPassed ? "default" : "destructive"}>
                        {detail.abTestReport.overallPassed ? "综合通过" : "未达采纳门槛"}
                      </Badge>
                    ) : null}
                  </div>
                  {abRows.length ? (
                    <div className="overflow-hidden rounded-[20px] border border-border/70">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3 font-medium">指标</th>
                            <th className="px-4 py-3 font-medium">基线</th>
                            <th className="px-4 py-3 font-medium">候选</th>
                            <th className="px-4 py-3 font-medium">变化</th>
                            <th className="px-4 py-3 font-medium">结果</th>
                          </tr>
                        </thead>
                        <tbody>
                          {abRows.map((row) => (
                            <tr key={row.key} className="border-t border-border/60">
                              <td className="px-4 py-3 text-foreground">{row.label}</td>
                              <td className="px-4 py-3 text-muted-foreground">{formatMetricValue(row.key, row.baselineValue)}</td>
                              <td className="px-4 py-3 text-muted-foreground">{formatMetricValue(row.key, row.candidateValue)}</td>
                              <td className="px-4 py-3 text-muted-foreground">{formatDelta(row.key, row.delta)}</td>
                              <td className="px-4 py-3">
                                {row.passed == null ? (
                                  <span className="text-muted-foreground">—</span>
                                ) : row.passed ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-destructive" />
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">暂无 A/B 报告数据</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {canDecide ? (
            <DialogFooter className="border-t border-border/70 px-6 py-4 sm:justify-between">
              <p className="text-xs text-muted-foreground">采纳后将创建新的模板版本草稿，需手动发布后才生效。</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setConfirmAction("dismiss")}>
                  忽略建议
                </Button>
                <Button onClick={() => setConfirmAction("accept")}>采纳建议</Button>
              </div>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmAction != null} onOpenChange={(next) => !next && setConfirmAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmAction === "accept" ? "确认采纳建议？" : "确认忽略建议？"}</DialogTitle>
            <DialogDescription>
              {confirmAction === "accept"
                ? "系统将复制当前模板版本并替换预审 Prompt，生成新的草稿版本。"
                : "忽略后 14 天内不会再次推送同类优化建议。"}
            </DialogDescription>
          </DialogHeader>
          {confirmAction === "dismiss" ? (
            <Textarea
              value={dismissReason}
              onChange={(event) => setDismissReason(event.target.value)}
              placeholder="请说明忽略原因，便于后续复盘"
              rows={4}
            />
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)} disabled={submitting != null}>
              取消
            </Button>
            <Button
              variant={confirmAction === "dismiss" ? "destructive" : "default"}
              disabled={submitting != null}
              onClick={() => {
                if (confirmAction === "accept") {
                  void handleAccept();
                } else {
                  void handleDismiss();
                }
              }}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {confirmAction === "accept" ? "确认采纳" : "确认忽略"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function isRateMetric(key: string): boolean {
  return key.includes("rate") || key.includes("ratio");
}

function formatMetricValue(key: string, value: number): string {
  if (key.includes("median_dev") || key.includes("overfit_gap")) {
    return value.toFixed(2);
  }
  if (isRateMetric(key)) {
    return formatHealthRate(value);
  }
  return String(value);
}

function formatDelta(key: string, delta: number): string {
  const prefix = delta > 0 ? "+" : "";
  if (key.includes("median_dev") || key.includes("overfit_gap")) {
    return `${prefix}${delta.toFixed(2)}`;
  }
  if (isRateMetric(key)) {
    return `${prefix}${(delta * 100).toFixed(1)}pp`;
  }
  return `${prefix}${delta}`;
}
