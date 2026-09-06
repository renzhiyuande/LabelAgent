import { describe, expect, it } from "vitest";
import { evaluateConditions } from "./visibility";

describe("evaluateConditions", () => {
  const values = {
    status: "ACTIVE",
    role: "ADMIN",
    tags: ["A", "B"],
  };

  it("supports eq and ne", () => {
    expect(evaluateConditions(values, [{ field: "status", operator: "eq", value: "ACTIVE" }])).toBe(true);
    expect(evaluateConditions(values, [{ field: "status", operator: "ne", value: "DISABLED" }])).toBe(true);
  });

  it("supports in operator", () => {
    expect(evaluateConditions(values, [{ field: "role", operator: "in", value: ["ADMIN", "USER"] }])).toBe(true);
  });

  it("supports contains operator", () => {
    expect(evaluateConditions(values, [{ field: "tags", operator: "contains", value: "A" }])).toBe(true);
  });
});
