import { describe, expect, it } from "vitest";
import {
  applyMentionSelection,
  detectMention,
  findVariableTokenRange,
  replaceOrInsertDataBlock,
  replaceOrInsertDimensionBlock,
} from "./review-prompt-editor-utils";
import { REVIEW_PROMPT_DATA_SUFFIX, REVIEW_PROMPT_INTRO } from "./review-prompt-builder";

describe("review-prompt-editor-utils", () => {
  it("replaces existing dimension block instead of appending", () => {
    const template = `${REVIEW_PROMPT_INTRO}
[完整性] {{dimension.完整性.prompt_instruction}}
[准确性] {{dimension.准确性.prompt_instruction}}

${REVIEW_PROMPT_DATA_SUFFIX}`;

    const result = replaceOrInsertDimensionBlock(template, [
      {
        dimensionKey: "A",
        dimensionName: "新维度",
        weight: 100,
        scoreMin: 0,
        scoreMax: 100,
        severityLevel: "MEDIUM",
        sortNo: 1,
        requiredFlag: 1,
      },
    ]);

    expect(result.replaced).toBe(true);
    expect(result.text).toContain("[新维度] {{dimension.新维度.prompt_instruction}}");
    expect(result.text.match(/\[完整性\]/g)).toBeNull();
    expect(result.text.match(/{{original_item_data}}/g)).toHaveLength(1);
  });

  it("replaces existing data block instead of duplicating variables", () => {
    const template = `${REVIEW_PROMPT_INTRO}
[完整性] {{dimension.完整性.prompt_instruction}}

${REVIEW_PROMPT_DATA_SUFFIX}
额外说明`;

    const result = replaceOrInsertDataBlock(template);

    expect(result.replaced).toBe(true);
    expect(result.text.match(/{{original_item_data}}/g)).toHaveLength(1);
    expect(result.text.match(/{{user_submission_data}}/g)).toHaveLength(1);
    expect(result.text).not.toContain("额外说明");
  });

  it("detects @ mention and inserts variable token", () => {
    const value = "请审核 @orig";
    const mention = detectMention(value, value.length);
    expect(mention).toEqual({ start: 4, query: "orig" });

    const applied = applyMentionSelection(value, mention!, value.length, "{{original_item_data}}");
    expect(applied.nextValue).toBe("请审核 {{original_item_data}}");
  });

  it("finds variable token range for atomic delete", () => {
    const value = "数据：{{user_submission_data}}。";
    const tokenStart = value.indexOf("{{");
    expect(findVariableTokenRange(value, tokenStart + 2, "backspace")).toEqual([
      tokenStart,
      tokenStart + "{{user_submission_data}}".length,
    ]);
  });

  it("replaces scattered dimension lines after partial delete", () => {
    const template = `${REVIEW_PROMPT_INTRO}
[完整性] {{dimension.完整性.prompt_instruction}}

[准确性] {{dimension.准确性.prompt_instruction}}
残缺行 {{dimension.格式合规.prompt_instruction}}

${REVIEW_PROMPT_DATA_SUFFIX}`;

    const result = replaceOrInsertDimensionBlock(template, [
      {
        dimensionKey: "A",
        dimensionName: "新维度",
        weight: 100,
        scoreMin: 0,
        scoreMax: 100,
        severityLevel: "MEDIUM",
        sortNo: 1,
        requiredFlag: 1,
      },
    ]);

    expect(result.replaced).toBe(true);
    expect(result.text.match(/\{\{dimension\.[^}]+\.prompt_instruction\}\}/g)).toHaveLength(1);
    expect(result.text).toContain("[新维度]");
  });
});
