import { describe, expect, it } from "vitest";
import { flattenSubmitDataDiff } from "./flatten-submit-data-diff";

describe("flattenSubmitDataDiff", () => {
  it("expands nested result object into field-level paths", () => {
    const previous = {};
    const current = {
      result: {
        preferred: "A",
        margin: "略优于",
      },
      runtime: { ai_reference: "hidden" },
    };

    const diffs = flattenSubmitDataDiff(previous, current);
    expect(diffs.map((item) => item.path).sort()).toEqual(["result.margin", "result.preferred"]);
    expect(diffs.every((item) => item.changeType === "ADDED")).toBe(true);
  });

  it("detects changed leaf fields", () => {
    const previous = { result: { preferred: "A", margin: "相当" } };
    const current = { result: { preferred: "B", margin: "相当" } };

    const diffs = flattenSubmitDataDiff(previous, current);
    expect(diffs).toEqual([
      {
        path: "result.preferred",
        changeType: "CHANGED",
        oldValue: "A",
        newValue: "B",
      },
    ]);
  });
});
