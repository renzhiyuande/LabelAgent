import type { AuthenticatedUser } from "../types";

function permissionKey(user: AuthenticatedUser): string {
  return [...user.permissions].sort().join("\0");
}

export function isSameAuthenticatedUser(
  previous: AuthenticatedUser | null | undefined,
  next: AuthenticatedUser,
): boolean {
  if (!previous) {
    return false;
  }
  return (
    previous.userId === next.userId &&
    previous.username === next.username &&
    previous.displayName === next.displayName &&
    permissionKey(previous) === permissionKey(next) &&
    previous.roles.length === next.roles.length &&
    previous.roles.every((role, index) => role === next.roles[index])
  );
}
