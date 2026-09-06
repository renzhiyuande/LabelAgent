export function formatSchemaDisplayValue(value: unknown): string {
  if (value == null || value === "") {
    return "—";
  }
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}
