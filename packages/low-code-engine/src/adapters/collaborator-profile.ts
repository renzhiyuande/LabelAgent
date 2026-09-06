import { request } from "./lowcode-utils";

export interface CollaboratorProfile {
  userId: number | string;
  username: string;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  roleCodes: string[];
  roleNames: string[];
}

const profileCache = new Map<string, Promise<CollaboratorProfile | null>>();

function buildCacheKey(userId: string | number, role?: string) {
  return `${userId}:${role ?? ""}`;
}

export function clearCollaboratorProfileCache() {
  profileCache.clear();
}

export async function fetchCollaboratorProfile(
  userId: string | number,
  role?: string,
): Promise<CollaboratorProfile | null> {
  const normalizedId = String(userId).trim();
  if (!normalizedId) {
    return null;
  }
  const cacheKey = buildCacheKey(normalizedId, role);
  const cached = profileCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const params = new URLSearchParams();
  if (role) {
    params.set("role", role);
  }
  const query = params.toString();
  const promise = request<CollaboratorProfile>(
    `/api/v1/business/collaborators/${encodeURIComponent(normalizedId)}${query ? `?${query}` : ""}`,
  )
    .then((profile) => profile ?? null)
    .catch(() => null);
  profileCache.set(cacheKey, promise);
  return promise;
}
