import { describe, expect, it } from "vitest";
import { parseJsonPreservingSnowflakeIds } from "./json-parse";

describe("parseJsonPreservingSnowflakeIds", () => {
  it("keeps large ids as strings when json numbers are unquoted", () => {
    const parsed = parseJsonPreservingSnowflakeIds(
      '{"id":2061391110022246401,"taskId":"2061391110022246401"}',
    ) as { id: string; taskId: string };
    expect(parsed.id).toBe("2061391110022246401");
    expect(parsed.taskId).toBe("2061391110022246401");
  });

  it("parses normal small numbers unchanged", () => {
    const parsed = parseJsonPreservingSnowflakeIds('{"page":1,"total":42}') as {
      page: number;
      total: number;
    };
    expect(parsed.page).toBe(1);
    expect(parsed.total).toBe(42);
  });
});
