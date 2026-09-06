export interface AiReviewSummaryDimension {
  dimensionKey: string;
  dimensionName: string;
  score: number;
  maxScore: number;
  weight: number;
  verdict: string;
  comment?: string | null;
}

export interface AiReviewSummary {
  status?: string | null;
  verdict?: string | null;
  totalScore?: number | null;
  summary?: string | null;
  failureReason?: string | null;
  modelId?: string | null;
  analyzedAt?: string | null;
  dimensions: AiReviewSummaryDimension[];
}

export const AI_REVIEW_STATUS_META: Record<string, { label: string; badge: "success" | "destructive" | "warning" | "secondary" }> = {
  SUCCESS: { label: "AI 审核完成", badge: "success" },
  FAILED: { label: "AI 审核失败", badge: "destructive" },
  RUNNING: { label: "AI 审核进行中", badge: "warning" },
  PENDING: { label: "AI 审核排队中", badge: "secondary" },
};

export const AI_REVIEW_VERDICT_META: Record<string, { label: string; badge: "success" | "destructive" | "warning" }> = {
  PASS: { label: "AI 建议：通过", badge: "success" },
  REJECT: { label: "AI 建议：驳回", badge: "destructive" },
  REQUIRE_HUMAN: { label: "AI 建议：人工复核", badge: "warning" },
  ERROR: { label: "审核异常", badge: "warning" },
};

export function formatAiReviewScore(totalScore?: number | null) {
  return typeof totalScore === "number" && Number.isFinite(totalScore) ? totalScore.toFixed(1) : "—";
}
