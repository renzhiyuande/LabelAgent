import { request } from "@/utils/apiClient";
import type { PageResponse } from "@/types";

export interface ReviewerQueueRowResponse {
  submissionId: number;
  submissionCode: string;
  title: string;
  labelerName: string;
  submittedAt: string;
  submissionStatus: string;
  queueStatus: string;
  overallScore?: number | null;
  aiVerdict?: string | null;
  taskId?: number | null;
  taskName?: string | null;
  labelerId?: number | null;
  itemId?: number | null;
  itemSeqNo?: number | null;
  currentReviewLevel?: string | null;
  reviewStageLabel?: string | null;
}

export interface ReviewWorkflowLevelResponse {
  key: string;
  label: string;
  stageNo: number;
  isFinal: boolean;
  actions: string[];
}

export interface AuditPoolLevelCountResponse {
  levelKey: string;
  levelLabel: string;
  stageNo: number;
  isFinal: boolean;
  pendingCount: number;
}

export interface AuditPoolMetaResponse {
  levels: AuditPoolLevelCountResponse[];
}

export interface ReviewerAiReviewDimensionResponse {
  dimensionKey: string;
  dimensionName: string;
  score: number;
  maxScore?: number;
  weight?: number;
  verdict?: string;
  comment?: string;
}

export interface ReviewerAiReviewScoreCalibrationResponse {
  dimensionKey: string;
  dimensionName?: string;
  rawScore: number;
  calibratedScore: number;
  anchor?: number;
  tolerance?: number;
}

export interface ReviewerAiReviewSnapshotResponse {
  aiReviewId?: number;
  platformKey?: string;
  modelId?: string;
  verdict?: string;
  totalScore?: number;
  summary?: string;
  promptTemplate?: string;
  rawResponseText?: string;
  analyzedAt?: string;
  dimensions?: ReviewerAiReviewDimensionResponse[];
  scoreCalibrations?: ReviewerAiReviewScoreCalibrationResponse[];
}

export interface ReviewerTimelineEntryResponse {
  id: string;
  stage: string;
  label: string;
  detail?: string;
  timestamp: string;
  tone?: "default" | "success" | "warning" | "destructive";
}

export interface ReviewerReviewRecordResponse {
  id: number;
  reviewLevel: string;
  reviewLevelLabel: string;
  reviewStageNo?: number | null;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  commentText?: string | null;
  reviewerName: string;
  decidedAt: string;
  isFinalDecision: boolean;
  nextReviewLevel?: string | null;
}

export interface ReviewerSubmissionDetailResponse {
  submissionId: number;
  submissionCode: string;
  title: string;
  labelerName: string;
  submittedAt: string;
  submissionStatus: string;
  queueStatus: string;
  taskId: number;
  taskName: string;
  itemId: number;
  itemSeqNo?: number;
  itemPayload: Record<string, unknown>;
  templateVersionId: number;
  templateVersionNo?: number;
  templateSchemaJson: string;
  submitData: Record<string, unknown>;
  lastReviewComment?: string | null;
  lastReviewedAt?: string | null;
  lastReviewerName?: string | null;
  previousSubmitData?: Record<string, unknown> | null;
  submitDataDiff?: Array<{
    field: string;
    changeType: string;
    oldValue?: unknown;
    newValue?: unknown;
  }> | null;
  currentReviewLevel?: string | null;
  nextReviewLevel?: string | null;
  reviewStageNo?: number | null;
  reviewStageLabel?: string | null;
  isFinalReviewLevel?: boolean;
  reviewWorkflowLevels?: ReviewWorkflowLevelResponse[];
  aiReview?: ReviewerAiReviewSnapshotResponse | null;
  timeline?: ReviewerTimelineEntryResponse[];
}

export interface AiQueueStatsResponse {
  throughputPerSecond?: number | null;
  averageLatencySeconds?: number | null;
  duplicateRatePercent?: number | null;
  taskName?: string | null;
}

export interface AiQueueStatusCountsResponse {
  all: number;
  pending: number;
  passed: number;
  returned: number;
  manual: number;
  failed: number;
}

export type AiQueueAdvanceAction = "pass" | "reject" | "manual";

type CompatiblePageResponse<T> = Partial<PageResponse<T>> & {
  list?: T[];
  items?: T[];
};

function normalizePageResponse<T>(
  payload: CompatiblePageResponse<T>,
): PageResponse<T> {
  const items = Array.isArray(payload.items) ? payload.items : undefined;
  return {
    total: Number(payload.total ?? 0),
    page: Number(payload.page ?? 1),
    pageSize: Number(payload.pageSize ?? 0),
    list: Array.isArray(payload.list) ? payload.list : items ?? [],
  };
}

