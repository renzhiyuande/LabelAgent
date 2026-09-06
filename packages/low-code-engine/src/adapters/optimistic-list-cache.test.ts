import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { applyOptimisticListPatch, resolveOptimisticRecordPatch } from "./optimistic-list-cache";
import { resourceListRootKey } from "./query-keys";
import type { ResourceMeta } from "../schema/types";

describe("resolveOptimisticRecordPatch", () => {
  it("maps enable and disable to status values", () => {
    expect(resolveOptimisticRecordPatch("enable", { page: 1, pageSize: 10 })?.value).toBe("ACTIVE");
    expect(resolveOptimisticRecordPatch("disable", { page: 1, pageSize: 10 })?.value).toBe("DISABLED");
    expect(resolveOptimisticRecordPatch("delete", { page: 1, pageSize: 10 })).toBeNull();
  });

  it("removes row when status filter conflicts with next status", () => {
    const listQuery = {
      page: 1,
      pageSize: 10,
      filters: [{ field: "status", op: "eq" as const, value: "ACTIVE" }],
    };

    expect(resolveOptimisticRecordPatch("disable", listQuery)).toEqual({
      field: "status",
      value: "DISABLED",
      removeFromList: true,
    });
    expect(resolveOptimisticRecordPatch("enable", listQuery)?.removeFromList).toBe(false);
  });

  it("supports custom active/inactive values from switch column meta", () => {
    expect(
      resolveOptimisticRecordPatch("disable", { page: 1, pageSize: 10 }, {
        field: "status",
        activeValue: "ACTIVE",
        inactiveValue: "INACTIVE",
      })?.value,
    ).toBe("INACTIVE");
  });
});

describe("applyOptimisticListPatch", () => {
  const resource: ResourceMeta = {
    resource: "users",
    label: "用户",
    idKey: "id",
    permissions: { page: "system:admin" },
    capabilities: { query: true },
    api: { list: "/api/v1/admin/users" },
    filters: { fields: [] },
    form: { sections: [], actions: [] },
  };

  it("WB-FE-LC-004/009: disable 乐观更新行状态；过滤冲突时即时移除", () => {
    const queryClient = new QueryClient();
    const listQuery = {
      page: 1,
      pageSize: 10,
      filters: [{ field: "status", op: "eq" as const, value: "ACTIVE" }],
    };
    const queryKey = [...resourceListRootKey("users"), listQuery, 0];
    queryClient.setQueryData(queryKey, {
      data: [
        { id: 1, status: "ACTIVE" },
        { id: 2, status: "ACTIVE" },
      ],
      total: 2,
    });

    const patch = resolveOptimisticRecordPatch("disable", listQuery);
    expect(patch).not.toBeNull();

    applyOptimisticListPatch(queryClient, resource, 1, patch!);

    const cached = queryClient.getQueryData<{ data: Array<{ id: number; status: string }>; total: number }>(queryKey);
    expect(cached?.data).toHaveLength(1);
    expect(cached?.data[0]?.id).toBe(2);
    expect(cached?.total).toBe(1);
  });
});
