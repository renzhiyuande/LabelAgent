import { describe, expect, it } from "vitest";
import { resolveReviewerAuditPoolHotkeyAction } from "./use-reviewer-audit-pool-hotkeys";

const baseOptions = {
  enabled: true,
  canPrev: true,
  canNext: true,
  detail: { status: "pending" } as const,
  saving: false,
  comment: "ok",
};

describe("resolveReviewerAuditPoolHotkeyAction", () => {
  it("maps review decision keys", () => {
    expect(resolveReviewerAuditPoolHotkeyAction("a", baseOptions)).toBe("approve");
    expect(resolveReviewerAuditPoolHotkeyAction("R", baseOptions)).toBe("reject");
    expect(resolveReviewerAuditPoolHotkeyAction("t", baseOptions)).toBe("return");
  });

  it("maps navigation keys when allowed", () => {
    expect(resolveReviewerAuditPoolHotkeyAction("s", baseOptions)).toBe("next");
    expect(resolveReviewerAuditPoolHotkeyAction("ArrowLeft", baseOptions)).toBe("prev");
    expect(resolveReviewerAuditPoolHotkeyAction("ArrowDown", baseOptions)).toBe("next");
  });

  it("ignores navigation when queue ends", () => {
    expect(resolveReviewerAuditPoolHotkeyAction("s", { ...baseOptions, canNext: false })).toBeNull();
    expect(resolveReviewerAuditPoolHotkeyAction("ArrowUp", { ...baseOptions, canPrev: false })).toBeNull();
  });

  it("returns null when disabled or unknown", () => {
    expect(resolveReviewerAuditPoolHotkeyAction("a", { ...baseOptions, enabled: false })).toBeNull();
    expect(resolveReviewerAuditPoolHotkeyAction("x", baseOptions)).toBeNull();
  });
});
