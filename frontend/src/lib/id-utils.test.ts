import { describe, expect, it } from "vitest";
import { normalizeSnowflakeId, normalizeSnowflakeIdList, requireSnowflakeId } from "./id-utils";

describe("normalizeSnowflakeId", () => {
  it("returns trimmed string ids unchanged", () => {
    expect(normalizeSnowflakeId(" 1234567890123456789 ")).toBe("1234567890123456789");
  });

  it("returns undefined for empty values", () => {
    expect(normalizeSnowflakeId(null)).toBeUndefined();
    expect(normalizeSnowflakeId("")).toBeUndefined();
    expect(normalizeSnowflakeId("   ")).toBeUndefined();
  });

  it("rejects unsafe js numbers", () => {
    expect(normalizeSnowflakeId(2061391110022246400)).toBeUndefined();
  });

  it("accepts safe integers as strings", () => {
    expect(normalizeSnowflakeId(42)).toBe("42");
  });
});

describe("normalizeSnowflakeIdList", () => {
  it("deduplicates and stringifies ids", () => {
    expect(
      normalizeSnowflakeIdList(["2061391110022246401", "2061391110022246401", 42]),
    ).toEqual(["2061391110022246401", "42"]);
  });
});

describe("requireSnowflakeId", () => {
  it("throws when id is invalid", () => {
    expect(() => requireSnowflakeId(2061391110022246400, "taskId")).toThrow(/taskId/);
  });
});
