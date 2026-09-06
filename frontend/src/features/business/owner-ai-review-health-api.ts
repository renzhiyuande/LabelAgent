import { request } from "@/utils/apiClient";

export interface AiReviewHealthCatalogItem {
  taskId: string;
  taskTitle: string;
  taskCode?: string;
  templateId: string;
  templateName: string;
  templateCode?: string;
}

export interface AiReviewHealthCatalogPage {
  total: number;
  page: number;
  pageSize: number;
  list: AiReviewHealthCatalogItem[];
}

interface AiReviewHealthCatalogItemDto {
  taskId?: string | number | null;
  taskTitle?: string | null;
  taskCode?: string | null;
  templateId?: string | number | null;
  templateName?: string | null;
  templateCode?: string | null;
}

interface AiReviewHealthCatalogPageDto {
  total?: number | null;
  page?: number | null;
  pageSize?: number | null;
  list?: AiReviewHealthCatalogItemDto[] | null;
}

export interface FetchAiReviewHealthCatalogParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  includeTemplateId?: string | null;
}

export type AiReviewHealthStatus = "HEALTHY" | "WARNING" | "NEEDS_OPTIMIZATION";

export type AiReviewPromptSuggestionStatus = "PENDING" | "ACCEPTED" | "DISMISSED" | "EXPIRED";

export interface AiReviewPromptHealthMetricsDetail {
  aiHumanAgreementRate: number;
  aiRejectAppealPassRate: number;
  aiPassHumanRejectRate: number;
  requireHumanRatio: number;
}

export interface AiReviewPromptHealthMetrics {
  id?: number | null;
  templateVersionId?: number | null;
  taskId?: number | null;
  metricDate: string;
  windowDays: number;
  sampleCount: number;
  metrics: AiReviewPromptHealthMetricsDetail;
  healthStatus: AiReviewHealthStatus;
  createdAt?: string | null;
}

export type AiReviewHealthAggregationMode = "TEMPLATE" | "VERSION";

export interface AiReviewPromptHealthAggregationScope {
  mode: AiReviewHealthAggregationMode;
  templateVersionId?: number | null;
  versionCount?: number | null;
  label: string;
}

export interface AiReviewPromptHealthOverview {
  templateId: number;
  templateVersionId?: number | null;
  aggregationScope?: AiReviewPromptHealthAggregationScope | null;
  latest?: AiReviewPromptHealthMetrics | null;
  trendLast7Days: AiReviewPromptHealthMetrics[];
  scoreCalibrationSummary?: AiReviewScoreCalibrationSummary | null;
}

export interface FetchAiReviewHealthOverviewParams {
  templateId: string;
  /** 不传或 null 表示按模板全版本聚合 */
  templateVersionId?: string | null;
}

export interface AiReviewScoreCalibrationEntry {
  submissionId: number;
  dimensionKey: string;
  dimensionName?: string | null;
  rawScore: number;
  calibratedScore: number;
  anchor?: number | null;
  tolerance?: number | null;
  analyzedAt?: string | null;
}

export interface AiReviewScoreCalibrationSummary {
  totalReviewCount: number;
  calibratedReviewCount: number;
  calibrationEventCount: number;
  recentEntries: AiReviewScoreCalibrationEntry[];
}

export interface AiReviewPromptSuggestionSummary {
  id: number;
  templateId?: number | null;
  templateVersionId: number;
  taskId?: number | null;
  taskName?: string | null;
  status: AiReviewPromptSuggestionStatus;
  changeSummary: string;
  createdAt: string;
}

export interface AiReviewAbTestMetricComparison {
  metricKey: string;
  metricLabel?: string | null;
  baselineValue: number;
  candidateValue: number;
  delta?: number | null;
  passed?: boolean | null;
}

export interface AiReviewAbTestReport {
  testSampleCount?: number | null;
  trainSampleCount?: number | null;
  baselineTestAgreementRate?: number | null;
  candidateTestAgreementRate?: number | null;
  baselineTestAiStrictRate?: number | null;
  candidateTestAiStrictRate?: number | null;
  baselineTestAiLenientRate?: number | null;
  candidateTestAiLenientRate?: number | null;
  baselineTestStabilityMedianDev?: number | null;
  candidateTestStabilityMedianDev?: number | null;
  trainOverfitGap?: number | null;
  overallPassed?: boolean | null;
  comparisons?: AiReviewAbTestMetricComparison[] | null;
}

