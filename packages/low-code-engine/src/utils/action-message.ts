export function interpolateActionMessage(
  template: string | undefined,
  record?: Record<string, unknown>,
): string | undefined {
  return template?.replace(/\{(\w+)\}/g, (_, key: string) => String(record?.[key] ?? ""));
}

export function resolveActionSuccessMessage(
  action: { label: string; successMessage?: string },
  record: Record<string, unknown>,
  response?: Record<string, unknown> | void,
): string {
  const merged = { ...record, ...(response ?? {}) };
  const interpolated = interpolateActionMessage(action.successMessage, merged);
  return interpolated && interpolated.trim() ? interpolated : `${action.label}成功`;
}
