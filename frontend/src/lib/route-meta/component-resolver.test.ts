import { describe, expect, it } from "vitest";
import { resolveResourceKeyFromComponentPath } from "./component-resolver";

describe("resolveResourceKeyFromComponentPath", () => {
  it("maps system management menus to registered resources", () => {
    expect(resolveResourceKeyFromComponentPath("pages/users")).toBe("users");
    expect(resolveResourceKeyFromComponentPath("pages/roles")).toBe("roles");
    expect(resolveResourceKeyFromComponentPath("pages/permissions")).toBe("permissions");
    expect(resolveResourceKeyFromComponentPath("pages/menus")).toBe("menus");
  });

  it("maps owner task management to the tasks resource", () => {
    expect(resolveResourceKeyFromComponentPath("pages/owner/tasks")).toBe("tasks");
    expect(resolveResourceKeyFromComponentPath("pages/owner/templates")).toBe("templates");
  });
});
