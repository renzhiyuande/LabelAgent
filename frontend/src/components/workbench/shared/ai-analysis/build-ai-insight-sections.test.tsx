import { describe, expect, it } from "vitest";
import { buildUnavailableAiInsight } from "../AiInsightPanel";
import { buildAiInsightPanelSections } from "./build-ai-insight-sections";

function fieldKeys(section: ReturnType<typeof buildAiInsightPanelSections>[number]) {
  return section.schema?.sections.flatMap((group) => group.fields.map((field) => field.key)) ?? [];
}

describe("P1 白盒 - ai insight sections", () => {
  it("无真实 AI 预审结果时，不暴露 overall_score 字段", () => {
    const sections = buildAiInsightPanelSections({
      insight: buildUnavailableAiInsight({
        analyzedAt: "2026-06-08T10:00:00Z",
        summary: "当前提交尚未产出可展示的 AI 预审评分。",
      }),
      hasRealAiReview: false,
    });

    const dimensions = sections.find((section) => section.id === "dimensions");
    const verdict = sections.find((section) => section.id === "verdict");

    expect(dimensions?.data).toEqual({});
    expect(dimensions?.emptyMessage).toContain("尚未产出");
    expect(fieldKeys(verdict!)).not.toContain("overall_score");
    expect(verdict?.data).not.toHaveProperty("overall_score");
  });

  it("有真实 AI 预审结果时，保留综合分字段", () => {
    const sections = buildAiInsightPanelSections({
      insight: {
        status: "suggest_pass",
        overallScore: 96,
        dimensions: [{ key: "quality", label: "质量", score: 96, maxScore: 100 }],
        summary: "建议通过。",
        modelName: "deepseek/deepseek-v4-flash",
        analyzedAt: "2026-06-08T10:01:00Z",
      },
      hasRealAiReview: true,
    });

    const verdict = sections.find((section) => section.id === "verdict");

    expect(fieldKeys(verdict!)).toContain("overall_score");
    expect(verdict?.data).toHaveProperty("overall_score", 96);
  });

  it("有原始响应时追加 raw_response 区块", () => {
    const sections = buildAiInsightPanelSections({
      insight: {
        status: "suggest_pass",
        overallScore: 90,
        dimensions: [],
        summary: "建议通过。",
        modelName: "deepseek/deepseek-v4-flash",
        analyzedAt: "2026-06-08T10:01:00Z",
      },
      rawResponseText: '{"verdict":"pass","scores":{"准确性":90}}',
      hasRealAiReview: true,
    });

    const rawResponse = sections.find((section) => section.id === "raw_response");
    expect(rawResponse?.title).toBe("原始响应");
    expect(rawResponse?.data).toHaveProperty("raw_response_text");
  });
});
