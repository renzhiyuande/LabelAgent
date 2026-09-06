import { describe, expect, it } from "vitest";
import { parseJsonText, validateJsonFieldValue, valueToJsonText } from "./json-field-utils";

describe("json-field-utils", () => {
  it("formats objects as pretty JSON", () => {
    expect(valueToJsonText({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  it("reformats valid JSON strings", () => {
    expect(valueToJsonText('{"b":2}')).toBe('{\n  "b": 2\n}');
  });

  it("keeps invalid JSON strings as-is for editing", () => {
    expect(valueToJsonText("{bad")).toBe("{bad");
  });

  it("parses valid JSON", () => {
    const result = parseJsonText('{"x":1}');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ x: 1 });
    }
  });

  it("rejects invalid JSON", () => {
    const result = parseJsonText("{");
    expect(result.ok).toBe(false);
  });

  it("validates field values", () => {
    expect(validateJsonFieldValue({ ok: true })).toBeNull();
    expect(validateJsonFieldValue('{"ok":true}')).toBeNull();
    expect(validateJsonFieldValue("{")).toMatch(/JSON 格式无效/);
  });
});
