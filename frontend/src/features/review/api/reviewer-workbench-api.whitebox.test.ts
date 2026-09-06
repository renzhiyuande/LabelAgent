import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchReviewerAiQueue,
  fetchReviewerAuditPool,
  fetchReviewerAuditPoolDetail,
  retryReviewerAiQueueReview,
  submitReviewerBatchDecision,
} from "./reviewer-workbench-api";

function envelope<T>(data: T) {
  return {
    code: "SUCCESS",
    message: "ok",
    data,
    traceId: "trace-rev-1",
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("P0 白盒 — reviewer-workbench-api", () => {
  beforeEach(() => {
    localStorage.setItem("labelhub.accessToken", "reviewer-token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("WB-FE-REV-003 / WB-REV-005: fetchReviewerAiQueue 解析 AI 队列", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        envelope({
          items: [
            {
              submissionId: 101,
              submissionCode: "S-101",
              title: "样本",
              labelerName: "标注员",
              submittedAt: "2026-01-01T00:00:00Z",
              submissionStatus: "AI_REVIEWING",
              queueStatus: "pending",
            },
          ],
          total: 1,
          page: 1,
          pageSize: 20,
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const page = await fetchReviewerAiQueue({ page: 1, pageSize: 20 });
    expect(page.list[0]?.submissionId).toBe(101);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/reviewer/ai-queue"),
      expect.any(Object),
    );
  });

  it("WB-FE-REV-005 / WB-REV-010: submitReviewerBatchDecision 批量审核", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        envelope({
          batchKey: "batch-1",
          acceptedCount: 2,
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await submitReviewerBatchDecision({
      submissionIds: [101, 102],
      action: "approve",
      commentText: "批量通过",
      reviewLevel: "L1",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/reviewer/audit-pool/batch"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("101"),
      }),
    );
  });

  it("WB-FE-REV-006: fetchReviewerAuditPool 带 scope 筛选", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(envelope({ items: [], total: 0, page: 1, pageSize: 50 })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchReviewerAuditPool({
      scopeType: "task",
      scopeIds: [10],
      reviewLevel: "L1",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/audit-pool\?.*scopeType=task.*scopeIds=10.*reviewLevel=L1/),
      expect.any(Object),
    );
  });

  it("WB-FE-REV-007 / WB-REV-006: fetchReviewerAuditPoolDetail 加载审核详情", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        envelope({
          submissionId: 101,
          submissionStatus: "HUMAN_REVIEWING",
          workflowLevels: [{ key: "L1", label: "初审", stageNo: 1, isFinal: false, actions: ["approve"] }],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const detail = await fetchReviewerAuditPoolDetail(101);
    expect(detail.submissionId).toBe(101);
  });

  it("WB-FE-REV-009 / WB-REV-013: retryAiQueueReview 触发 AI 重试", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(envelope({ submissionId: 101 })));
    vi.stubGlobal("fetch", fetchMock);

    await retryReviewerAiQueueReview(101);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/reviewer/ai-queue/101/retry-ai-review"),
      expect.objectContaining({ method: "POST" }),
    );
  });
});
