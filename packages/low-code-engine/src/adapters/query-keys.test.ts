import { describe, expect, it } from "vitest";
import { resourceListQueryKey, resourceListRootKey } from "./query-keys";
import type { EngineListQuery } from "../types";

describe("resourceListQueryKey", () => {
  it("WB-FE-LC-003: 不同 page 生成独立 queryKey，翻页不追加缓存", () => {
    const page1: EngineListQuery = { page: 1, pageSize: 10, filters: [], sort: [] };
    const page2: EngineListQuery = { page: 2, pageSize: 10, filters: [], sort: [] };

    expect(resourceListQueryKey("tasks", page1, 0)).not.toEqual(resourceListQueryKey("tasks", page2, 0));
    expect(resourceListQueryKey("tasks", page2, 0)[2]).toMatchObject({ page: 2 });
    expect(resourceListRootKey("tasks")[0]).toBe("resource-list");
  });
});
