import { describe, expect, it } from "vitest";
import {
  isDisabledInFormMode,
  isFormFieldDisabled,
  isFormFieldVisible,
  isFormSectionVisible,
  isVisibleInFormMode,
} from "./form-field-mode";

describe("form-field-mode", () => {
  it("treats missing visibleIn as visible in all modes", () => {
    expect(isVisibleInFormMode(undefined, "create")).toBe(true);
    expect(isVisibleInFormMode(undefined, "edit")).toBe(true);
    expect(isVisibleInFormMode(undefined, "assignment")).toBe(true);
  });

  it("filters field visibility by visibleIn", () => {
    expect(isFormFieldVisible({ visibleIn: ["create"] }, "create", {})).toBe(true);
    expect(isFormFieldVisible({ visibleIn: ["create"] }, "edit", {})).toBe(false);
  });

  it("combines visibleIn with visibleWhen", () => {
    expect(
      isFormFieldVisible(
        { visibleIn: ["edit"], visibleWhen: [{ field: "status", operator: "eq", value: "UNCLAIMED" }] },
        "edit",
        { status: "UNCLAIMED" },
      ),
    ).toBe(true);
    expect(
      isFormFieldVisible(
        { visibleIn: ["edit"], visibleWhen: [{ field: "status", operator: "eq", value: "UNCLAIMED" }] },
        "edit",
        { status: "CLAIMED" },
      ),
    ).toBe(false);
  });

  it("filters disabled state by disabledIn", () => {
    expect(isDisabledInFormMode(["edit"], "edit")).toBe(true);
    expect(isFormFieldDisabled({ component: "text", disabledIn: ["edit"] }, "edit", {})).toBe(true);
    expect(isFormFieldDisabled({ component: "text", disabledIn: ["edit"] }, "create", {})).toBe(false);
  });

  it("filters section visibility by visibleIn", () => {
    expect(isFormSectionVisible({ visibleIn: ["create"] }, "create")).toBe(true);
    expect(isFormSectionVisible({ visibleIn: ["create"] }, "edit")).toBe(false);
  });
});
