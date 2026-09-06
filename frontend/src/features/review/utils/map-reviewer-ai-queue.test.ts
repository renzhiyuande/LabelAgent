import { describe, expect, it } from "vitest";
import type { ReviewerSubmissionDetailResponse } from "../api/reviewer-workbench-api";
import { mapReviewerDetailToAiQueueDetail, mapReviewerQueueRowToAiQueueRow } from "./map-reviewer-ai-queue";

describe("P1 白盒 - reviewer ai queue mapper", () => {
  it("无真实 AI 预审结果时，不再伪造列表分数", () => {
    const row = mapReviewerQueueRowToAiQueueRow({
      submissionId: 101,
      submissionCode: "SUB-101",
      title: "待产出样本",
      labelerName: "Alice",
      submittedAt: "2026-06-08T10:00:00Z",
      submissionStatus: "AI_REVIEWING",
      queueStatus: "pending",
    });

    expect(row.hasRealAiReview).toBe(false);
    expect(row.aiInsight.modelName).toBe("AI 结果待产出");
    expect(row.aiInsight.summary).toContain("尚未生成");
  });

  it("AI 失败队列会映射成明确失败说明", () => {
    const row = mapReviewerQueueRowToAiQueueRow({
      submissionId: 102,
      submissionCode: "SUB-102",
      title: "失败样本",
      labelerName: "Bob",
      submittedAt: "2026-06-08T10:05:00Z",
      submissionStatus: "AI_REVIEW_FAILED",
      queueStatus: "failed",
    });

    expect(row.hasRealAiReview).toBe(false);
    expect(row.aiInsight.summary).toContain("执行失败");
  });

  it("详情接口带真实 AI 快照时保留真实分数与维度", () => {
    const detail = mapReviewerDetailToAiQueueDetail(
      {
        submissionId: 201,
        submissionCode: "SUB-201",
        title: "真实 AI 结果",
        labelerName: "Carol",
        submittedAt: "2026-06-08T10:10:00Z",
        submissionStatus: "AI_PASSED",
        queueStatus: "passed",
        taskId: 11,
        taskName: "图像分类",
        itemId: 99,
        itemPayload: { prompt: "hello" },
        templateVersionId: 1,
        templateSchemaJson: JSON.stringify({ version: "1", sections: [] }),
        submitData: { answer: "world" },
        aiReview: {
          aiReviewId: 301,
          modelId: "deepseek/deepseek-v4-flash",
          verdict: "PASS",
          totalScore: 92,
          summary: "字段齐全，建议通过。",
          analyzedAt: "2026-06-08T10:11:00Z",
          dimensions: [
            {
              dimensionKey: "quality",
              dimensionName: "质量",
              score: 92,
              maxScore: 100,
              comment: "质量判断与样本内容一致。",
            },
          ],
        },
        timeline: [],
      } satisfies ReviewerSubmissionDetailResponse,
      {
        id: "201",
        submissionCode: "SUB-201",
        title: "真实 AI 结果",
        submitter: "Carol",
        submittedAt: "2026-06-08T10:10:00Z",
        status: "passed",
        aiInsight: {
          status: "manual_review",
          overallScore: 0,
          dimensions: [],
          summary: "占位",
          modelName: "AI 结果待产出",
          analyzedAt: "2026-06-08T10:10:00Z",
        },
        hasRealAiReview: false,
      },
    );

    expect(detail.hasRealAiReview).toBe(true);
    expect(detail.aiInsight.overallScore).toBe(92);
    expect(detail.aiInsight.dimensions).toHaveLength(1);
    expect(detail.aiInsight.dimensions[0]?.comment).toBe("质量判断与样本内容一致。");
    expect(detail.agentVersion).toContain("deepseek/deepseek-v4-flash");
  });
});