export interface AiReviewPromptSuggestionDetail extends AiReviewPromptSuggestionSummary {
  baselinePromptTemplate: string;
  candidatePromptTemplate: string;
  abTestReport: AiReviewAbTestReport;
  baselineMetrics?: AiReviewPromptHealthMetrics | null;
}

export interface AcceptPromptSuggestionResult {
  acceptedTemplateVersionId: number;
}

export interface DismissPromptSuggestionRequest {
  dismissReason: string;
}

export interface LatestHealthMetricsView {
  sampleCount: number;
  healthStatus: AiReviewHealthStatus;
  aiHumanAgreementRate: number;
  aiRejectAppealPassRate: number;
  aiPassHumanRejectRate: number;
  requireHumanRatio: number;
}

export interface AbTestTableRow {
  key: string;
  label: string;
  baselineValue: number;
  candidateValue: number;
  delta: number;
  passed?: boolean | null;
}

export const HEALTH_STATUS_META: Record<
  AiReviewHealthStatus,
  { label: string; tone: "success" | "warning" | "destructive" }
> = {
  HEALTHY: { label: "健康", tone: "success" },
  WARNING: { label: "预警", tone: "warning" },
  NEEDS_OPTIMIZATION: { label: "需优化", tone: "destructive" },
};

export const SUGGESTION_STATUS_META: Record<
  AiReviewPromptSuggestionStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  PENDING: { label: "待处理", variant: "default" },
  ACCEPTED: { label: "已采纳", variant: "secondary" },
  DISMISSED: { label: "已忽略", variant: "outline" },
  EXPIRED: { label: "已过期", variant: "destructive" },
};

const AB_TEST_ROW_LABELS: Record<string, string> = {
  test_agreement_rate: "测试集一致率",
  test_ai_strict_rate: "AI 过严率",
  test_ai_lenient_rate: "AI 过松率",
  test_stability_median_dev: "稳定性中位偏差",
  train_overfit_gap: "训练过拟合差距",
};

export function formatHealthRate(value?: number | null, digits = 1): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatCalibrationRate(summary?: AiReviewScoreCalibrationSummary | null): string {
  if (!summary || summary.totalReviewCount <= 0) {
    return "—";
  }
  const rate = summary.calibratedReviewCount / summary.totalReviewCount;
  return formatHealthRate(rate);
}

export function extractLatestHealthMetrics(
  overview: AiReviewPromptHealthOverview | null | undefined,
): LatestHealthMetricsView | null {
  const latest = overview?.latest;
  if (!latest?.metrics) {
    return null;
  }
  return {
    sampleCount: latest.sampleCount,
    healthStatus: latest.healthStatus,
    aiHumanAgreementRate: latest.metrics.aiHumanAgreementRate,
    aiRejectAppealPassRate: latest.metrics.aiRejectAppealPassRate,
    aiPassHumanRejectRate: latest.metrics.aiPassHumanRejectRate,
    requireHumanRatio: latest.metrics.requireHumanRatio,
  };
}

export function buildAbTestTableRows(report?: AiReviewAbTestReport | null): AbTestTableRow[] {
  if (!report) {
    return [];
  }

  if (report.comparisons?.length) {
    return report.comparisons.map((item) => ({
      key: item.metricKey,
      label: item.metricLabel?.trim() || AB_TEST_ROW_LABELS[item.metricKey] || item.metricKey,
      baselineValue: item.baselineValue,
      candidateValue: item.candidateValue,
      delta: item.delta ?? item.candidateValue - item.baselineValue,
      passed: item.passed,
    }));
  }

  const fallbackRows: Array<[string, number | null | undefined, number | null | undefined]> = [
    ["test_agreement_rate", report.baselineTestAgreementRate, report.candidateTestAgreementRate],
    ["test_ai_strict_rate", report.baselineTestAiStrictRate, report.candidateTestAiStrictRate],
    ["test_ai_lenient_rate", report.baselineTestAiLenientRate, report.candidateTestAiLenientRate],
    [
      "test_stability_median_dev",
      report.baselineTestStabilityMedianDev,
      report.candidateTestStabilityMedianDev,
    ],
    ["train_overfit_gap", null, report.trainOverfitGap],
  ];

  return fallbackRows
    .filter(([, baseline, candidate]) => baseline != null || candidate != null)
    .map(([key, baseline, candidate]) => {
      const baselineValue = baseline ?? 0;
      const candidateValue = candidate ?? 0;
      return {
        key,
        label: AB_TEST_ROW_LABELS[key] || key,
        baselineValue,
        candidateValue,
        delta: candidateValue - baselineValue,
      };
    });
}