export async function fetchReviewerAiQueue(params?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
}): Promise<PageResponse<ReviewerQueueRowResponse>> {
  const search = new URLSearchParams();
  search.set("page", String(params?.page ?? 1));
  search.set("pageSize", String(params?.pageSize ?? 50));
  if (params?.keyword) {
    search.set("keyword", params.keyword);
  }
  if (params?.status && params.status !== "all") {
    search.set("status", params.status);
  }
  const payload = await request<PageResponse<ReviewerQueueRowResponse> | { items?: ReviewerQueueRowResponse[]; total?: number; page?: number; pageSize?: number }>(
    `/api/v1/reviewer/ai-queue?${search.toString()}`,
  );
  return normalizePageResponse(payload);
}

export async function fetchReviewerAiQueueDetail(
  submissionId: string | number,
): Promise<ReviewerSubmissionDetailResponse> {
  return request<ReviewerSubmissionDetailResponse>(
    `/api/v1/reviewer/ai-queue/${encodeURIComponent(String(submissionId))}`,
  );
}

export async function advanceReviewerAiQueue(
  submissionId: string | number,
  action: AiQueueAdvanceAction,
  commentText = "",
): Promise<ReviewerSubmissionDetailResponse> {
  return request<ReviewerSubmissionDetailResponse>(
    `/api/v1/reviewer/ai-queue/${encodeURIComponent(String(submissionId))}/advance`,
    {
      method: "POST",
      body: JSON.stringify({ action, commentText }),
    },
  );
}

export async function retryReviewerAiQueueReview(
  submissionId: string | number,
): Promise<ReviewerSubmissionDetailResponse> {
  return request<ReviewerSubmissionDetailResponse>(
    `/api/v1/reviewer/ai-queue/${encodeURIComponent(String(submissionId))}/retry-ai-review`,
    { method: "POST" },
  );
}

export async function fetchReviewerAiQueueStats(taskId?: number): Promise<AiQueueStatsResponse> {
  const search = new URLSearchParams();
  if (taskId != null) {
    search.set("taskId", String(taskId));
  }
  const query = search.toString();
  return request<AiQueueStatsResponse>(
    `/api/v1/reviewer/ai-queue/stats${query ? `?${query}` : ""}`,
  );
}

export interface AuditPoolGroupResponse {
  groupBy: string;
  scopeId: number;
  scopeLabel: string;
  scopeSubtitle?: string | null;
  submissionCount: number;
  lastActivityAt: string;
}

export type AuditPoolScopeType = "task" | "labeler" | "item";

export async function fetchReviewerAuditPoolGroups(params: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  groupBy: AuditPoolScopeType;
  reviewLevel?: string;
}): Promise<PageResponse<AuditPoolGroupResponse>> {
  const search = new URLSearchParams();
  search.set("page", String(params.page ?? 1));
  search.set("pageSize", String(params.pageSize ?? 20));
  search.set("groupBy", params.groupBy);
  if (params.keyword) {
    search.set("keyword", params.keyword);
  }
  if (params.reviewLevel) {
    search.set("reviewLevel", params.reviewLevel);
  }
  const payload = await request<PageResponse<AuditPoolGroupResponse> | { items?: AuditPoolGroupResponse[]; total?: number; page?: number; pageSize?: number }>(
    `/api/v1/reviewer/audit-pool/groups?${search.toString()}`,
  );
  return normalizePageResponse(payload);
}

export async function fetchReviewerAuditPoolMeta(params?: {
  taskId?: number | string;
}): Promise<AuditPoolMetaResponse> {
  const search = new URLSearchParams();
  if (params?.taskId != null) {
    search.set("taskId", String(params.taskId));
  }
  const query = search.toString();
  return request<AuditPoolMetaResponse>(`/api/v1/reviewer/audit-pool/meta${query ? `?${query}` : ""}`);
}

export async function fetchReviewerAuditPool(params: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  scopeType: AuditPoolScopeType;
  scopeIds: Array<string | number>;
  reviewLevel?: string;
}): Promise<PageResponse<ReviewerQueueRowResponse>> {
  const search = new URLSearchParams();
  search.set("page", String(params.page ?? 1));
  search.set("pageSize", String(params.pageSize ?? 50));
  search.set("scopeType", params.scopeType);
  search.set("scopeIds", params.scopeIds.map(String).join(","));
  if (params.keyword) {
    search.set("keyword", params.keyword);
  }
  if (params.reviewLevel) {
    search.set("reviewLevel", params.reviewLevel);
  }
  const payload = await request<PageResponse<ReviewerQueueRowResponse> | { items?: ReviewerQueueRowResponse[]; total?: number; page?: number; pageSize?: number }>(
    `/api/v1/reviewer/audit-pool?${search.toString()}`,
  );
  return normalizePageResponse(payload);
}

