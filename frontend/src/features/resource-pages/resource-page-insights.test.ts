import { describe, expect, it } from "vitest";
import { getResourceInsightSnapshot, isNavigableMetricHref } from "./resource-page-insights";

describe("resource page insights", () => {
  it("treats same-page metric href as non-navigable", () => {
    expect(isNavigableMetricHref("/owner/acceptances", "/owner/acceptances")).toBe(false);
    expect(isNavigableMetricHref("/dashboard/owner", "/owner/acceptances")).toBe(true);
    expect(isNavigableMetricHref(undefined, "/owner/acceptances")).toBe(false);
  });

  it("summarizes owner exports using current records", () => {
    const snapshot = getResourceInsightSnapshot("exports", [
      { status: "RUNNING", totalRecordCount: 12, progressPercent: 40 },
      { status: "SUCCESS", totalRecordCount: 30, progressPercent: 100 },
      { status: "FAILED", totalRecordCount: 18, progressPercent: 10 },
    ]);

    expect(snapshot?.metrics.runningCount.value).toBe("1");
    expect(snapshot?.metrics.successCount.value).toBe("1");
    expect(snapshot?.metrics.failedCount.value).toBe("1");
    expect(snapshot?.metrics.totalRecordCount.value).toBe("60");
  });

  it("marks acceptances ready to confirm only after all samples are checked", () => {
    const snapshot = getResourceInsightSnapshot("acceptances", [
      { status: "SAMPLING", sampleTotalCount: 10, sampledCount: 10, failedCount: 1 },
      { status: "REOPENED", sampleTotalCount: 8, sampledCount: 3, failedCount: 0 },
      { status: "CONFIRMED", sampleTotalCount: 5, sampledCount: 5, failedCount: 0 },
    ]);

    expect(snapshot?.metrics.completion.value).toBe("78%");
    expect(snapshot?.metrics.readyToConfirmCount.value).toBe("1");
    expect(snapshot?.metrics.inProgressCount.value).toBe("1");
    expect(snapshot?.metrics.confirmedVsFailed.value).toBe("1 / 1");
  });

  it("aggregates labeler reward amounts and status buckets", () => {
    const snapshot = getResourceInsightSnapshot("labelerMyRewards", [
      { status: "PENDING", amount: 12.5 },
      { status: "CONFIRMED", amount: 8 },
      { status: "PAID", amount: 9.5 },
      { status: "REVERSED", amount: 2 },
    ]);

    expect(snapshot?.metrics.totalAmount.value).toBe("32");
    expect(snapshot?.metrics.pendingCount.value).toBe("1");
    expect(snapshot?.metrics.confirmedCount.value).toBe("1");
    expect(snapshot?.metrics.settledVsReversed.value).toBe("1 / 1");
  });
});
