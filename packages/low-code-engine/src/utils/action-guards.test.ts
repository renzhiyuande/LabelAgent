import { describe, expect, it } from "vitest";
import { isActionBlockedForRecord } from "./action-guards";
import type { AuthenticatedUser } from "../lib/types";

const currentUser: AuthenticatedUser = {
  userId: 1001,
  username: "admin",
  displayName: "Admin",
  roles: ["ADMIN"],
  permissions: ["system:admin"],
  roleNames: ["Admin"],
  dataScopeResources: [],
};

describe("isActionBlockedForRecord", () => {
  it("blocks self disable and role assignment on users", () => {
    const record = { id: 1001, username: "admin" };
    expect(isActionBlockedForRecord("users", "disable", record, currentUser)).toBe(true);
    expect(isActionBlockedForRecord("users", "assignRoles", record, currentUser)).toBe(true);
    expect(isActionBlockedForRecord("users", "enable", record, currentUser)).toBe(false);
  });

  it("blocks disabling ADMIN role and system:admin permission", () => {
    expect(isActionBlockedForRecord("roles", "disable", { id: 2002, roleCode: "ADMIN" }, currentUser)).toBe(true);
    expect(
      isActionBlockedForRecord("permissions", "disable", { id: 4001, permissionCode: "system:admin" }, currentUser),
    ).toBe(true);
  });
});
