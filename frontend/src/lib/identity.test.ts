import { describe, expect, it } from "vitest";
import { isSameAuthenticatedUser } from "./identity";
import type { AuthenticatedUser } from "../types";

const baseUser: AuthenticatedUser = {
  userId: 1,
  username: "admin",
  displayName: "Admin",
  roles: ["ADMIN"],
  permissions: ["system:admin", "business:task:read"],
  roleNames: ["管理员"],
  dataScopeResources: [],
};

describe("isSameAuthenticatedUser", () => {
  it("treats permission order as equivalent", () => {
    const reordered: AuthenticatedUser = {
      ...baseUser,
      permissions: ["business:task:read", "system:admin"],
    };
    expect(isSameAuthenticatedUser(baseUser, reordered)).toBe(true);
  });

  it("detects permission changes", () => {
    const changed: AuthenticatedUser = {
      ...baseUser,
      permissions: ["system:admin"],
    };
    expect(isSameAuthenticatedUser(baseUser, changed)).toBe(false);
  });
});
