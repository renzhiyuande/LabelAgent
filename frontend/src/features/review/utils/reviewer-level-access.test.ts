import { describe, expect, it } from "vitest";
import { resolveReviewerLevelAccess } from "./reviewer-level-access";

describe("resolveReviewerLevelAccess", () => {
  it("treats workbench-only as unrestricted", () => {
    const summary = resolveReviewerLevelAccess(["business:reviewer:workbench"]);
    expect(summary.unrestricted).toBe(true);
    expect(summary.levels.map((level) => level.key)).toEqual(["L1", "L2", "L3"]);
  });

  it("parses explicit level grants", () => {
    const summary = resolveReviewerLevelAccess([
      "business:reviewer:workbench",
      "business:reviewer:level:L2",
    ]);
    expect(summary.unrestricted).toBe(false);
    expect(summary.levels).toEqual([{ key: "L2", label: "复审" }]);
  });

  it("uses meta labels when provided", () => {
    const summary = resolveReviewerLevelAccess(["business:reviewer:level:L1"], [
      { levelKey: "L1", levelLabel: "一级审核", stageNo: 1, isFinal: false, pendingCount: 0 },
    ]);
    expect(summary.levels[0].label).toBe("一级审核");
  });
});
