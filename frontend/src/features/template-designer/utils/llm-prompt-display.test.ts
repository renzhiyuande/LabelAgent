import { describe, expect, it } from "vitest";
import {
  displayUserPromptToStored,
  formatLlmDisplayVariable,
  storedUserPromptToDisplay,
} from "./llm-prompt-display";

const fieldOptions = [
  { value: "result.preferred", label: "偏好结论 (result.preferred)" },
  { value: "result.rewrite_suggestion", label: "改写 / 修订建议 (result.rewrite_suggestion)" },
];

describe("llm-prompt-display", () => {
  it("converts stored path tokens to display labels and back", () => {
    const stored = "请结合 {{result.preferred}} 与 {{result.rewrite_suggestion}} 给出建议。";
    const display = storedUserPromptToDisplay(stored, fieldOptions);
    expect(display).toContain(formatLlmDisplayVariable("偏好结论"));
    expect(display).toContain(formatLlmDisplayVariable("改写 / 修订建议"));
    expect(displayUserPromptToStored(display, fieldOptions)).toBe(stored);
  });
});
