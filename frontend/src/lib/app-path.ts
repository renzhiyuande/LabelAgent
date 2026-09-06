/** Vite base path, e.g. `/` locally or `/admin/` in production deploy. */
export function appBasePath(): string {
  const base = import.meta.env.BASE_URL || "/";
  if (base === "/") {
    return "";
  }
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

/** Join app base path with an in-app route like `/login` or `login`. */
export function resolveAppPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = appBasePath();
  return `${base}${normalized}`.replace(/\/{2,}/g, "/");
}
