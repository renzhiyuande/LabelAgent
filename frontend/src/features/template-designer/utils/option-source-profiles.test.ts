import { describe, expect, it } from "vitest";
import {
  formatCollaboratorRoleSummary,
  formatOptionSourceLabel,
  readCollaboratorRoleConfig,
  readFieldBinding,
  resolveOptionSourceProfile,
  writeCollaboratorRoleConfig,
  writeFieldBinding,
} from "./option-source-profiles";

describe("option-source-profiles", () => {
  it("resolves known source profiles", () => {
    expect(resolveOptionSourceProfile("dict:task_status").kind).toBe("dict");
    expect(resolveOptionSourceProfile("collaborators").kind).toBe("collaborators");
    expect(resolveOptionSourceProfile("assignableTaskItems").kind).toBe("taskBound");
    expect(resolveOptionSourceProfile("tasks").kind).toBe("searchable");
  });

  it("reads and writes collaborator role params", () => {
    expect(readCollaboratorRoleConfig({ role: "LABELER" })).toEqual({
      mode: "static",
      staticRole: "LABELER",
    });
    expect(readCollaboratorRoleConfig({ role: { from: "memberRole" } })).toEqual({
      mode: "field",
      fieldPath: "memberRole",
    });
    expect(writeCollaboratorRoleConfig({ mode: "static", staticRole: "REVIEWER" })).toEqual({
      role: "REVIEWER",
    });
    expect(formatCollaboratorRoleSummary({ role: { from: "memberRole" } })).toBe(
      "角色来自 memberRole",
    );
  });

  it("reads and writes field bindings", () => {
    expect(readFieldBinding({ taskId: { from: "taskId" } }, "taskId")).toBe("taskId");
    expect(writeFieldBinding("exportFields", undefined, "taskId", "taskId")).toEqual({
      taskId: { from: "taskId" },
    });
    expect(writeFieldBinding("exportFields", { taskId: { from: "taskId" }, role: "LABELER" }, "taskId", undefined)).toBeUndefined();
  });

  it("formats source labels", () => {
    expect(formatOptionSourceLabel("dict:task_status", "任务状态")).toBe("字典 · 任务状态");
    expect(formatOptionSourceLabel("collaborators")).toBe("协作用户");
  });
});
