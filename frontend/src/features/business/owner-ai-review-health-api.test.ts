import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildAbTestTableRows,
  extractLatestHealthMetrics,
  fetchAiReviewHealthCatalog,
  fetchAiReviewHealthOverview,
  fetchPromptSuggestionDetail,
  fetchPromptSuggestions,
  formatCalibrationRate,
  formatHealthRate,
  refreshAiReviewHealthOverview,
  triggerPromptOptimization,
} from "./owner-ai-review-health-api";

function envelope<T>(data: T) {
  return {
    code: "SUCCESS",
    message: "ok",
    data,
    traceId: "trace-ai-review-health-1",
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("owner-ai-review-health-api", () => {
  beforeEach(() => {
    localStorage.setItem("labelhub.accessToken", "owner-health-token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("fetchAiReviewHealthOverview 保留雪花 templateId 字符串精度", async () => {
    const snowflakeTemplateId = "2064211876241899500";
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        envelope({
          templateId: snowflakeTemplateId,
          latest: null,
          trendLast7Days: [],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchAiReviewHealthOverview(snowflakeTemplateId);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/api/v1/owner/templates/${snowflakeTemplateId}/ai-review-health`),
      expect.any(Object),
    );
  });

  it("fetchAiReviewHealthOverview 合并短时间内的重复 GET 请求", async () => {
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          setTimeout(
            () =>
              resolve(
                jsonResponse(
                  envelope({
                    templateId: 12,
                    latest: null,
                    trendLast7Days: [],
                  }),
                ),
              ),
            10,
          );
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await Promise.all([fetchAiReviewHealthOverview("12"), fetchAiReviewHealthOverview("12")]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fetchAiReviewHealthOverview 请求模板健康度接口", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        envelope({
          templateId: 12,
          templateVersionId: 34,
          latest: {
            metricDate: "2026-06-08",
            windowDays: 30,
            sampleCount: 42,
            metrics: {
              aiHumanAgreementRate: 0.82,
              aiRejectAppealPassRate: 0.12,
              aiPassHumanRejectRate: 0.08,
              requireHumanRatio: 0.05,
            },
            healthStatus: "HEALTHY",
          },
          trendLast7Days: [],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAiReviewHealthOverview({ templateId: "12" });

    expect(result.templateId).toBe(12);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/owner/templates/12/ai-review-health"),
      expect.any(Object),
    );
  });

  it("fetchAiReviewHealthOverview 支持 templateVersionId 查询参数", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        envelope({
          templateId: 12,
          aggregationScope: {
            mode: "VERSION",
            templateVersionId: 99,
            versionCount: 1,
            label: "v2 · 演示模板",
          },
          trendLast7Days: [],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchAiReviewHealthOverview({ templateId: "12", templateVersionId: "99" });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("templateVersionId=99"),
      expect.any(Object),
    );
  });

  it("fetchPromptSuggestions 支持 templateId 查询参数", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        envelope([
          {
            id: 9,
            templateVersionId: 34,
            status: "PENDING",
            changeSummary: "放宽次要差异驳回条件",
            createdAt: "2026-06-08T10:00:00Z",
          },
        ]),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchPromptSuggestions({ templateId: 12 });

    expect(result).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/owner/ai-review-prompt-suggestions?templateId=12"),
      expect.any(Object),
    );
  });

  it("fetchPromptSuggestionDetail 请求建议详情接口", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        envelope({
          id: 9,
          templateVersionId: 34,
          status: "PENDING",
          changeSummary: "放宽次要差异驳回条件",
          createdAt: "2026-06-08T10:00:00Z",
          baselinePromptTemplate: "baseline",
          candidatePromptTemplate: "candidate",
          abTestReport: { overallPassed: true, comparisons: [] },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchPromptSuggestionDetail(9);

    expect(result.baselinePromptTemplate).toBe("baseline");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/owner/ai-review-prompt-suggestions/9"),
      expect.any(Object),
    );
  });

  it("extractLatestHealthMetrics 扁平化 latest 指标", () => {
    const view = extractLatestHealthMetrics({
      templateId: 1,
      latest: {
        metricDate: "2026-06-08",
        windowDays: 30,
        sampleCount: 50,
        metrics: {
          aiHumanAgreementRate: 0.71,
          aiRejectAppealPassRate: 0.42,
          aiPassHumanRejectRate: 0.18,
          requireHumanRatio: 0.09,
        },
        healthStatus: "NEEDS_OPTIMIZATION",
      },
      trendLast7Days: [],
    });

    expect(view).toEqual({
      sampleCount: 50,
      healthStatus: "NEEDS_OPTIMIZATION",
      aiHumanAgreementRate: 0.71,
      aiRejectAppealPassRate: 0.42,
      aiPassHumanRejectRate: 0.18,
      requireHumanRatio: 0.09,
    });
  });

  it("buildAbTestTableRows 优先使用 comparisons 数组", () => {
    const rows = buildAbTestTableRows({
      comparisons: [
        {
          metricKey: "test_agreement_rate",
          metricLabel: "测试集一致率",
          baselineValue: 0.7,
          candidateValue: 0.78,
          delta: 0.08,
          passed: true,
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      key: "test_agreement_rate",
      label: "测试集一致率",
      baselineValue: 0.7,
      candidateValue: 0.78,
      delta: 0.08,
      passed: true,
    });
  });

  it("buildAbTestTableRows 回退到扁平字段", () => {
    const rows = buildAbTestTableRows({
      baselineTestAgreementRate: 0.65,
      candidateTestAgreementRate: 0.72,
      trainOverfitGap: 0.04,
    });

    expect(rows.some((row) => row.key === "test_agreement_rate")).toBe(true);
    expect(rows.some((row) => row.key === "train_overfit_gap")).toBe(true);
  });

  it("formatHealthRate 格式化百分比", () => {
    expect(formatHealthRate(0.823)).toBe("82.3%");
    expect(formatHealthRate(null)).toBe("—");
  });

  it("formatCalibrationRate 计算校准占比", () => {
    expect(
      formatCalibrationRate({
        totalReviewCount: 10,
        calibratedReviewCount: 2,
        calibrationEventCount: 3,
        recentEntries: [],
      }),
    ).toBe("20.0%");
    expect(formatCalibrationRate(null)).toBe("—");
  });

  it("fetchAiReviewHealthCatalog 请求远程分页目录接口", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        envelope({
          total: 1,
          page: 1,
          pageSize: 20,
          list: [
            {
              taskId: "101",
              taskTitle: "任务一",
              taskCode: "TASK-001",
              templateId: "2064211876241899500",
              templateName: "模板 A",
              templateCode: "tpl-a",
            },
          ],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAiReviewHealthCatalog({
      page: 1,
      pageSize: 20,
      keyword: "任务",
      includeTemplateId: "2064211876241899500",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(
        /\/api\/v1\/owner\/ai-review-health\/catalog\?.*page=1.*pageSize=20.*keyword=%E4%BB%BB%E5%8A%A1.*includeTemplateId=2064211876241899500/,
      ),
      expect.any(Object),
    );
    expect(result.total).toBe(1);
    expect(result.list[0]?.templateId).toBe("2064211876241899500");
  });

  it("refreshAiReviewHealthOverview 调用 POST refresh 接口", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        envelope({
          templateId: 12,
          templateVersionId: 34,
          latest: null,
          trendLast7Days: [],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await refreshAiReviewHealthOverview(12);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/owner/templates/12/ai-review-health/refresh"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("triggerPromptOptimization 调用 POST trigger-optimization 接口", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(envelope(null)));
    vi.stubGlobal("fetch", fetchMock);

    await triggerPromptOptimization(12);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/owner/templates/12/ai-review-health/trigger-optimization"),
      expect.objectContaining({ method: "POST" }),
    );
  });
});
