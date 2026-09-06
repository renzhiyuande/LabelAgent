import { beforeEach, describe, expect, it } from "vitest";
import { useLocale } from "./locale";
import { resolveErrorMessage } from "./resolve-error-message";

describe("resolveErrorMessage", () => {
  beforeEach(() => {
    useLocale.setState({ locale: "zh" });
  });

  it("returns zh mapping when locale is zh", () => {
    expect(
      resolveErrorMessage({
        code: "RVW_007",
        message: "No historical review cases are available for prompt optimization on this template version. Please accumulate runtime data first.",
      }),
    ).toBe("同模板下尚无已发布版本的人工复核样本。请先发布模板、运行任务，并完成带评语的人工审核后再试");
  });

  it("returns en mapping when locale is en", () => {
    useLocale.setState({ locale: "en" });
    expect(
      resolveErrorMessage({
        code: "RVW_007",
        message: "legacy backend message",
      }),
    ).toBe(
      "No reviewed submissions with AI and human comments are available under published versions of this template. Publish the template, run the task, and complete manual reviews first.",
    );
  });
});
