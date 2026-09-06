import { describe, expect, it } from "vitest";
import { formatFieldValue, formatJsonForDisplay, formatPayloadPreview } from "./formatters";

describe("formatJsonForDisplay", () => {
  it("pretty-prints JSON strings without double escaping", () => {
    const raw = '{"prompt":"你好","lang":"zh"}';
    expect(formatJsonForDisplay(raw)).toBe('{\n  "prompt": "你好",\n  "lang": "zh"\n}');
  });

  it("pretty-prints objects", () => {
    expect(formatJsonForDisplay({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  it("returns invalid JSON strings as-is", () => {
    expect(formatJsonForDisplay("{bad")).toBe("{bad");
  });
});

describe("formatPayloadPreview", () => {
  it("renders compact key-value pairs for task item payload previews", () => {
    expect(formatPayloadPreview({ prompt: "你好", lang: "zh", score: 0.9 })).toBe(
      "prompt: 你好 · lang: zh · score: 0.9",
    );
  });
});

describe("formatFieldValue", () => {
  it("resolves arrayTable column enum labels", () => {
    expect(
      formatFieldValue(
        {
          type: "enum",
          enum: [
            { label: "启用", value: 1 },
            { label: "停用", value: 0 },
          ],
        },
        1,
      ),
    ).toBe("启用");
  });

  it("formats boolean via formatter on detail fields", () => {
    expect(formatFieldValue({ formatter: "boolean" }, true)).toBe("是");
  });

  it("formats version numbers with a v prefix", () => {
    expect(formatFieldValue({ formatter: "versionNo" }, 3)).toBe("v3");
    expect(formatFieldValue({ formatter: "versionNo" }, 0)).toBe("-");
  });
});