type TemplateIdParam = string | number;

const inflightGetRequests = new Map<string, Promise<unknown>>();

async function dedupedGetRequest<T>(
  key: string,
  path: string,
  init: RequestInit = {},
  options: { notifyOnError?: boolean } = {},
): Promise<T> {
  const inflight = inflightGetRequests.get(key);
  if (inflight) {
    return inflight as Promise<T>;
  }
  const promise = request<T>(path, init, { notifyOnError: options.notifyOnError }).finally(() => {
    if (inflightGetRequests.get(key) === promise) {
      inflightGetRequests.delete(key);
    }
  });
  inflightGetRequests.set(key, promise);
  return promise;
}

function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") {
      continue;
    }
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

function mapCatalogItem(row: AiReviewHealthCatalogItemDto): AiReviewHealthCatalogItem | null {
  if (row.taskId == null || row.templateId == null) {
    return null;
  }
  return {
    taskId: String(row.taskId),
    taskTitle: String(row.taskTitle ?? row.taskCode ?? row.taskId),
    taskCode: row.taskCode != null ? String(row.taskCode) : undefined,
    templateId: String(row.templateId),
    templateName: String(row.templateName ?? row.templateCode ?? row.templateId),
    templateCode: row.templateCode != null ? String(row.templateCode) : undefined,
  };
}

export async function fetchAiReviewHealthCatalog(
  params: FetchAiReviewHealthCatalogParams = {},
  signal?: AbortSignal,
): Promise<AiReviewHealthCatalogPage> {
  const path = `/api/v1/owner/ai-review-health/catalog${buildQuery({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    keyword: params.keyword?.trim() || undefined,
    includeTemplateId: params.includeTemplateId ?? undefined,
  })}`;
  const page = await request<AiReviewHealthCatalogPageDto>(
    path,
    {},
    { notifyOnError: false, signal },
  );
  const list = (page.list ?? [])
    .map(mapCatalogItem)
    .filter((item): item is AiReviewHealthCatalogItem => item != null);
  return {
    total: page.total ?? list.length,
    page: page.page ?? params.page ?? 1,
    pageSize: page.pageSize ?? params.pageSize ?? 20,
    list,
  };
}

function buildHealthOverviewPath(params: FetchAiReviewHealthOverviewParams): string {
  return `/api/v1/owner/templates/${encodeURIComponent(String(params.templateId))}/ai-review-health${buildQuery({
    templateVersionId: params.templateVersionId ?? undefined,
  })}`;
}

function healthRequestKey(params: FetchAiReviewHealthOverviewParams): string {
  return `health:${params.templateId}:${params.templateVersionId ?? "all"}`;
}

export async function fetchAiReviewHealthOverview(
  params: FetchAiReviewHealthOverviewParams | TemplateIdParam,
  signal?: AbortSignal,
): Promise<AiReviewPromptHealthOverview> {
  const normalized: FetchAiReviewHealthOverviewParams =
    typeof params === "object" && params !== null && "templateId" in params
      ? params
      : { templateId: String(params) };
  const path = buildHealthOverviewPath(normalized);
  if (signal) {
    return request<AiReviewPromptHealthOverview>(path, {}, { notifyOnError: false, signal });
  }
  return dedupedGetRequest<AiReviewPromptHealthOverview>(
    healthRequestKey(normalized),
    path,
    {},
    { notifyOnError: false },
  );
}

