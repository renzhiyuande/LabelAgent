/**
 * 将响应 JSON 中 16 位及以上的整数 token 先引号再 parse，避免 JS Number 精度丢失。
 * 与后端 Long → String 序列化配合；兜底旧接口或未加引号的数字字段。
 */
const LARGE_INT_JSON_TOKEN = /(?<=[:,\[]\s*)(-?\d{16,})(?=\s*[,}\]])/g;

export function parseJsonPreservingSnowflakeIds(text: string): unknown {
  if (!text) {
    return null;
  }
  const sanitized = text.replace(LARGE_INT_JSON_TOKEN, '"$1"');
  return JSON.parse(sanitized);
}
