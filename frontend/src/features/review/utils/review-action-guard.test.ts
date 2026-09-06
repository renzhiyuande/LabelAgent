import { describe, expect, it } from "vitest";
import { getReviewActionBlockReason } from "./review-action-guard";

const detail = {
  status: "pending",
} as const;

describe("getReviewActionBlockReason", () => {
  it("blocks when detail is missing", () => {
    expect(getReviewActionBlockReason({ detail: null, saving: false, comment: "ok" })).toMatch(/加载/);
  });

  it("blocks when comment is empty", () => {
    expect(
      getReviewActionBlockReason({ detail: { ...detail, status: "pending" } as never, saving: false, comment: "  " }),
    ).toBe("请先填写审核意见");
  });

  it("allows when ready", () => {
    expect(
      getReviewActionBlockReason({ detail: { ...detail, status: "pending" } as never, saving: false, comment: "通过" }),
    ).toBeNull();
  });
});
