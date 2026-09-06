import { describe, expect, it } from "vitest";
import { formatReviewAccessError, isReviewTaskAccessForbidden } from "./reviewer-task-access";

describe("reviewer-task-access", () => {
  it("formatReviewAccessError_enriches403", () => {
    const error = Object.assign(new Error("No access to this task review pool"), { status: 403 });
    expect(formatReviewAccessError(error)).toContain("No access to this task review pool");
    expect(formatReviewAccessError(error)).toContain("审核员");
  });

  it("isReviewTaskAccessForbidden_detects403", () => {
    expect(isReviewTaskAccessForbidden(Object.assign(new Error("x"), { status: 403 }))).toBe(true);
    expect(isReviewTaskAccessForbidden(new Error("x"))).toBe(false);
  });
});
