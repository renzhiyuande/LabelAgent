import { describe, expect, it } from "vitest";
import { resolveCardVisibleActions } from "./card-actions";
import type { AuthenticatedUser } from "../lib/types";
import type { ResourceMeta } from "../schema/types";

const readOnlyUser: AuthenticatedUser = {
  userId: 11002,
  username: "viewer",
  displayName: "Viewer",
  roles: ["LABELER"],
  permissions: ["business:task:read"],
  roleNames: ["Labeler"],
  dataScopeResources: [],
};

const adminUser: AuthenticatedUser = {
  userId: 1001,
  username: "admin",
  displayName: "Admin",
  roles: ["ADMIN"],
  permissions: ["system:admin"],
  roleNames: ["Admin"],
  dataScopeResources: [],
};

const resource: ResourceMeta = {
  resource: "tasks",
  label: "任务",
  idKey: "id",
  permissions: { page: "business:task:read" },
  capabilities: { query: true, create: true },
  api: { list: "/api/v1/owner/tasks" },
  filters: { fields: [] },
  form: { sections: [], actions: [] },
  actions: [
    { key: "delete", label: "删除", kind: "request", permission: "system:admin" },
    { key: "publish", label: "发布", kind: "request", permission: "business:task:publish" },
  ],
};

describe("resolveCardVisibleActions", () => {
  it("WB-FE-LC-005: 无删除权限时 delete action 不可见", () => {
    const visible = resolveCardVisibleActions(resource, { id: 15001 }, readOnlyUser);
    expect(visible.map((action) => action.key)).not.toContain("delete");
  });

  it("WB-FE-LC-006: 只读用户看不到需 admin 权限的 action", () => {
    const visible = resolveCardVisibleActions(resource, { id: 15001 }, readOnlyUser);
    expect(visible).toHaveLength(0);
  });

  it("admin 可见需 system:admin 的 delete action", () => {
    const visible = resolveCardVisibleActions(resource, { id: 15001 }, adminUser);
    expect(visible.map((action) => action.key)).toContain("delete");
  });
});
