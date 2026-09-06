import { describe, expect, it } from "vitest";
import type { FormSchema } from "../../schema/types";
import { buildLlmSuggestUserPrompt } from "./llm-suggest-context";

const displaySchema: FormSchema = {
  title: "题面",
  actions: [],
  sections: [
    {
      key: "payload",
      title: "题目",
      fields: [
        {
          key: "prompt",
          path: "prompt",
          label: "用户输入",
          component: "showItem",
          showItem: { contentSource: "payload" },
          readonly: true,
        },
        {
          key: "responseA",
          path: "response_a",
          label: "回答 A",
          component: "showItem",
          showItem: { contentSource: "payload" },
          readonly: true,
        },
      ],
    },
  ],
};

describe("buildLlmSuggestUserPrompt", () => {
  it("auto-appends display payload block when template has no variables", () => {
    const { prompt, contextFields } = buildLlmSuggestUserPrompt({
      promptTemplate: "请比较回答 A 与 B，给出更优项、理由和安全风险提示。",
      itemPayload: {
        prompt: "写一首关于春天的诗",
        response_a: "春风拂面……",
      },
      displaySchema,
      formValues: { "result.preferred": "A" },
    });

    expect(prompt).toContain("【题面数据】");
    expect(prompt).toContain("用户输入：写一首关于春天的诗");
    expect(prompt).toContain("回答 A：春风拂面……");
    expect(contextFields).toEqual(["prompt", "response_a"]);
  });

  it("replaces template variables inline without duplicating block", () => {
    const { prompt } = buildLlmSuggestUserPrompt({
      promptTemplate: "题面：{{prompt}}，A：{{response_a}}",
      itemPayload: {
        prompt: "题目文本",
        response_a: "答案 A",
      },
      displaySchema,
    });

    expect(prompt).toBe("题面：题目文本，A：答案 A");
    expect(prompt).not.toContain("【题面数据】");
  it("keeps payload display values when draft contains empty display keys", () => {
    const { prompt } = buildLlmSuggestUserPrompt({
      promptTemplate: "请比较回答 A 与 B。",
      itemPayload: {
        prompt: "题目文本",
        response_a: "答案 A",
      },
      displaySchema,
      formValues: {
        prompt: "",
        response_a: "",
        "result.preferred": "A",
      },
    });

    expect(prompt).toContain("用户输入：题目文本");
    expect(prompt).toContain("回答 A：答案 A");
  });
});
