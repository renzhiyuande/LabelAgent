import { describe, expect, it } from "vitest";
import type { FormFieldSchema } from "../schema/types";
import { expandFlatFormPaths, mergeFormValues, normalizeArrayDefaultValue } from "./form-values";

const arrayField: FormFieldSchema = {
  key: "field_1",
  label: "子表单",
  component: "array",
  fields: [{ key: "field_6", label: "名称", component: "text" }],
};

describe("expandFlatFormPaths", () => {
  it("expands array item flat paths into nested structure", () => {
    expect(
      expandFlatFormPaths({
        "field_1.0.field_6": "000",
        "field_1.1.field_6": "00",
        "field_1.2.field_6": "999",
      }),
    ).toEqual({
      field_1: [{ field_6: "000" }, { field_6: "00" }, { field_6: "999" }],
    });
  });
});

describe("normalizeArrayDefaultValue", () => {
  it("parses flat path object into array items", () => {
    expect(
      normalizeArrayDefaultValue(arrayField, {
        "field_1.0.field_6": "000",
        "field_1.1.field_6": "00",
        "field_1.2.field_6": "999",
      }),
    ).toEqual([{ field_6: "000" }, { field_6: "00" }, { field_6: "999" }]);
  });

  it("keeps standard array default values", () => {
    expect(normalizeArrayDefaultValue(arrayField, [{ field_6: "a" }, { field_6: "b" }])).toEqual([
      { field_6: "a" },
      { field_6: "b" },
    ]);
  });
});

describe("mergeFormValues", () => {
  it("merges flat draft paths over defaults", () => {
    expect(
      mergeFormValues(
        { field_1: [] },
        {
          "field_1.0.field_6": "000",
          "field_1.1.field_6": "00",
        },
      ),
    ).toEqual({
      field_1: [{ field_6: "000" }, { field_6: "00" }],
    });
  });
});
