const SNOWFLAKE_ID_PATTERN = /^\d+$/;

/** 雪花 ID 在 JS 中必须用 string 传递，避免 JSON.parse 后 Number 精度丢失 */
export function normalizeSnowflakeId(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "" || !SNOWFLAKE_ID_PATTERN.test(trimmed)) {
      return undefined;
    }
    return trimmed;
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) {
      console.warn("[normalizeSnowflakeId] ID 超出安全整数范围，已拒绝:", value);
      return undefined;
    }
    const asString = String(value);
    return SNOWFLAKE_ID_PATTERN.test(asString) ? asString : undefined;
  }
  const asString = String(value).trim();
  return SNOWFLAKE_ID_PATTERN.test(asString) ? asString : undefined;
}

/** 批量提交体中的雪花 ID 列表（全部为 string） */
export function normalizeSnowflakeIdList(values: unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const id = normalizeSnowflakeId(raw);
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    result.push(id);
  }
  return result;
}

export function requireSnowflakeId(value: unknown, fieldName: string): string {
  const id = normalizeSnowflakeId(value);
  if (!id) {
    throw new Error(`${fieldName} 无效：雪花 ID 必须以字符串传递且不能超出 JS 安全整数范围`);
  }
  return id;
}
