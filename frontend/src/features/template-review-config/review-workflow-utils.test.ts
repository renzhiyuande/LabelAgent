import { describe, expect, it } from "vitest";
import { parseReviewWorkflowLevels, validateReviewWorkflowLevels } from "./review-workflow-utils";

describe("review-workflow-utils", () => {
  it("parses canonical workflow json", () => {
    const levels = parseReviewWorkflowLevels({
      levels: [
        { key: "L1", label: "初审", actions: ["approve", "reject"] },
        { key: "L2", label: "复审", actions: ["approve"] },
      ],
    });
    expect(levels).toHaveLength(2);
    expect(levels[1].label).toBe("复审");
  });

  it("validates sequential level keys", () => {
    expect(
      validateReviewWorkflowLevels([
        { key: "L1", label: "初审", actions: ["approve"] },
        { key: "L3", label: "终审", actions: ["approve"] },
      ]),
    ).toMatch(/L2/);
  });
});
