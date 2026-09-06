import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  appealLabelerSubmission,
  fetchLabelerSubmissionHistory,
  fetchLabelerWork,
  fetchLabelerWorkSession,
  saveLabelerDraft,
  submitLabelerSubmission,
  withdrawLabelerSubmission,
} from "./labeler-work-api";

function envelope<T>(data: T) {
  return {
    code: "SUCCESS",
    message: "ok",
    data,
    traceId: "trace-1",
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("P0 白盒 — labeler-work-api", () => {
  beforeEach(() => {
    localStorage.setItem("labelhub.accessToken", "test-token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("WB-FE-LBL-001 / WB-SUB-006: fetchLabelerWork 请求正确端点", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        envelope({
          assignment: { id: 1, taskId: 10, itemId: 100, status: "CLAIMED" },
          submission: { id: 2, assignmentId: 1, currentStatus: "DRAFT" },
          task: { taskId: 10, taskName: "测试任务" },
          taskItem: { itemId: 100, payload: {} },
          templateVersion: { templateVersionId: 5, schemaJson: "{}" },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const work = await fetchLabelerWork(1);
    expect(work.assignment.id).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/labeler/assignments/1/work"),
      expect.any(Object),
    );
  });

  it("WB-FE-LBL-002: submitLabelerSubmission POST 正确 payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(envelope(null)));
    vi.stubGlobal("fetch", fetchMock);

    await submitLabelerSubmission(2, { label_text: "A", score: 95 });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/labeler/submissions/2/submit"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ finalSubmitData: { label_text: "A", score: 95 }, comment: null }),
      }),
    );
  });

  it("WB-FE-LBL-003 / WB-SUB-009: withdrawLabelerSubmission POST withdraw 端点", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(envelope(null)));
    vi.stubGlobal("fetch", fetchMock);

    await withdrawLabelerSubmission(2);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/labeler/submissions/2/withdraw"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("WB-FE-LBL-004 / WB-SUB-012: appealLabelerSubmission POST 申诉理由", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(envelope(null)));
    vi.stubGlobal("fetch", fetchMock);

    await appealLabelerSubmission(2, "请求重新审核");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/labeler/submissions/2/appeal"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ reasonText: "请求重新审核" }),
      }),
    );
  });

  it("WB-FE-LBL-005: saveLabelerDraft PUT draft 数据", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(envelope(null)));
    vi.stubGlobal("fetch", fetchMock);

    await saveLabelerDraft(2, { label_text: "draft" }, true);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/labeler/submissions/2/draft"),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ draftData: { label_text: "draft" }, autoSave: true }),
      }),
    );
  });

  it("WB-FE-LBL-006: fetchLabelerWorkSession 按 assignment 加载队列", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        envelope({
          queue: { items: [], total: 0, page: 1, pageSize: 20 },
          works: {},
          taskMeta: { taskId: 10, taskName: "T" },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchLabelerWorkSession({ assignmentId: "1", page: 1, pageSize: 20 });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/labeler/assignments/1/work-session"),
      expect.any(Object),
    );
  });

  it("WB-FE-LBL-012: fetchLabelerSubmissionHistory 加载时间线", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        envelope({
          id: 2,
          currentStatus: "SUBMITTED",
          lifecycleTimeline: [{ id: "1", label: "提交", occurredAt: "2026-01-01T00:00:00Z" }],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const history = await fetchLabelerSubmissionHistory(2);
    expect(history.lifecycleTimeline?.length).toBe(1);
  });
});
