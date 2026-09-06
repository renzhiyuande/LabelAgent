import { describe, expect, it } from "vitest";
import { prepareBatchAssignValues } from "./prepare-batch-assign-values";

describe("prepareBatchAssignValues", () => {
  it("serializes snowflake ids as strings in batch body", () => {
    const payload = prepareBatchAssignValues({
      taskId: "2061391110022246401",
      labelerId: "2061391110022246402",
      selectedItemIds: ["2061391110022246403", "2061391110022246404"],
    });
    expect(payload).toEqual({
      taskId: "2061391110022246401",
      labelerId: "2061391110022246402",
      itemIds: ["2061391110022246403", "2061391110022246404"],
      deadlineAt: null,
    });
    expect(JSON.stringify(payload)).not.toMatch(/2061391110022246401[^"]/);
  });

  it("rejects corrupted numeric taskId", () => {
    expect(() =>
      prepareBatchAssignValues({
        taskId: 2061391110022246400,
        labelerId: "1",
        selectedItemIds: ["2"],
      }),
    ).toThrow(/taskId/);
  });
});
