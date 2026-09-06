import { describe, expect, it } from "vitest";
import { toListQuery } from "./filters";
import type { FilterSchema } from "../schema/types";

describe("toListQuery", () => {
  const schema: FilterSchema = {
    fields: [
      { key: "keyword", label: "关键词", component: "text", field: "keyword", operator: "like" },
      { key: "status", label: "状态", component: "select", field: "status", operator: "eq" },
      { key: "occurredAt", label: "发生时间", component: "dateTimeRange", field: "occurredAt", operator: "between" },
    ],
  };

  it("maps dateTimeRange to between filter", () => {
    const query = toListQuery(1, 10, { occurredAt: ["2026-01-01T00:00:00Z", "2026-01-31T23:59:59Z"] }, schema);
    expect(query.filters).toEqual([
      {
        field: "occurredAt",
        op: "between",
        value: ["2026-01-01T00:00:00Z", "2026-01-31T23:59:59Z"],
      },
    ]);
  });

  it("maps select to eq and trims empty values", () => {
    const query = toListQuery(1, 10, { keyword: " ", status: "ACTIVE" }, schema);
    expect(query.keyword).toBeUndefined();
    expect(query.filters).toEqual([{ field: "status", op: "eq", value: "ACTIVE" }]);
  });

  it("WB-FE-LC-008: 多条件 filter 同时写入 filters 数组", () => {
    const query = toListQuery(
      2,
      20,
      {
        keyword: "appeal",
        status: "PENDING",
        occurredAt: ["2026-06-01T00:00:00Z", "2026-06-30T23:59:59Z"],
      },
      schema,
    );

    expect(query.page).toBe(2);
    expect(query.pageSize).toBe(20);
    expect(query.keyword).toBe("appeal");
    expect(query.filters).toEqual(
      expect.arrayContaining([
        { field: "status", op: "eq", value: "PENDING" },
        {
          field: "occurredAt",
          op: "between",
          value: ["2026-06-01T00:00:00Z", "2026-06-30T23:59:59Z"],
        },
      ]),
    );
  });
});
