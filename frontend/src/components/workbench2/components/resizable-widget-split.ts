const MIN_FRACTION = 0.12;

export function equalSplitSizes(count: number): number[] {
  if (count <= 0) {
    return [];
  }
  return Array.from({ length: count }, () => 1 / count);
}

export function normalizeSplitSizes(sizes: number[], count: number): number[] {
  if (count <= 0) {
    return [];
  }
  if (sizes.length !== count) {
    return equalSplitSizes(count);
  }
  const sanitized = sizes.map((size) => (Number.isFinite(size) && size > 0 ? size : 0));
  const total = sanitized.reduce((sum, size) => sum + size, 0);
  if (total <= 0) {
    return equalSplitSizes(count);
  }
  return sanitized.map((size) => size / total);
}

export function reorderSplitSizes(prevOrder: string[], sizes: number[], nextOrder: string[]): number[] {
  const normalized = normalizeSplitSizes(sizes, prevOrder.length);
  if (nextOrder.length === 0) {
    return [];
  }
  return normalizeSplitSizes(
    nextOrder.map((id) => {
      const index = prevOrder.indexOf(id);
      return index >= 0 ? normalized[index] : 1 / nextOrder.length;
    }),
    nextOrder.length,
  );
}

export function resizeSplitSizes(sizes: number[], handleIndex: number, deltaFraction: number): number[] {
  if (handleIndex < 0 || handleIndex >= sizes.length - 1) {
    return sizes;
  }
  const next = [...sizes];
  const left = next[handleIndex];
  const right = next[handleIndex + 1];
  const pairTotal = left + right;
  let nextLeft = left + deltaFraction;
  nextLeft = Math.max(MIN_FRACTION, Math.min(pairTotal - MIN_FRACTION, nextLeft));
  next[handleIndex] = nextLeft;
  next[handleIndex + 1] = pairTotal - nextLeft;
  return normalizeSplitSizes(next, next.length);
}
