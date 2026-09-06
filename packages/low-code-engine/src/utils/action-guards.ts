import type { AuthenticatedUser } from "../lib/types";

export function isActionBlockedForRecord(
  resourceKey: string,
  actionKey: string,
  record: Record<string, unknown>,
  currentUser: AuthenticatedUser | null,
  idKey = "id",
): boolean {
  if (!currentUser) {
    return false;
  }

  if (resourceKey === "users") {
    const recordId = Number(record[idKey]);
    if (recordId === currentUser.userId && (actionKey === "disable" || actionKey === "assignRoles")) {
      return true;
    }
  }

  if (resourceKey === "roles" && record.roleCode === "ADMIN" && actionKey === "disable") {
    return true;
  }

  if (resourceKey === "permissions" && record.permissionCode === "system:admin" && actionKey === "disable") {
    return true;
  }

  return false;
}
