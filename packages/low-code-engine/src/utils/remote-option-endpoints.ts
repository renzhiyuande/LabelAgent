/** 走 /api/v1/business/options 的远程数据源（与 BusinessOptionProvider 对齐） */
export const BUSINESS_OPTION_SOURCES = new Set([
  "collaborators",
  "assignableTaskItems",
]);

export function isBusinessOptionSource(source: string): boolean {
  return BUSINESS_OPTION_SOURCES.has(source);
}

export function resolveDefaultRemoteOptionPath(source: string): string {
  if (isBusinessOptionSource(source)) {
    return `/api/v1/business/options/${source}`;
  }
  return `/api/v1/engine/options/${source}`;
}
