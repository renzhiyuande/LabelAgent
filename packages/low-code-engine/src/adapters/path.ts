export function applyPathParams(path: string, params: Record<string, string | number>): string {
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, encodeURIComponent(String(value))),
    path,
  );
}

/** 将行记录中的标量字段展开为路径参数，并保证 {id} 与 idKey 对齐 */
/** 将标量表单/Prompt 值展开为 URL 占位参数 */
export function buildParamsFromValues(values: Record<string, unknown>): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value == null || value === "") {
      continue;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      params[key] = typeof value === "boolean" ? String(value) : value;
    }
  }
  return params;
}

export function buildPathParamsFromRecord(
  record: Record<string, unknown>,
  idKey: string,
): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  const primaryId = record[idKey];
  if (primaryId != null && primaryId !== "") {
    params.id = primaryId as string | number;
  }
  for (const [key, value] of Object.entries(record)) {
    if (value == null || value === "") {
      continue;
    }
    if (typeof value === "string" || typeof value === "number") {
      params[key] = value;
    }
  }
  return params;
}
