import { request } from "@/utils/apiClient";

export interface AiReviewObservabilitySummary {
  queuePending: number;
  queueRunning: number;
  reviewsLastHour: number;
  reviewsLast24Hours: number;
  failedLast24Hours: number;
  failureRateLast24Hours: number;
  avgLatencyMsLast24Hours: number;
  totalTokensLast24Hours: number;
  estimatedCostLast24Hours?: number | null;
  attentionCount: number;
  refreshedAt?: string;
}

export interface AiReviewThroughputPoint {
  bucketStart: string;
  completedCount: number;
  failedCount: number;
  avgLatencyMs: number;
}

export interface AiReviewModelBucket {
  platformKey: string;
  modelId: string;
  count: number;
  failedCount: number;
  avgLatencyMs: number;
}

export interface AiReviewTopKItem {
  aiReviewId: string;
  submissionId: string;
  taskId: string;
  taskTitle?: string | null;
  taskCode?: string | null;
  modelId: string;
  status: string;
  verdict: string;
  attemptCount?: number | null;
  totalLatencyMs?: number | null;
  totalTokens?: number | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  estimatedCost?: number | null;
  traceabilityStatus?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  failureReason?: string | null;
}

export interface AiReviewObservabilityOverview {
  summary: AiReviewObservabilitySummary;
  throughputTrend: AiReviewThroughputPoint[];
  modelDistribution: AiReviewModelBucket[];
  topSlow: AiReviewTopKItem[];
  topFailed: AiReviewTopKItem[];
  topRetry: AiReviewTopKItem[];
}

export interface AiReviewObservabilityRecordSummary {
  id: string;
  submissionId: string;
  submissionVersionId: string;
  taskId: string;
  taskTitle?: string | null;
  taskCode?: string | null;
  platformKey: string;
  modelId: string;
  status: string;
  verdict: string;
  attemptCount?: number | null;
  totalLatencyMs?: number | null;
  totalTokens?: number | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  estimatedCost?: number | null;
  traceabilityStatus?: string | null;
  historyGapReason?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  failureReason?: string | null;
}

export interface AiReviewLlmAttempt {
  attemptNo: number;
  platformKey?: string | null;
  modelId?: string | null;
  providerRequestId?: string | null;
  promptSnapshot?: string | null;
  responseSnapshot?: string | null;
  errorMessage?: string | null;
  success: boolean;
  latencyMs?: number | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  estimatedCost?: number | null;
  traceabilityStatus?: string | null;
  historyGapReason?: string | null;
}

export interface AiReviewTimelineEntry {
  phase: string;
  status: string;
  detail?: string | null;
  occurredAt?: string | null;
  traceabilityStatus?: string | null;
}

export interface AiReviewObservabilityRecordDetail {
  summary: AiReviewObservabilityRecordSummary;
  attempts: AiReviewLlmAttempt[];
  timeline: AiReviewTimelineEntry[];
  promptSnapshot?: string | null;
  rawResponseText?: string | null;
}

export interface AiReviewObservabilityRecordPage {
  page: {
    total: number;
    page: number;
    pageSize: number;
    list: AiReviewObservabilityRecordSummary[];
  };
}

type Scope = "admin" | "owner";

function basePath(scope: Scope) {
  return scope === "admin" ? "/api/v1/admin/ai-review-observability" : "/api/v1/owner/ai-review-observability";
}

export async function fetchAiReviewObservabilityOverview(scope: Scope, trendHours = 24, signal?: AbortSignal) {
  return request<AiReviewObservabilityOverview>(`${basePath(scope)}/overview`, {
    params: { trendHours },
    signal,
  });
}

export async function fetchAiReviewObservabilitySummary(scope: Scope, signal?: AbortSignal) {
  return request<AiReviewObservabilitySummary>(`${basePath(scope)}/summary`, { signal });
}

export async function fetchAiReviewObservabilityRecords(
  scope: Scope,
  params: {
    page?: number;
    size?: number;
    taskId?: string;
    status?: string;
    modelId?: string;
    verdict?: string;
  },
  signal?: AbortSignal,
) {
  return request<AiReviewObservabilityRecordPage>(`${basePath(scope)}/records`, {
    params,
    signal,
  });
}

export async function fetchAiReviewObservabilityRecordDetail(
  scope: Scope,
  aiReviewId: string,
  signal?: AbortSignal,
) {
  return request<AiReviewObservabilityRecordDetail>(`${basePath(scope)}/records/${aiReviewId}`, { signal });
}

export function formatTraceability(status?: string | null) {
  if (!status || status === "FULL") {
    return "完整采集";
  }
  if (status === "LEGACY_BACKFILLED") {
    return "历史回填";
  }
  return status;
}

export function formatLatency(ms?: number | null) {
  if (ms == null) {
    return "—";
  }
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${ms}ms`;
}

export function formatTokenCount(value?: number | null) {
  if (value == null) {
    return "不可追溯";
  }
  return value.toLocaleString();
}

export function formatTokenUsage(
  promptTokens?: number | null,
  completionTokens?: number | null,
  totalTokens?: number | null,
) {
  if (promptTokens == null && completionTokens == null && totalTokens == null) {
    return "不可追溯";
  }
  const parts: string[] = [];
  if (promptTokens != null) {
    parts.push(`输入 ${formatTokenCount(promptTokens)}`);
  }
  if (completionTokens != null) {
    parts.push(`输出 ${formatTokenCount(completionTokens)}`);
  }
  if (totalTokens != null) {
    parts.push(`合计 ${formatTokenCount(totalTokens)}`);
  }
  return parts.join(" · ");
}

export function formatEstimatedCost(cost?: number | null) {
  if (cost == null) {
    return null;
  }
  if (cost >= 1) {
    return cost.toFixed(4);
  }
  if (cost >= 0.01) {
    return cost.toFixed(6);
  }
  return cost.toFixed(8);
}
