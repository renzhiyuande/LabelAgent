import { describe, expect, it } from "vitest";
import type { ActionSchema, ResourceMeta } from "../schema/types";
import { resolveResourceBulkActions } from "./resolve-resource-bulk-actions";

const baseResource: ResourceMeta = {
  resource: "users",
  label: "用户",
  idKey: "id",
  permissions: {},
  api: {
    list: "/api/v1/admin/users",
  },
  table: {
    columns: [],
    selectable: true,
  },
  filters: {
    fields: [],
  },
  form: {
    sections: [],
    actions: [],
  },
  detail: {
    sections: [],
  },
  actions: [
    { key: "enable", label: "启用", kind: "request" },
    { key: "disable", label: "禁用", kind: "danger" },
    {
      key: "delete",
      label: "删除",
      kind: "danger",
      confirm: {
        title: "确认删除？",
        description: "删除后不可恢复",
      },
    },
  ],
};

describe("resolveResourceBulkActions", () => {
  it("derives bulk actions from row actions when selectable and bulkActions is omitted", () => {
    const actions = resolveResourceBulkActions(baseResource);
    expect(actions.map((action) => action.key)).toEqual(["enable", "disable", "delete"]);
    expect(actions[2]?.confirm?.title).toBe("确认删除 {count} 项？");
  });

  it("respects explicit bulkActions configuration", () => {
    const actions = resolveResourceBulkActions({
      ...baseResource,
      table: {
        ...baseResource.table,
        columns: [],
        bulkActions: [
          {
            key: "delete",
            label: "批量删除",
            kind: "danger",
            confirm: {
              title: "确认删除选中的 {count} 项？",
            },
          },
        ],
      },
    });
    expect(actions).toHaveLength(1);
    expect(actions[0]?.label).toBe("批量删除");
    expect(actions[0]?.kind).toBe("danger");
    expect(actions[0]?.confirm?.title).toBe("确认删除选中的 {count} 项？");
  });

  it("uses fully configured bulk assignment action", () => {
    const actions = resolveResourceBulkActions({
      ...baseResource,
      table: {
        ...baseResource.table,
        columns: [],
        bulkActions: [
          {
            key: "assignRoles",
            label: "批量分配角色",
            kind: "assignment",
            api: "/api/v1/admin/users/{id}/roles",
            bulkApi: "/api/v1/admin/users/roles/batch",
            assignment: {
              payloadKey: "roleIds",
              candidatesSource: "roles",
              variant: "flat",
            },
          },
        ],
      },
    });
    expect(actions).toHaveLength(1);
    expect(actions[0]?.kind).toBe("assignment");
    expect(actions[0]?.bulkApi).toBe("/api/v1/admin/users/roles/batch");
    expect(actions[0]?.label).toBe("批量分配角色");
  });

  it("returns empty list when bulkActions is explicitly empty", () => {
    const actions = resolveResourceBulkActions({
      ...baseResource,
      table: {
        ...baseResource.table,
        columns: [],
        bulkActions: [],
      },
    });
    expect(actions).toEqual([]);
  });

  it("returns empty list when table is not selectable", () => {
    const actions = resolveResourceBulkActions({
      ...baseResource,
      table: {
        ...baseResource.table,
        columns: [],
        selectable: false,
      },
    });
    expect(actions).toEqual([]);
  });
});
