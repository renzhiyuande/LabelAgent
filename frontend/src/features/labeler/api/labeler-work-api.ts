import { request } from "@/utils/apiClient";
import type { PageResponse } from "@/types";
import type { FormSchema } from "@/low-code/schema/types";
import type { AiReviewSummary as LabelerAiReviewSummary } from "@/features/business/owner-ai-review-shared";
export type { AiReviewSummary as LabelerAiReviewSummary } from "@/features/business/owner-ai-review-shared";

export interface LabelerWorkDetailResponse {
  assignment: {
    id: number;
    taskId: number;
    itemId: number;
    status: string;
    deadlineAt?: string;
  };
  submission: {
    id: number;
    assignmentId: number;
    currentStatus: string;
    draftData?: Record<string, unknown>;
    draftSavedAt?: string;
    canWithdraw?: boolean;
    canAppeal?: boolean;
  };
  task: {
    taskId: number;
    taskName: string;
    sceneCode?: string;
    descriptionText?: string;
  };
  taskItem: {
    itemId: number;
    seqNo?: number;
    payload: Record<string, unknown>;
  };
  templateVersion: {
    templateVersionId: number;
    versionNo?: number;
    schemaJson: string;
  };
  lastReview?: {
    comment?: string;
    reviewedAt?: string;
    reviewerName?: string;
  } | null;
}

export interface LabelerMyTaskRow {
  taskId: number;
  taskCode?: string | null;
  taskName?: string | null;
  sceneCode?: string | null;
  descriptionText?: string | null;
  totalCount?: number;
  openCount?: number;
  submittedCount?: number;
  submittedEverCount?: number;
  approvedCount?: number;
  rejectedCount?: number;
  needsRevisionCount?: number;
  nextAssignmentId?: number | null;
  lastClaimedAt?: string | null;
  lastActivityAt?: string | null;
  deadlineAt?: string | null;
}

export async function fetchLabelerMyTasks(params?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
}): Promise<PageResponse<LabelerMyTaskRow>> {
  const search = new URLSearchParams();
  search.set("page", String(params?.page ?? 1));
  search.set("pageSize", String(params?.pageSize ?? 20));
  if (params?.keyword) {
    search.set("keyword", params.keyword);
  }
  return request<PageResponse<LabelerMyTaskRow>>(`/api/v1/labeler/my-tasks?${search.toString()}`);
}

export interface LabelerMyWorkRow {
  assignmentId: number;
  submissionId?: number | null;
  taskId: number;
  taskName?: string | null;
  sceneCode?: string | null;
  itemId: number;
  seqNo?: number | null;
  assignmentStatus: string;
  submissionStatus?: string | null;
  claimedAt?: string | null;
  draftSavedAt?: string | null;
  lastSubmittedAt?: string | null;
  deadlineAt?: string | null;
}

export async function fetchLabelerMyWorks(params?: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  taskId?: number;
}): Promise<PageResponse<LabelerMyWorkRow>> {
  const search = new URLSearchParams();
  search.set("page", String(params?.page ?? 1));
  search.set("pageSize", String(params?.pageSize ?? 50));
  if (params?.keyword) {
    search.set("keyword", params.keyword);
  }
  if (params?.taskId != null) {
    search.set("taskId", String(params.taskId));
  }
  return request<PageResponse<LabelerMyWorkRow>>(`/api/v1/labeler/my-works?${search.toString()}`);
}

export async function fetchLabelerWork(assignmentId: string | number): Promise<LabelerWorkDetailResponse> {
  return request<LabelerWorkDetailResponse>(`/api/v1/labeler/assignments/${encodeURIComponent(String(assignmentId))}/work`);
}

export interface LabelerWorkSessionTaskMeta {
  taskId: number;
  taskName: string;
  sceneCode?: string;
  descriptionText?: string;
  maxClaimPerUser?: number;
  templateVersionId?: number;
  templateVersionNo?: number;
}

export interface LabelerWorkSessionResponse {
  queue: PageResponse<LabelerMyWorkRow>;
  works: Record<string, LabelerWorkDetailResponse>;
  taskMeta: LabelerWorkSessionTaskMeta;
}

export async function fetchLabelerWorkSession(params: {
  assignmentId: string;
  taskId?: number;
  page?: number;
  pageSize?: number;
}): Promise<LabelerWorkSessionResponse> {
  const search = new URLSearchParams();
  search.set("page", String(params.page ?? 1));
  search.set("pageSize", String(params.pageSize ?? 20));

  if (params.taskId != null) {
    search.set("assignmentId", params.assignmentId);
    return request<LabelerWorkSessionResponse>(
      `/api/v1/labeler/tasks/${params.taskId}/work-session?${search.toString()}`,
    );
  }

  return request<LabelerWorkSessionResponse>(
    `/api/v1/labeler/assignments/${encodeURIComponent(params.assignmentId)}/work-session?${search.toString()}`,
  );
}

export async function saveLabelerDraft(
  submissionId: string | number,
  draftData: Record<string, unknown>,
  autoSave = true,
): Promise<void> {
  await request(`/api/v1/labeler/submissions/${encodeURIComponent(String(submissionId))}/draft`, {
    method: "PUT",
    body: JSON.stringify({ draftData, autoSave }),
  });
}

export async function submitLabelerSubmission(
  submissionId: string | number,
  finalSubmitData: Record<string, unknown>,
): Promise<void> {
  await request(`/api/v1/labeler/submissions/${encodeURIComponent(String(submissionId))}/submit`, {
    method: "POST",
    body: JSON.stringify({ finalSubmitData, comment: null }),
  });
}

export async function withdrawLabelerSubmission(submissionId: string | number): Promise<void> {
  await request(`/api/v1/labeler/submissions/${encodeURIComponent(String(submissionId))}/withdraw`, {
    method: "POST",
  });
}

export async function fetchLabelerAiReview(submissionId: string | number): Promise<LabelerAiReviewSummary | null> {
  const res = await request<LabelerAiReviewSummary | null>(
    `/api/v1/labeler/submissions/${encodeURIComponent(String(submissionId))}/ai-review`,
  );
  return res;
}

export async function appealLabelerSubmission(
  submissionId: string | number,
  reasonText: string,
): Promise<void> {
  await request(`/api/v1/labeler/submissions/${encodeURIComponent(String(submissionId))}/appeal`, {
    method: "POST",
    body: JSON.stringify({ reasonText }),
  });
}

export interface LabelerSubmissionTimelineEntry {
  id: string;
  category?: string;
  stage?: string;
  label: string;
  detail?: string;
  occurredAt?: string;
  tone?: "default" | "success" | "warning" | "destructive";
}

export interface LabelerSubmissionHistoryResponse {
  id: number;
  currentStatus: string;
  submitCount?: number;
  lastSubmittedAt?: string;
  lifecycleTimeline?: LabelerSubmissionTimelineEntry[];
  submitHistory?: LabelerSubmissionTimelineEntry[];
}

export async function fetchLabelerSubmissionHistory(
  submissionId: string | number,
): Promise<LabelerSubmissionHistoryResponse> {
  return request<LabelerSubmissionHistoryResponse>(
    `/api/v1/labeler/submissions/history/${encodeURIComponent(String(submissionId))}`,
  );
}

export type { FormSchema };
