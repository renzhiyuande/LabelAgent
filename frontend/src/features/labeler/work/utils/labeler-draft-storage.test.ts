import { afterEach, describe, expect, it } from "vitest";
import {
  LABELER_DRAFT_STORAGE_KEY,
  loadPersistedLabelerDrafts,
  parseLocalDraftEntry,
  persistLabelerDrafts,
} from "./labeler-draft-storage";

describe("labeler-draft-storage", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("parses legacy bare values format", () => {
    const entry = parseLocalDraftEntry({ label_text: "hello" });
    expect(entry?.values).toEqual({ label_text: "hello" });
    expect(entry?.updatedAt).toBe(new Date(0).toISOString());
  });

  it("parses versioned entry format", () => {
    const entry = parseLocalDraftEntry({
      values: { label_text: "hello" },
      updatedAt: "2026-06-09T10:00:00.000Z",
    });
    expect(entry).toEqual({
      values: { label_text: "hello" },
      updatedAt: "2026-06-09T10:00:00.000Z",
    });
  });

  it("loads and persists drafts with metadata", () => {
    persistLabelerDrafts({
      "42": {
        values: { label_text: "offline" },
        updatedAt: "2026-06-09T11:00:00.000Z",
      },
    });

    expect(localStorage.getItem(LABELER_DRAFT_STORAGE_KEY)).toContain("updatedAt");
    expect(loadPersistedLabelerDrafts()["42"]).toEqual({
      values: { label_text: "offline" },
      updatedAt: "2026-06-09T11:00:00.000Z",
    });
  });
});
