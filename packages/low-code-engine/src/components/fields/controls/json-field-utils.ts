export type JsonParseResult =
  | { ok: true; value: unknown; normalized: string }
  | { ok: false; error: string };

/** 将表单值转为可编辑的 JSON 文本（尽量格式化） */
export function valueToJsonText(value: unknown, pretty = true): string {
  if (value == null || value === "") {
    return "";
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return JSON.stringify(parsed, null, pretty ? 2 : 0);
    } catch {
      return value;
    }
  }
  try {
    return JSON.stringify(value, null, pretty ? 2 : 0);
  } catch {
    return String(value);
  }
}

/** 解析用户输入的 JSON 文本 */
export function parseJsonText(text: string): JsonParseResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: true, value: null, normalized: "" };
  }
  try {
    const value = JSON.parse(trimmed) as unknown;
    return { ok: true, value, normalized: JSON.stringify(value, null, 2) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "JSON 格式无效";
    return { ok: false, error: message };
  }
}

export function isJsonFieldComponent(component: string): boolean {
  return component === "jsonEditor" || component === "json";
}

/** 校验 JSON 字段（用于表单提交） */
export function validateJsonFieldValue(value: unknown): string | null {
  if (value == null || value === "") {
    return null;
  }
  if (typeof value === "object") {
    return null;
  }
  if (typeof value === "string") {
    const result = parseJsonText(value);
    return result.ok ? null : `JSON 格式无效：${result.error}`;
  }
  return null;
}

/** 提交前归一化：对象保持原样，字符串解析为对象（可选）或保留格式化字符串 */
export function normalizeJsonFieldValue(
  value: unknown,
  mode: "string" | "value" = "string",
): unknown {
  if (value == null || value === "") {
    return mode === "string" ? null : null;
  }
  if (typeof value === "object") {
    return value;
  }
  if (typeof value !== "string") {
    return value;
  }
  const result = parseJsonText(value);
  if (!result.ok) {
    return value;
  }
  if (result.normalized === "") {
    return null;
  }
  return mode === "string" ? result.normalized : result.value;
}
