import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchAdminDashboardAnalytics,
  fetchAdminDashboardOverview,
  fetchLabelerDashboardAnalytics,
  fetchLabelerDashboardOverview,
  fetchOwnerDashboardAnalytics,
  fetchOwnerDashboardOverview,
  fetchReviewerDashboardAnalytics,
  fetchReviewerDashboardOverview,
} from "./dashboard-overview-api";

function envelope<T>(data: T) {
  return {
    code: "SUCCESS",
    message: "ok",
    data,
    traceId: "trace-dashboard-1",
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("P1 白盒 — dashboard-overview-api", () => {
  beforeEach(() => {
    localStorage.setItem("labelhub.accessToken", "dashboard-token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("fetchAdminDashboardOverview 请求专用 admin 聚合接口", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        envelope({
          platform: {
            totalTasks: 1,
            publishedTasks: 1,
            draftTasks: 0,
            archivedTasks: 0,
            totalSubmissions: 2,
            approvedSubmissions: 1,
            pendingReviewCount: 1,
            totalUsers: 3,
          },
          aiTaskTotal: 4,
          aiTaskSuccess: 2,
          aiTaskFailed: 1,
          aiTaskRunning: 1,
          reviewerManualCount: 0,
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAdminDashboardOverview();

    expect(result.aiTaskTotal).toBe(4);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/dashboard/admin"),
      expect.any(Object),
    );
  });

  it("fetchAdminDashboardAnalytics 请求专用 admin analytics 聚合接口", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        envelope({
          approvalRate: 66.7,
          userGrowthTrend: [{ statDate: "2026-06-08", newUserCount: 2, cumulativeUserCount: 10 }],
          taskStatusDistribution: [{ status: "已发布", count: 4 }],
          submissionFunnel: [{ stage: "提交总量", count: 9 }],
          roleDistribution: [{ roleCode: "REVIEWER", roleName: "审核员", userCount: 3 }],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAdminDashboardAnalytics();

    expect(result.approvalRate).toBe(66.7);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/dashboard/admin/analytics"),
      expect.any(Object),
    );
  });

  it("fetchOwnerDashboardOverview 请求专用 owner 聚合接口", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        envelope({
          submissionTotal: 8,
          reviewInFlight: 2,
          approvedTotal: 3,
          acceptanceOpen: 1,
          exportOpen: 1,
          settlementOpen: 1,
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchOwnerDashboardOverview();

    expect(result.reviewInFlight).toBe(2);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/dashboard/owner"),
      expect.any(Object),
    );
  });

  it("fetchOwnerDashboardAnalytics 请求专用 owner analytics 聚合接口", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        envelope({
          taskCount: 3,
          activeLabelerCount: 5,
          approvalRate: 75.5,
          avgAiScore: 92.4,
          submissionTrend: [
            { statDate: "2026-06-02", submittedCount: 4, approvedCount: 3, needsRevisionCount: 1, avgAiScore: 91.2 },
          ],
          statusDistribution: [{ status: "待审核", count: 2 }],
          labelerEfficiency: [{ userId: 7, labelerName: "Alice", submitCount: 8, qualityScore: 96.5 }],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchOwnerDashboardAnalytics();

    expect(result.avgAiScore).toBe(92.4);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/dashboard/owner/analytics"),
      expect.any(Object),
    );
  });

  it("fetchLabelerDashboardOverview 请求专用 labeler 聚合接口", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        envelope({
          taskCount: 5,
          openCount: 3,
          pendingReviewCount: 1,
          submittedEverCount: 4,
          approvedCount: 2,
          needsRevisionCount: 1,
          draftCount: 2,
          rewardCount: 6,
          paidRewardCount: 1,
          rewardAmountTotal: 88.5,
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchLabelerDashboardOverview();

    expect(result.rewardAmountTotal).toBe(88.5);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/dashboard/labeler"),
      expect.any(Object),
    );
  });

  it("fetchLabelerDashboardAnalytics 请求专用 labeler analytics 聚合接口", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        envelope({
          todaySubmittedCount: 2,
          activeTaskCount: 3,
          avgQualityScore: 91.4,
          rewardAmountTotal: 66.5,
          submissionTrend: [
            {
              statDate: "2026-06-08",
              submittedCount: 2,
              approvedCount: 1,
              needsRevisionCount: 1,
              qualityScore: 93.2,
              platformQualityBaseline: 90.5,
            },
          ],
          resultDistribution: [{ status: "已通过", count: 2 }],
          taskParticipation: [{ taskId: 11, taskName: "图像分类", openCount: 1, submittedEverCount: 4, approvedCount: 2, needsRevisionCount: 1, deadlineAt: null }],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchLabelerDashboardAnalytics();

    expect(result.avgQualityScore).toBe(91.4);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/dashboard/labeler/analytics"),
      expect.any(Object),
    );
  });

  it("fetchReviewerDashboardOverview 请求专用 reviewer 聚合接口", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        envelope({
          queueTotal: 11,
          pendingCount: 4,
          manualCount: 2,
          failedCount: 1,
          auditPoolPendingCount: 5,
          reviewRecordTotal: 7,
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchReviewerDashboardOverview();

    expect(result.auditPoolPendingCount).toBe(5);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/dashboard/reviewer"),
      expect.any(Object),
    );
  });

  it("fetchReviewerDashboardAnalytics 请求专用 reviewer analytics 聚合接口", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        envelope({
          todayReviewedCount: 3,
          approvalRate: 75,
          avgReviewLatencyMinutes: 16.5,
          reviewTrend: [{ statDate: "2026-06-08", approvedCount: 2, rejectedCount: 1, returnedCount: 0, avgReviewLatencyMinutes: 15.2 }],
          decisionDistribution: [{ decision: "通过", count: 5 }],
          personalVsTeam: [{ scopeLabel: "近 7 天", personalCount: 7, teamAverageCount: 5.5 }],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchReviewerDashboardAnalytics();

    expect(result.avgReviewLatencyMinutes).toBe(16.5);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/dashboard/reviewer/analytics"),
      expect.any(Object),
    );
  });
});
