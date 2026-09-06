import { describe, expect, it } from "vitest";
import {
  buildLlmApplyUpdates,
  formatAgentResultSummary,
  isLlmAgentMode,
  resolveLlmApplyMappings,
  tryParseAgentJsonOutput,
} from "./llm-apply-utils";

describe("llm-apply-utils", () => {
  it("detects agent mode from applyTargets or legacy mappings", () => {
    expect(isLlmAgentMode({ applyTargets: ["result.a"] })).toBe(true);
    expect(isLlmAgentMode({ applyMappings: [{ sourceKey: "a", targetPath: "result.a" }] })).toBe(true);
    expect(isLlmAgentMode({ mode: "chat" })).toBe(false);
  });

  it("builds apply updates from parsed output", () => {
    const updates = buildLlmApplyUpdates(
      { preferred: "A", margin: "略优于" },
      [
        { sourceKey: "preferred", targetPath: "result.preferred" },
        { sourceKey: "margin", targetPath: "result.margin" },
        { sourceKey: "missing", targetPath: "result.x" },
      ],
    );
    expect(updates).toEqual([
      { path: "result.preferred", value: "A" },
      { path: "result.margin", value: "略优于" },
    ]);
  });

  it("resolves legacy from/to apply mappings", () => {
    expect(
      resolveLlmApplyMappings({
        applyMappings: [
          { sourceKey: "", targetPath: "", from: "winner", to: "result.preferred" } as never,
        ],
      }),
    ).toEqual([{ sourceKey: "winner", targetPath: "result.preferred" }]);
  });

  it("parses agent json output from raw text or fenced blocks", () => {
    expect(
      tryParseAgentJsonOutput('{"winner":"A","confidence":0.95}'),
    ).toEqual({ winner: "A", confidence: 0.95 });
    expect(
      tryParseAgentJsonOutput('```json\n{"winner":"B"}\n```'),
    ).toEqual({ winner: "B" });
  });

  it("formats agent result summary without exposing raw json", () => {
    expect(
      formatAgentResultSummary({
        winner: "A",
        confidence: 0.99,
        dimension_hints: ["准确性", "完整性"],
        risk_flags: ["回答B缺少校验"],
      }),
    ).toBe("推荐：A · 置信度 0.99 · 建议维度：准确性、完整性 · 风险点：回答B缺少校验");
  });
});
