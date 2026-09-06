import { describe, expect, it } from "vitest";
import { hasPermission } from "./permissions";
import type { AuthenticatedUser } from "../lib/types";

const user: AuthenticatedUser = {
  userId: 1,
  username: "admin",
  displayName: "管理员",
  roles: ["SYSTEM_ADMIN"],
  permissions: ["system:admin", "system:dict:write"],
  roleNames: ["系统管理员"],
  dataScopeResources: ["TASK"],
};

describe("hasPermission", () => {
  it("returns true when permission is empty", () => {
    expect(hasPermission(user, undefined)).toBe(true);
  });

  it("returns true when user has explicit permission", () => {
    expect(hasPermission(user, "system:admin")).toBe(true);
  });

  it("falls back to roles for permission check", () => {
    expect(hasPermission(user, "SYSTEM_ADMIN")).toBe(true);
  });

  it("returns false for missing permission", () => {
    expect(hasPermission(user, "system:unknown")).toBe(false);
  });
});
