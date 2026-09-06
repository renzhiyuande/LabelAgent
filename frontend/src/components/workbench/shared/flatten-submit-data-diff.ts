export interface FlatSubmissionFieldDiff {
  path: string;
  changeType: "CHANGED" | "ADDED" | "REMOVED";
  oldValue?: unknown;
  newValue?: unknown;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (left === right) {
    return true;
  }
  if (left == null || right == null) {
    return false;
  }
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function shouldSkipDiffPath(path: string): boolean {
  return path === "runtime" || path.startsWith("runtime.");
}

function compareValues(prev: unknown, cur: unknown, path: string, out: FlatSubmissionFieldDiff[]) {
  if (deepEqual(prev, cur)) {
    return;
  }

  if (isPlainObject(prev) && isPlainObject(cur)) {
    const keys = new Set([...Object.keys(prev), ...Object.keys(cur)]);
    for (const key of keys) {
      const nextPath = path ? `${path}.${key}` : key;
      compareValues(prev[key], cur[key], nextPath, out);
    }
    return;
  }

  if (prev === undefined) {
    if (isPlainObject(cur)) {
      for (const [key, value] of Object.entries(cur)) {
        const nextPath = path ? `${path}.${key}` : key;
        compareValues(undefined, value, nextPath, out);
      }
      return;
    }
    out.push({ path, changeType: "ADDED", newValue: cur });
    return;
  }

  if (cur === undefined) {
    if (isPlainObject(prev)) {
      for (const [key, value] of Object.entries(prev)) {
        const nextPath = path ? `${path}.${key}` : key;
        compareValues(value, undefined, nextPath, out);
      }
      return;
    }
    out.push({ path, changeType: "REMOVED", oldValue: prev });
    return;
  }

  out.push({ path, changeType: "CHANGED", oldValue: prev, newValue: cur });
}

/** 将上一轮与当前轮 submitData 展开为字段级差异（对齐模板 path，如 result.preferred） */
export function flattenSubmitDataDiff(
  previous?: Record<string, unknown> | null,
  current?: Record<string, unknown> | null,
): FlatSubmissionFieldDiff[] {
  const diffs: FlatSubmissionFieldDiff[] = [];
  compareValues(previous ?? {}, current ?? {}, "", diffs);
  return diffs.filter((diff) => diff.path && !shouldSkipDiffPath(diff.path));
}
