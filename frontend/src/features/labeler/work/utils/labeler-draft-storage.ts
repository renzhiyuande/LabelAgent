export const LABELER_DRAFT_STORAGE_KEY = "labelhub.draftValues";

export interface LabelerLocalDraftEntry {
  values: Record<string, unknown>;
  updatedAt: string;
}

export type LabelerLocalDraftStore = Record<string, LabelerLocalDraftEntry>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

/** 兼容旧版仅存 values 对象的格式 */
export function parseLocalDraftEntry(raw: unknown): LabelerLocalDraftEntry | null {
  if (!isPlainObject(raw)) {
    return null;
  }
  if (isPlainObject(raw.values)) {
    return {
      values: raw.values,
      updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date(0).toISOString(),
    };
  }
  return {
    values: raw,
    updatedAt: new Date(0).toISOString(),
  };
}

export function loadPersistedLabelerDrafts(): LabelerLocalDraftStore {
  try {
    const raw = localStorage.getItem(LABELER_DRAFT_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!isPlainObject(parsed)) {
      return {};
    }
    const drafts: LabelerLocalDraftStore = {};
    for (const [assignmentId, entry] of Object.entries(parsed)) {
      const normalized = parseLocalDraftEntry(entry);
      if (normalized) {
        drafts[assignmentId] = normalized;
      }
    }
    return drafts;
  } catch {
    return {};
  }
}

export function persistLabelerDrafts(drafts: LabelerLocalDraftStore): void {
  try {
    localStorage.setItem(LABELER_DRAFT_STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    /* quota exceeded — non-critical */
  }
}

export function createLocalDraftEntry(
  values: Record<string, unknown>,
  updatedAt = new Date().toISOString(),
): LabelerLocalDraftEntry {
  return { values, updatedAt };
}
