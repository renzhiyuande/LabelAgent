import { describe, expect, it } from "vitest";
import { resolveCardBadgeLabel, resolveCardFieldText, resolveCardMetricText } from "./card-field";

describe("card-field", () => {
  const record = {
    taskName: "情感标注",
    sceneCode: "nlp",
    remainingItems: 12,
    deadlineAt: "2026-05-27T10:00:00.000Z",
    status: "PUBLISHED",
  };

  it("resolves title field", () => {
    expect(resolveCardFieldText(record, { field: "taskName" })).toBe("情感标注");
  });

  it("resolves badge enum label", () => {
    expect(
      resolveCardBadgeLabel(record, {
        field: "status",
        enum: [{ value: "PUBLISHED", label: "进行中", tone: "success" }],
      }),
    ).toEqual({ label: "进行中", tone: "success" });
  });

  it("falls back to raw badge value when enum does not match", () => {
    expect(
      resolveCardBadgeLabel(
        {
          ...record,
          isFeatured: 1,
        },
        {
          field: "isFeatured",
          enum: [{ value: true, label: "精选", tone: "success" }],
        },
      ),
    ).toEqual({ label: "1", tone: "default" });
  });

  it("resolves metric with datetime formatter", () => {
    const text = resolveCardMetricText(record, {
      label: "截止",
      field: "deadlineAt",
      formatter: "datetime",
    });
    expect(text).toMatch(/2026/);
  });
});
