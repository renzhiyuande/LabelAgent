import type { AccessControlProvider } from "@refinedev/core";
import { getResourceMeta, hasPermission } from "@labelhub/low-code-engine";
import { useAuthStore } from "../stores/auth";

const standardActions = new Set(["list", "show", "create", "edit", "delete"]);

function resolveResourcePermission(resource: string, action: string): string | string[] | undefined {
  const meta = getResourceMeta(resource);
  if (!meta) {
    return undefined;
  }

  if (!standardActions.has(action)) {
    const actionSchema = meta.actions?.find((item) => item.key === action);
    if (actionSchema?.permission) {
      return actionSchema.permission;
    }
  }

  const permissions = meta.permissions;
  const standardPermission = permissions?.[action as "list" | "show" | "create" | "edit" | "delete"];
  if (standardPermission) {
    return standardPermission;
  }

  return meta.permissions?.page;
}

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action, params }) => {
    const user = useAuthStore.getState().currentUser;
    const explicitPermission = params?.permission as string | string[] | undefined;
    const permission = explicitPermission ?? (resource ? resolveResourcePermission(resource, action) : undefined);

    if (!permission) {
      return { can: true };
    }

    return { can: hasPermission(user, permission) };
  },
};
