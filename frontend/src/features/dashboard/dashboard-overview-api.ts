import { request } from "@/utils/apiClient";

interface PlatformStatsOverview {
  totalTasks: number;
  publishedTasks: number;
  draftTasks: number;
  archivedTasks: number;
  totalSubmissions: number;
  approvedSubmissions: number;
  pendingReviewCount: number;
  totalUsers: number;
}

export interface AiReviewObservabilityDashboardSummary {
  queuePending: number;
  queueRunning: number;
  reviewsLastHour: number;
  reviewsLast24Hours: number;
  failedLast24Hours: number;
  failureRateLast24Hours: number;
  avgLatencyMsLast24Hours: number;
  totalTokensLast24Hours: number;
  attentionCount: number;
}

export interface AdminDashboardOverview {
  platform: PlatformStatsOverview;
  aiTaskTotal: number;
  aiTaskSuccess: number;
  aiTaskFailed: number;
  aiTaskRunning: number;
  reviewerManualCount: number;
  aiObservability?: AiReviewObservabilityDashboardSummary | null;
}

export interface AdminDashboardUserGrowthPoint {
  statDate: string;
  newUserCount: number;
  cumulativeUserCount: number;
}

export interface AdminDashboardTaskStatusBucket {
  status: string;
  count: number;
}

export interface AdminDashboardSubmissionFunnelBucket {
  stage: string;
  count: number;
}

export interface AdminDashboardRoleShareBucket {
  roleCode: string;
  roleName: string;
  userCount: number;
}

export interface AdminDashboardAnalytics {
  approvalRate: number;
  userGrowthTrend: AdminDashboardUserGrowthPoint[];
  taskStatusDistribution: AdminDashboardTaskStatusBucket[];
  submissionFunnel: AdminDashboardSubmissionFunnelBucket[];
  roleDistribution: AdminDashboardRoleShareBucket[];
}

export interface OwnerDashboardOverview {
  submissionTotal: number;
  reviewInFlight: number;
  approvedTotal: number;
  acceptanceOpen: number;
  exportOpen: number;
  settlementOpen: number;
  aiObservability?: AiReviewObservabilityDashboardSummary | null;
}

export interface OwnerDashboardTrendPoint {
  statDate: string;
  submittedCount: number;
  approvedCount: number;
  needsRevisionCount: number;
  avgAiScore: number;
}

export interface OwnerDashboardStatusBucket {
  status: string;
  count: number;
}

export interface OwnerDashboardLabelerEfficiency {
  userId: number;
  labelerName: string;
  submitCount: number;
  qualityScore: number;
}

export interface OwnerDashboardAnalytics {
  taskCount: number;
  activeLabelerCount: number;
  approvalRate: number;
  avgAiScore: number;
  submissionTrend: OwnerDashboardTrendPoint[];
  statusDistribution: OwnerDashboardStatusBucket[];
  labelerEfficiency: OwnerDashboardLabelerEfficiency[];
}

export interface LabelerDashboardOverview {
  taskCount: number;
  openCount: number;
  pendingReviewCount: number;
  submittedEverCount: number;
  approvedCount: number;
  needsRevisionCount: number;
  draftCount: number;
  rewardCount: number;
  paidRewardCount: number;
  rewardAmountTotal: number;
}

export interface LabelerDashboardTrendPoint {
  statDate: string;
  submittedCount: number;
  approvedCount: number;
  needsRevisionCount: number;
  qualityScore: number;
  platformQualityBaseline: number;
}

export interface LabelerDashboardResultBucket {
  status: string;
  count: number;
}

export interface LabelerDashboardTaskParticipation {
  taskId: number;
  taskName: string;
  openCount: number;
  submittedEverCount: number;
  approvedCount: number;
  needsRevisionCount: number;
  deadlineAt: string | null;
}

export interface LabelerDashboardAnalytics {
  todaySubmittedCount: number;
  activeTaskCount: number;
  avgQualityScore: number;
  rewardAmountTotal: number;
  submissionTrend: LabelerDashboardTrendPoint[];
  resultDistribution: LabelerDashboardResultBucket[];
  taskParticipation: LabelerDashboardTaskParticipation[];
}

export interface ReviewerDashboardOverview {
  queueTotal: number;
  pendingCount: number;
  manualCount: number;
  failedCount: number;
  auditPoolPendingCount: number;
  reviewRecordTotal: number;
}

export interface ReviewerDashboardTrendPoint {
  statDate: string;
  approvedCount: number;
  rejectedCount: number;
  returnedCount: number;
  avgReviewLatencyMinutes: number;
}

export interface ReviewerDashboardDecisionBucket {
  decision: string;
  count: number;
}

export interface ReviewerDashboardComparisonBucket {
  scopeLabel: string;
  personalCount: number;
  teamAverageCount: number;
}

export interface ReviewerDashboardAnalytics {
  todayReviewedCount: number;
  approvalRate: number;
  avgReviewLatencyMinutes: number;
  reviewTrend: ReviewerDashboardTrendPoint[];
  decisionDistribution: ReviewerDashboardDecisionBucket[];
  personalVsTeam: ReviewerDashboardComparisonBucket[];
}

export async function fetchAdminDashboardOverview(signal?: AbortSignal): Promise<AdminDashboardOverview> {
  return request<AdminDashboardOverview>("/api/v1/dashboard/admin", {}, { notifyOnError: false, signal });
}

export async function fetchAdminDashboardAnalytics(signal?: AbortSignal): Promise<AdminDashboardAnalytics> {
  return request<AdminDashboardAnalytics>("/api/v1/dashboard/admin/analytics", {}, { notifyOnError: false, signal });
}

export async function fetchOwnerDashboardOverview(signal?: AbortSignal): Promise<OwnerDashboardOverview> {
  return request<OwnerDashboardOverview>("/api/v1/dashboard/owner", {}, { notifyOnError: false, signal });
}

export async function fetchOwnerDashboardAnalytics(signal?: AbortSignal): Promise<OwnerDashboardAnalytics> {
  return request<OwnerDashboardAnalytics>("/api/v1/dashboard/owner/analytics", {}, { notifyOnError: false, signal });
}

export async function fetchLabelerDashboardOverview(signal?: AbortSignal): Promise<LabelerDashboardOverview> {
  return request<LabelerDashboardOverview>("/api/v1/dashboard/labeler", {}, { notifyOnError: false, signal });
}

export async function fetchLabelerDashboardAnalytics(signal?: AbortSignal): Promise<LabelerDashboardAnalytics> {
  return request<LabelerDashboardAnalytics>("/api/v1/dashboard/labeler/analytics", {}, { notifyOnError: false, signal });
}

export async function fetchReviewerDashboardOverview(signal?: AbortSignal): Promise<ReviewerDashboardOverview> {
  return request<ReviewerDashboardOverview>("/api/v1/dashboard/reviewer", {}, { notifyOnError: false, signal });
}

export async function fetchReviewerDashboardAnalytics(signal?: AbortSignal): Promise<ReviewerDashboardAnalytics> {
  return request<ReviewerDashboardAnalytics>("/api/v1/dashboard/reviewer/analytics", {}, { notifyOnError: false, signal });
}
