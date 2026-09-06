import { describe, expect, it } from "vitest";
import { labelerMySubmittedResource } from "./labeler-my-submitted";
import { labelerMyTasksResource } from "./labeler-my-tasks";

describe("labelerMyTasksResource metrics", () => {
  it("shows compact card metrics and keeps full progress columns in table", () => {
    const metricLabels = labelerMyTasksResource.page?.card?.metrics?.map((item) => item.label);
    expect(metricLabels).toEqual(["我领取数", "待作答", "需修改"]);

    const tableColumns = labelerMyTasksResource.table?.columns.map((column) => column.key);
    expect(tableColumns).toContain("submittedCount");
    expect(tableColumns).toContain("submittedEverCount");
  });

  it("exposes continue action when next assignment is available", () => {
    const continueAction = labelerMyTasksResource.actions?.find((action) => action.key === "continue");
    expect(continueAction?.visibleWhen).toEqual([{ field: "canContinueWork", operator: "eq", value: true }]);

    const normalized = labelerMyTasksResource.normalizeRecord?.({
      taskId: 1,
      openCount: 0,
      needsRevisionCount: 1,
      nextAssignmentId: 100,
    }) as Record<string, unknown>;

    expect(normalized.canContinueWork).toBe(true);
    expect(normalized.hasPendingWork).toBe(true);
  });
});

describe("labelerMySubmittedResource revise action", () => {
  it("marks returned submissions as revisable", () => {
    const reviseAction = labelerMySubmittedResource.actions?.find((action) => action.key === "revise");
    expect(reviseAction?.visibleWhen).toEqual([{ field: "canRevise", operator: "eq", value: true }]);

    const normalized = labelerMySubmittedResource.normalizeRecord?.({
      id: 1,
      assignmentId: 100,
      currentStatus: "NEEDS_REVISION",
    }) as Record<string, unknown>;

    expect(normalized.canRevise).toBe(true);
    expect(normalized.status).toBe("NEEDS_REVISION");
  });

  it("marks AI rejected submissions as revisable", () => {
    const normalized = labelerMySubmittedResource.normalizeRecord?.({
      id: 2,
      assignmentId: 101,
      currentStatus: "AI_REJECTED",
    }) as Record<string, unknown>;

    expect(normalized.canRevise).toBe(true);
    expect(normalized.status).toBe("AI_REJECTED");
  });
});
