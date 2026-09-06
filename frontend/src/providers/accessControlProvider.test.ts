import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "../types";

const getResourceMetaMock = vi.fn();
const getAuthStateMock = vi.fn();

vi.mock("@/low-code/schema/resource-registry", () => ({
  getResourceMeta: (...args: unknown[]) => getResourceMetaMock(...args),
}));

vi.mock("../stores/auth", () => ({
  useAuthStore: {
    getState: () => getAuthStateMock(),
  },
}));

import { accessControlProvider } from "./accessControlProvider";

const adminUser: AuthenticatedUser = {
  userId: 1,
  username: "admin",
  displayName: "管理员",
  roles: ["SYSTEM_ADMIN"],
  permissions: ["system:admin"],
  roleNames: ["系统管理员"],
  dataScopeResources: [],
};

describe("accessControlProvider", () => {
  beforeEach(() => {
    getResourceMetaMock.mockReset();
    getAuthStateMock.mockReset();
    getAuthStateMock.mockReturnValue({ currentUser: adminUser });
  });

  it("falls back to page permission for standard actions", async () => {
    getResourceMetaMock.mockReturnValue({
      permissions: {
        page: "system:admin",
      },
      actions: [],
    });

    const listResult = await accessControlProvider.can?.({ resource: "users", action: "list" });
    const createResult = await accessControlProvider.can?.({ resource: "users", action: "create" });

    expect(listResult?.can).toBe(true);
    expect(createResult?.can).toBe(true);
  });

  it("uses action-level permission before page permission", async () => {
    getResourceMetaMock.mockReturnValue({
      permissions: {
        page: "system:admin",
        create: "system:dict:write",
      },
      actions: [],
    });

    const createResult = await accessControlProvider.can?.({ resource: "dictTypes", action: "create" });
    const listResult = await accessControlProvider.can?.({ resource: "dictTypes", action: "list" });

    expect(createResult?.can).toBe(false);
    expect(listResult?.can).toBe(true);
  });

  it("uses custom action permission from action schema", async () => {
    getResourceMetaMock.mockReturnValue({
      permissions: {
        page: "system:admin",
      },
      actions: [
        {
          key: "export",
          permission: "system:export",
        },
      ],
    });

    const exportResult = await accessControlProvider.can?.({ resource: "users", action: "export" });
    expect(exportResult?.can).toBe(false);
  });
});
