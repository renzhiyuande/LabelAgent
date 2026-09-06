import { describe, expect, it } from "vitest";
import { auditPoolQueueScopeKey, isSameAuditPoolQueueScope } from "./audit-pool-scope";

describe("audit-pool-scope", () => {
  it("treats scopes with same type and ids as equal regardless of item order", () => {
    const left = {
      type: "labeler" as const,
      items: [
        { id: "2", label: "B" },
        { id: "1", label: "A" },
      ],
    };
    const right = {
      type: "labeler" as const,
      items: [{ id: "1", label: "A" }, { id: "2", label: "B" }],
    };
    expect(isSameAuditPoolQueueScope(left, right)).toBe(true);
    expect(auditPoolQueueScopeKey(left)).toBe("labeler:1,2");
  });

  it("detects scope type or id changes", () => {
    const base = { type: "task" as const, items: [{ id: "9", label: "T" }] };
    expect(isSameAuditPoolQueueScope(base, { type: "task", items: [{ id: "10", label: "X" }] })).toBe(false);
    expect(isSameAuditPoolQueueScope(base, { type: "labeler", items: [{ id: "9", label: "T" }] })).toBe(false);
  });
});
