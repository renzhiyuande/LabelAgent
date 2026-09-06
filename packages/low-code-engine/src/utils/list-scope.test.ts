import { describe, expect, it } from "vitest";
import { applyScopeToListQuery, filterResourceFilters } from "./list-scope";

describe("applyScopeToListQuery", () => {
  it("injects scope filter and replaces existing field filter", () => {
    const query = applyScopeToListQuery(
      {
        page: 1,
        pageSize: 20,
        filters: [
          { field: "templateId", op: "eq", value: "1" },
          { field: "status", op: "eq", value: "DRAFT" },
        ],
      },
      { field: "templateId", value: 42 },
    );

    expect(query.filters).toEqual([
      { field: "status", op: "eq", value: "DRAFT" },
      { field: "templateId", op: "eq", value: "42" },
    ]);
  });
});

describe("filterResourceFilters", () => {
  it("removes hidden filter fields from schema", () => {
    const next = filterResourceFilters(
      {
        primary: ["templateId", "status"],
        fields: [
          { key: "templateId", label: "模板ID", component: "text", field: "templateId", operator: "eq" },
          { key: "status", label: "状态", component: "select", field: "status", operator: "eq", options: [] },
        ],
      },
      ["templateId"],
    );

    expect(next.primary).toEqual(["status"]);
    expect(next.fields.map((field) => field.key)).toEqual(["status"]);
  });
});
