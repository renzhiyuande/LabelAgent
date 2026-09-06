import type { AuthenticatedUser } from "../lib/types";

function normalize(permission?: string | string[]): string[] {
  if (!permission) {
    return [];
  }
  return Array.isArray(permission) ? permission : [permission];
}

export function hasPermission(user: AuthenticatedUser | null, permission?: string | string[]): boolean {
  const required = normalize(permission);
  if (required.length === 0) {
    return true;
  }
  if (!user) {
    return false;
  }
  return required.some((item) => user.permissions.includes(item) || user.roles.includes(item));
}
