import { describe, expect, it, vi } from "vitest";
import { isValidElement } from "react";
import { renderDetailFieldValue } from "./detail-field-display";

describe("renderDetailFieldValue", () => {
  it("renders detail href link when placeholders resolve", () => {
    const onNavigate = vi.fn();
    const rendered = renderDetailFieldValue(
      {
        key: "currentTemplateVersionId",
        type: "link",
        link: {
          href: "/system/template-designer?templateId={templateId}&versionId={currentTemplateVersionId}",
        },
      },
      "2064198814764089346",
      undefined,
      {},
      undefined,
      undefined,
      {
        templateId: "1001",
        currentTemplateVersionId: "2064198814764089346",
      },
      { onNavigate },
    );
    expect(isValidElement(rendered)).toBe(true);
    if (isValidElement(rendered)) {
      rendered.props.onClick({ stopPropagation: () => undefined });
      expect(onNavigate).toHaveBeenCalledWith(
        "/system/template-designer?templateId=1001&versionId=2064198814764089346",
        undefined,
      );
    }
  });

  it("renders detail static options label", () => {
    const rendered = renderDetailFieldValue(
      {
        key: "installed",
        type: "enum",
        enum: [
          { value: true, label: "已安装" },
          { value: false, label: "未安装" },
        ],
      },
      true,
      undefined,
      {},
    );
    expect(isValidElement(rendered)).toBe(true);
    if (isValidElement(rendered)) {
      expect(rendered.props.children).toBe("已安装");
    }
  });
});
