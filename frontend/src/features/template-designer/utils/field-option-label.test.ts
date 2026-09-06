import { describe, expect, it } from "vitest";
import { fieldOptionInsertTitle, fieldOptionShortLabel } from "./field-option-label";

describe("field-option-label", () => {
  it("extracts short label from field option", () => {
    expect(
      fieldOptionShortLabel({
        value: "result.rewrite_suggestion",
        label: "改写 / 修订建议 (result.rewrite_suggestion)",
      }),
    ).toBe("改写 / 修订建议");
  });

  it("builds insert title with path token", () => {
    expect(
      fieldOptionInsertTitle({
        value: "result.preferred",
        label: "偏好结论 (result.preferred)",
      }),
    ).toBe("插入 {{result.preferred}}");
  });
});
