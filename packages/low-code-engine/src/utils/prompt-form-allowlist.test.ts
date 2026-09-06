import { describe, expect, it } from "vitest";
import { assertPromptFormSchema, PROMPT_MAX_FIELDS } from "./prompt-form-allowlist";
import type { PromptFormSchema } from "../schema/types";

describe("prompt-form-allowlist", () => {
  const baseSchema: PromptFormSchema = {
    title: "测试",
    fields: [{ key: "name", label: "名称", component: "text" }],
  };

  it("accepts up to three allowed fields", () => {
    expect(() =>
      assertPromptFormSchema({
        ...baseSchema,
        fields: [
          { key: "a", label: "A", component: "text" },
          { key: "b", label: "B", component: "number" },
          { key: "c", label: "C", component: "select", options: [] },
        ],
      }),
    ).not.toThrow();
  });

  it("rejects more than max fields", () => {
    expect(() =>
      assertPromptFormSchema({
        ...baseSchema,
        fields: Array.from({ length: PROMPT_MAX_FIELDS + 1 }, (_, index) => ({
          key: `f${index}`,
          label: `F${index}`,
          component: "text",
        })),
      }),
    ).toThrow(/最多支持/);
  });

  it("rejects textarea", () => {
    expect(() =>
      assertPromptFormSchema({
        ...baseSchema,
        fields: [{ key: "note", label: "备注", component: "textarea" }],
      }),
    ).toThrow(/不支持组件/);
  });

  it("rejects nested fields", () => {
    expect(() =>
      assertPromptFormSchema({
        ...baseSchema,
        fields: [
          {
            key: "items",
            label: "项",
            component: "text",
            fields: [{ key: "child", label: "子", component: "text" }],
          },
        ],
      }),
    ).toThrow(/不支持的嵌套/);
  });
});