export async function refreshAiReviewHealthOverview(
  params: FetchAiReviewHealthOverviewParams | TemplateIdParam,
  signal?: AbortSignal,
): Promise<AiReviewPromptHealthOverview> {
  const normalized: FetchAiReviewHealthOverviewParams =
    typeof params === "object" && params !== null && "templateId" in params
      ? params
      : { templateId: String(params) };
  const path = `/api/v1/owner/templates/${encodeURIComponent(String(normalized.templateId))}/ai-review-health/refresh${buildQuery({
    templateVersionId: normalized.templateVersionId ?? undefined,
  })}`;
  return request<AiReviewPromptHealthOverview>(path, { method: "POST" }, { signal });
}

export async function triggerPromptOptimization(
  templateId: TemplateIdParam,
  signal?: AbortSignal,
): Promise<void> {
  await request<void>(
    `/api/v1/owner/templates/${encodeURIComponent(String(templateId))}/ai-review-health/trigger-optimization`,
    { method: "POST" },
    { signal },
  );
}

export interface PromptOptimizationTaskStatus {
  taskId?: number | null;
  status?: string | null;
  lastErrorMessage?: string | null;
  finishedAt?: string | null;
  optimizationOutcome?: string | null;
  optimizationSummary?: string | null;
  notificationBody?: string | null;
}

const OPTIMIZATION_OUTCOME_LABELS: Record<string, string> = {
  SUGGESTION_CREATED: "已生成优化建议",
  SKIPPED_AB_TEST_FAILED: "A/B 验证未通过",
  SKIPPED_NO_TRAIN_CASES: "缺少训练样本",
  SKIPPED_EMPTY_PROMPT: "未配置预审 Prompt",
};

export function formatOptimizationOutcome(status: PromptOptimizationTaskStatus): string | null {
  const outcome = status.optimizationOutcome?.trim();
  if (!outcome) {
    return null;
  }
  return OPTIMIZATION_OUTCOME_LABELS[outcome] ?? outcome;
}

const TERMINAL_OPTIMIZATION_STATUSES = new Set([
  "SUCCESS",
  "FAILED",
  "DEAD_LETTER",
  "CANCELED",
]);

export function isTerminalOptimizationStatus(status?: string | null): boolean {
  return status != null && TERMINAL_OPTIMIZATION_STATUSES.has(status);
}

export async function fetchPromptOptimizationTaskStatus(
  templateId: TemplateIdParam,
  signal?: AbortSignal,
): Promise<PromptOptimizationTaskStatus> {
  return request<PromptOptimizationTaskStatus>(
    `/api/v1/owner/templates/${encodeURIComponent(String(templateId))}/ai-review-health/optimization-task`,
    {},
    { notifyOnError: false, signal },
  );
}

export async function fetchPromptSuggestions(
  params: { templateId?: TemplateIdParam | null } = {},
  signal?: AbortSignal,
): Promise<AiReviewPromptSuggestionSummary[]> {
  const path = `/api/v1/owner/ai-review-prompt-suggestions${buildQuery({ templateId: params.templateId ?? undefined })}`;
  if (signal) {
    return request<AiReviewPromptSuggestionSummary[]>(path, {}, { notifyOnError: false, signal });
  }
  const dedupeKey = `suggestions:${params.templateId ?? "all"}`;
  return dedupedGetRequest<AiReviewPromptSuggestionSummary[]>(dedupeKey, path, {}, { notifyOnError: false });
}

export async function fetchPromptSuggestionDetail(
  suggestionId: number,
  signal?: AbortSignal,
): Promise<AiReviewPromptSuggestionDetail> {
  return request<AiReviewPromptSuggestionDetail>(
    `/api/v1/owner/ai-review-prompt-suggestions/${encodeURIComponent(String(suggestionId))}`,
    {},
    { notifyOnError: false, signal },
  );
}

export async function acceptPromptSuggestion(
  suggestionId: number,
  signal?: AbortSignal,
): Promise<AcceptPromptSuggestionResult> {
  return request<AcceptPromptSuggestionResult>(
    `/api/v1/owner/ai-review-prompt-suggestions/${encodeURIComponent(String(suggestionId))}/accept`,
    { method: "POST" },
    { signal },
  );
}

export async function dismissPromptSuggestion(
  suggestionId: number,
  body: DismissPromptSuggestionRequest,
  signal?: AbortSignal,
): Promise<void> {
  await request<void>(
    `/api/v1/owner/ai-review-prompt-suggestions/${encodeURIComponent(String(suggestionId))}/dismiss`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    { signal },
  );
}
