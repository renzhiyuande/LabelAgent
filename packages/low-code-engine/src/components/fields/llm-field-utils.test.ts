import { describe, expect, it } from "vitest";
import {
  DEFAULT_LLM_SUGGEST_PROMPT_TEMPLATE,
  DEFAULT_LLM_SUGGEST_SYSTEM_PROMPT,
} from "../../constants/llm-suggest-defaults";
import {
  extractLlmTemplateVariablePaths,
  renderLlmPromptTemplate,
  resolveLlmContextFields,
  resolveLlmFieldConfig,
} from "./llm-field-utils";

describe("resolveLlmFieldConfig", () => {
  it("applies defaults for missing llm meta", () => {
    expect(resolveLlmFieldConfig()).toMatchObject({
      systemPrompt: DEFAULT_LLM_SUGGEST_SYSTEM_PROMPT,
      promptTemplate: DEFAULT_LLM_SUGGEST_PROMPT_TEMPLATE,
      buttonLabel: "获取建议",
      allowRegenerate: true,
      contextFields: [],
    });
  });
});

describe("extractLlmTemplateVariablePaths", () => {
  it("collects unique paths from templates", () => {
    expect(
      extractLlmTemplateVariablePaths(
        "参考 {{result.preferred}}",
        "备注 {{result.annotator_note}} 与 {{result.preferred}}",
      ),
    ).toEqual(["result.preferred", "result.annotator_note"]);
  });
});

describe("resolveLlmContextFields", () => {
  it("prefers paths from prompt templates over legacy contextFields", () => {
    expect(
      resolveLlmContextFields({
        promptTemplate: "字段 {{taskId}}",
        contextFields: ["legacyOnly"],
      }),
    ).toEqual(["taskId"]);
  });

  it("falls back to legacy contextFields when template has no variables", () => {
    expect(
      resolveLlmContextFields({
        contextFields: ["field_1"],
      }),
    ).toEqual(["field_1"]);
  });
});

describe("renderLlmPromptTemplate", () => {
  it("replaces path placeholders with context values", () => {
    expect(
      renderLlmPromptTemplate("题目：{{title}}，备注：{{field_2}}", {
        title: "示例",
        field_2: "hello",
      }),
    ).toBe("题目：示例，备注：hello");
  });
});
