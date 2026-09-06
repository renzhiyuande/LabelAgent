import { describe, expect, it } from "vitest";
import { flattenSelectableTreeOptions } from "./tree-options";

describe("flattenSelectableTreeOptions", () => {
  it("keeps template group visible but disabled, with selectable version leaves", () => {
    const flat = flattenSelectableTreeOptions([
      {
        label: "偏好对比 (TPL_A · GENERAL)",
        value: "tpl:10",
        children: [
          { label: "v2 · 已发布", value: "501" },
          { label: "v1 · 草稿", value: "502" },
        ],
      },
    ]);

    expect(flat).toHaveLength(3);
    expect(flat[0]).toMatchObject({
      label: "偏好对比 (TPL_A · GENERAL)",
      disabled: true,
      depth: 0,
    });
    expect(flat[1]).toMatchObject({
      label: "v2 · 已发布",
      displayLabel: "偏好对比 (TPL_A · GENERAL) / v2 · 已发布",
      disabled: false,
      depth: 1,
    });
    expect(flat[2]).toMatchObject({
      disabled: false,
      depth: 1,
    });
  });
});
