import { describe, expect, it } from "vitest";
import { getRegisteredResourceKeys, getResourceMeta } from "./resource-registry";

describe("resource-registry", () => {
  it("WB-FE-LC-010: 每个已注册资源具备 list API 定义", () => {
    const keys = getRegisteredResourceKeys();
    expect(keys.length).toBeGreaterThan(10);

    for (const key of keys) {
      const meta = getResourceMeta(key);
      expect(meta, `resource ${key} should exist`).not.toBeNull();
      const hasListApi =
        Boolean(meta?.api?.query) ||
        meta?.capabilities?.query === true;
      expect(hasListApi, `${key} should define list/query capability`).toBe(true);
    }
  });
});
