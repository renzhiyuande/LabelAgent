import { describe, expect, it } from "vitest";
import {
  buildCalcBasisDetailFields,
  enrichRewardSettlementDisplayRecord,
} from "./reward-settlement-display.shared";

describe("enrichRewardSettlementDisplayRecord", () => {
  it("falls back to detail row fields when calcBasisJson is sparse", () => {
    const enriched = enrichRewardSettlementDisplayRecord({
      taskId: "910230000001",
      submissionId: "910238000001",
      submissionVersionId: "910239000001",
      assignmentId: "910237000001",
      userId: "910100000101",
      labelerDisplayName: "Anna",
      currencyCode: "CNY",
      amount: 12,
      calcBasisJson: { baseAmount: 12, mode: "PER_APPROVED", sampleId: "P0001" },
      taskTitle: "Demo Task",
      calcBasisSubmissionLabel: "Q-001 · APPROVED",
    });

    expect(enriched.calcBasisTaskId).toBe("910230000001");
    expect(enriched.calcBasisSubmissionId).toBe("910238000001");
    expect(enriched.calcBasisAmount).toBe(12);
    expect(enriched.calcBasisCurrency).toBe("CNY");
    expect(enriched.calcBasisSampleId).toBe("P0001");
    expect(enriched.calcBasisLabelerId).toBe("910100000101");
    expect(enriched.calcBasisTaskTitle).toBe("Demo Task");
  });

  it("buildCalcBasisDetailFields uses link type for entity refs", () => {
    const fields = buildCalcBasisDetailFields("owner");
    expect(fields[0]).toMatchObject({
      key: "calcBasisTaskTitle",
      type: "link",
      link: { resourceKey: "tasks", idField: "calcBasisTaskId" },
    });
    expect(fields[1]).toMatchObject({ key: "calcBasisSubmissionLabel", type: "link" });
  });
});
