import { describe, expect, it } from "vitest";
import { interpolateActionMessage, resolveActionSuccessMessage } from "./action-message";

describe("action-message", () => {
  it("interpolates placeholders from merged record and response", () => {
    expect(
      resolveActionSuccessMessage(
        {
          label: "安装",
          successMessage: "「{templateName}」已安装，可前往模板中心继续配置（版本 {templateVersionId}）",
        },
        { templateName: "文本分类模板" },
        { templateVersionId: "123" },
      ),
    ).toBe("「文本分类模板」已安装，可前往模板中心继续配置（版本 123）");
  });

  it("falls back to default success label when template is blank", () => {
    expect(
      resolveActionSuccessMessage(
        {
          label: "安装",
          successMessage: "   ",
        },
        { templateName: "文本分类模板" },
      ),
    ).toBe("安装成功");
  });

  it("replaces missing placeholders with empty string", () => {
    expect(interpolateActionMessage("打开 {templateName} - {missing}", { templateName: "模板A" })).toBe("打开 模板A - ");
  });
});
