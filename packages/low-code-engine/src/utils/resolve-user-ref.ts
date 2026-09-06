import type { UserFieldMeta } from "../schema/types";

export interface ResolvedUserRef {
  userId: string | number | null;
  displayName: string | null;
  role?: string;
}

function defaultIdField(columnKey: string): string {
  if (columnKey.endsWith("Name")) {
    return `${columnKey.slice(0, -4)}Id`;
  }
  if (columnKey.endsWith("DisplayName")) {
    return `${columnKey.slice(0, -11)}Id`;
  }
  return `${columnKey}Id`;
}

function readNonEmptyString(value: unknown): string | null {
  if (value == null || value === "") {
    return null;
  }
  const normalized = typeof value === "string" ? value.trim() : String(value).trim();
  return normalized || null;
}

function candidateNameFields(idField: string, primaryNameField: string): string[] {
  const candidates = [primaryNameField];
  if (idField.endsWith("Id")) {
    const base = idField.slice(0, -2);
    candidates.push(`${base}Name`, `${base}DisplayName`);
  }
  candidates.push("displayName", "userDisplayName", "userName");
  return [...new Set(candidates)];
}

function resolveDisplayName(
  record: Record<string, unknown>,
  nameFields: string[],
): string | null {
  for (const field of nameFields) {
    const value = readNonEmptyString(record[field]);
    if (value) {
      return value;
    }
  }
  return null;
}

export function resolveUserRefFromRecord(
  record: Record<string, unknown>,
  columnKey: string,
  meta?: UserFieldMeta,
): ResolvedUserRef {
  const idField = meta?.idField ?? defaultIdField(columnKey);
  const nameField = meta?.nameField ?? columnKey;
  const rawId = record[idField];
  const userId =
    rawId == null || rawId === ""
      ? null
      : typeof rawId === "number" || typeof rawId === "string"
        ? rawId
        : String(rawId);
  const displayName = resolveDisplayName(record, candidateNameFields(idField, nameField));
  return {
    userId,
    displayName,
    role: meta?.role,
  };
}

function isCjkChar(char: string): boolean {
  return /[\u4e00-\u9fff\u3400-\u4dbf]/u.test(char);
}

export function userRefInitial(displayName: string | null | undefined, username?: string | null): string {
  const source = (displayName ?? username ?? "?").trim();
  if (!source) {
    return "?";
  }
  const chars = Array.from(source);
  if (chars.length === 0) {
    return "?";
  }
  if (isCjkChar(chars[0])) {
    return chars[0];
  }
  const latin = source.replace(/[^A-Za-z0-9]/g, "");
  if (latin.length >= 2) {
    return latin.slice(0, 2).toUpperCase();
  }
  return chars.length >= 2 ? chars.slice(0, 2).join("").toUpperCase() : (chars[0] ?? "?").toUpperCase();
}
