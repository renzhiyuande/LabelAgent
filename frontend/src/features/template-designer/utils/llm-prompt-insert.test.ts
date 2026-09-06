import { describe, expect, it } from "vitest";
import { formatLlmTemplateVariable, insertTextAtCursor } from "./llm-prompt-insert";

describe("llm-prompt-insert", () => {
  it("inserts at cursor", () => {
    expect(insertTextAtCursor("hello world", 5, 5, "{{taskId}}")).toEqual({
      text: "hello{{taskId}} world",
      cursor: 5 + "{{taskId}}".length,
    });
  });

  it("replaces selection", () => {
    expect(insertTextAtCursor("abcdef", 1, 3, "{{x}}")).toEqual({
      text: "a{{x}}def",
      cursor: 1 + "{{x}}".length,
    });
  });

  it("formats variable token", () => {
    expect(formatLlmTemplateVariable("result.preferred")).toBe("{{result.preferred}}");
  });
});
