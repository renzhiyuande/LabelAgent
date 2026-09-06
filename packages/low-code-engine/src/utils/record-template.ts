export function applyRecordTemplate(
  template: string | undefined,
  record: Record<string, unknown>,
  fallback: string,
): string {
  if (!template) {
    return fallback;
  }
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(record[key] ?? ""));
}

export function canResolveRecordLinkHref(template: string, record: Record<string, unknown>): boolean {
  const keys = [...template.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
  return keys.every((key) => {
    const value = record[key];
    return value != null && value !== "";
  });
}

export function resolveRecordLinkHref(template: string, record: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = record[key];
    return encodeURIComponent(String(value ?? ""));
  });
}
