import { describe, expect, it } from "vitest";
import {
  CONTENT_HASH_SOURCE_KEY,
  detectDefaultSourceKeyField,
  requiresExplicitSourceKeySelection,
} from "./import-source-key";

describe("import-source-key", () => {
  it("detects id column case-insensitively by priority", () => {
    expect(detectDefaultSourceKeyField([{ id: "A1", prompt: "x" }])).toBe("id");
    expect(detectDefaultSourceKeyField([{ ID: "B2" }])).toBe("ID");
  });

  it("requires manual selection when no default column", () => {
    const items = [{ prompt: "only text" }];
    expect(detectDefaultSourceKeyField(items)).toBeNull();
    expect(requiresExplicitSourceKeySelection(items)).toBe(true);
  });

  it("exports content hash sentinel", () => {
    expect(CONTENT_HASH_SOURCE_KEY).toBe("__content_hash__");
  });
});
