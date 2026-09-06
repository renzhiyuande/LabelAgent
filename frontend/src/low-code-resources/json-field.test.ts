import { describe, expect, it } from "vitest";
import { asJsonObject } from "@/low-code-resources/json-field";

describe("asJsonObject", () => {
  it("parses jsonEditor string payload", () => {
    expect(asJsonObject("{}")).toEqual({});
    expect(asJsonObject('{"timeout":30}')).toEqual({ timeout: 30 });
  });

  it("keeps object payload", () => {
    expect(asJsonObject({ retry: 3 })).toEqual({ retry: 3 });
  });

  it("returns empty object for blank values", () => {
    expect(asJsonObject(null)).toEqual({});
    expect(asJsonObject("")).toEqual({});
  });
});