export async function fetchReviewerAuditPoolDetail(
  submissionId: string | number,
): Promise<ReviewerSubmissionDetailResponse> {
  return request<ReviewerSubmissionDetailResponse>(
    `/api/v1/reviewer/audit-pool/${encodeURIComponent(String(submissionId))}`,
  );
}

export async function fetchReviewerSubmissionReviewRecords(
  submissionId: string | number,
): Promise<ReviewerReviewRecordResponse[]> {
  return request<ReviewerReviewRecordResponse[]>(
    `/api/v1/reviewer/submissions/${encodeURIComponent(String(submissionId))}/review-records`,
  );
}

export interface ReviewerReviewRecordListRowResponse {
  id: number;
  submissionId: number;
  submissionCode: string;
  title: string;
  taskId: number;
  taskName: string;
  labelerId?: number | null;
  labelerName: string;
  reviewLevel: string;
  reviewLevelLabel: string;
  reviewStageNo?: number | null;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  commentText?: string | null;
  reviewerId?: number | null;
  reviewerName: string;
  decidedAt: string;
  isFinalDecision: boolean;
}

export async function fetchReviewerReviewRecords(params?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  taskId?: number | string;
  reviewLevel?: string;
  action?: string;
  from?: string;
  to?: string;
}): Promise<PageResponse<ReviewerReviewRecordListRowResponse>> {
  const search = new URLSearchParams();
  search.set("page", String(params?.page ?? 1));
  search.set("pageSize", String(params?.pageSize ?? 20));
  if (params?.keyword) {
    search.set("keyword", params.keyword);
  }
  if (params?.taskId != null) {
    search.set("taskId", String(params.taskId));
  }
  if (params?.reviewLevel) {
    search.set("reviewLevel", params.reviewLevel);
  }
  if (params?.action) {
    search.set("action", params.action);
  }
  if (params?.from) {
    search.set("from", params.from);
  }
  if (params?.to) {
    search.set("to", params.to);
  }
  const payload = await request<
    PageResponse<ReviewerReviewRecordListRowResponse> | { items?: ReviewerReviewRecordListRowResponse[]; total?: number; page?: number; pageSize?: number }
  >(`/api/v1/reviewer/review-records?${search.toString()}`);
  return normalizePageResponse(payload);
}

export async function decideReviewerAuditPool(
  submissionId: string | number,
  action: "approve" | "reject" | "return",
  commentText: string,
): Promise<ReviewerSubmissionDetailResponse> {
  const path =
    action === "approve"
      ? "approve"
      : action === "reject"
        ? "reject"
        : "return";
  return request<ReviewerSubmissionDetailResponse>(
    `/api/v1/reviewer/audit-pool/${encodeURIComponent(String(submissionId))}/${path}`,
    {
      method: "POST",
      body: JSON.stringify({ commentText }),
    },
  );
}

export interface ReviewerBatchSubmitResultResponse {
  batchKey: string;
  targetTotal: number;
  status: string;
}

export interface ReviewBatchOperationResponse {
  id: number;
  batchKey: string;
  batchAction: string;
  targetTotalCount: number;
  successCount: number;
  failedCount: number;
  status: string;
  createdAt: string;
  finishedAt?: string | null;
}

export async function submitReviewerBatchDecision(params: {
  action: "approve" | "reject" | "return";
  submissionIds: Array<string | number>;
  commentText: string;
  reviewLevel: string;
}): Promise<ReviewerBatchSubmitResultResponse> {
  return request<ReviewerBatchSubmitResultResponse>("/api/v1/reviewer/audit-pool/batch", {
    method: "POST",
    body: JSON.stringify({
      action: params.action,
      submissionIds: params.submissionIds.map((id) => Number(id)),
      commentText: params.commentText,
      reviewLevel: params.reviewLevel,
    }),
  });
}

export async function fetchReviewerBatchOperation(batchKey: string): Promise<ReviewBatchOperationResponse> {
  return request<ReviewBatchOperationResponse>(
    `/api/v1/reviewer/batch-operations/${encodeURIComponent(batchKey)}`,
  );
}

export async function fetchReviewerAiQueueStatusCounts(): Promise<Record<string, number>> {
  const counts = await request<AiQueueStatusCountsResponse>("/api/v1/reviewer/ai-queue/status-counts");
  return {
    all: counts.all,
    pending: counts.pending,
    passed: counts.passed,
    returned: counts.returned,
    manual: counts.manual,
    failed: counts.failed,
  };
}
