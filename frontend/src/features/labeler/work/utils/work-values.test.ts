import { describe, expect, it } from "vitest";
import {
  isRuntimeFormPath,
  mergeStashedDraftWithServerRuntime,
  resolveWorkValuesForAssignment,
} from "./work-values";
import type { LabelerWorkDetailResponse } from "../../api/labeler-work-api";

function mockDetail(draftData: Record<string, unknown>): LabelerWorkDetailResponse {
  return {
    assignment: { id: 1, status: "CLAIMED" },
    submission: { id: 2, currentStatus: "DRAFT", draftData },
    task: { taskId: 3, taskName: "t" },
    taskItem: { id: 4, seqNo: 1, payload: {} },
    templateVersion: { templateVersionId: 5, schemaJson: "{}" },
  } as LabelerWorkDetailResponse;
}

describe("isRuntimeFormPath", () => {
  it("matches runtime paths", () => {
    expect(isRuntimeFormPath("runtime.ai_reference")).toBe(true);
    expect(isRuntimeFormPath("result.preferred")).toBe(false);
  });
});

describe("mergeStashedDraftWithServerRuntime", () => {
  it("fills empty runtime fields from server draft", () => {
    const stashed = { result: { preferred: "A" }, runtime: { ai_reference: "" } };
    const detail = mockDetail({
      result: { preferred: "B" },
      runtime: { ai_reference: "AI 建议文本" },
    });

    const merged = mergeStashedDraftWithServerRuntime(stashed, detail);

    expect(merged.result).toEqual({ preferred: "A" });
    expect(merged.runtime).toEqual({ ai_reference: "AI 建议文本" });
  });
});

describe("resolveWorkValuesForAssignment", () => {
  it("prefers newer local draft over server draft", () => {
    const detail = mockDetail({ label_text: "server" });
    detail.submission.draftSavedAt = "2026-06-09T10:00:00.000Z";

    const resolved = resolveWorkValuesForAssignment(detail, {
      values: { label_text: "local" },
      updatedAt: "2026-06-09T11:00:00.000Z",
    });

    expect(resolved.values.label_text).toBe("local");
    expect(resolved.recoveredFromLocal).toBe(true);
    expect(resolved.needsSync).toBe(true);
  });

  it("uses server draft when server is newer", () => {
    const detail = mockDetail({ label_text: "server" });
    detail.submission.draftSavedAt = "2026-06-09T12:00:00.000Z";

    const resolved = resolveWorkValuesForAssignment(detail, {
      values: { label_text: "local" },
      updatedAt: "2026-06-09T11:00:00.000Z",
    });

    expect(resolved.values.label_text).toBe("server");
    expect(resolved.recoveredFromLocal).toBe(false);
    expect(resolved.needsSync).toBe(false);
  });
});
