import { describe, expect, it } from "vitest";
import { filterRemoteParamsForSource, isBlankRemoteParamValue } from "./remote-source-params";

describe("remote-source-params", () => {
  it("filters params by source allowlist", () => {
    expect(
      filterRemoteParamsForSource("tasks", {
        role: "LABELER",
        taskId: { from: "taskId" },
      }),
    ).toBeUndefined();
    expect(
      filterRemoteParamsForSource("collaborators", {
        role: "LABELER",
        taskId: { from: "taskId" },
      }),
    ).toEqual({ role: "LABELER" });
    expect(filterRemoteParamsForSource("dict:task_status", { role: "LABELER" })).toBeUndefined();
  });

  it("treats zero-like values as blank", () => {
    expect(isBlankRemoteParamValue(0)).toBe(true);
    expect(isBlankRemoteParamValue("0")).toBe(true);
    expect(isBlankRemoteParamValue("910230000001")).toBe(false);
  });
});
