export function getValueAtPath(source: Record<string, unknown>, path: string): unknown {
  return path
    .split(".")
    .filter(Boolean)
    .reduce<unknown>((current, segment) => {
      if (Array.isArray(current)) {
        const index = Number(segment);
        return Number.isNaN(index) ? undefined : current[index];
      }
      if (current == null || typeof current !== "object") {
        return undefined;
      }
      return (current as Record<string, unknown>)[segment];
    }, source);
}

export function setValueAtPath(source: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const segments = path.split(".").filter(Boolean);
  if (segments.length === 0) {
    return source;
  }

  const next = { ...source };
  let current: Record<string, unknown> | unknown[] = next;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    const nextSegment = segments[index + 1];
    const targetIsArray = !Number.isNaN(Number(nextSegment));
    const existing: unknown = Array.isArray(current)
      ? current[Number(segment)]
      : current[segment];
    const nested: Record<string, unknown> | unknown[] = Array.isArray(existing)
      ? [...existing]
      : existing && typeof existing === "object"
        ? { ...(existing as Record<string, unknown>) }
        : targetIsArray
          ? []
          : {};

    if (Array.isArray(current)) {
      current[Number(segment)] = nested;
    } else {
      current[segment] = nested;
    }
    current = nested;
  }

  const finalSegment = segments[segments.length - 1];
  if (Array.isArray(current)) {
    current[Number(finalSegment)] = value;
  } else {
    current[finalSegment] = value;
  }
  return next;
}
