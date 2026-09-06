import { describe, expect, it } from "vitest";
import type { FormFieldSchema } from "@/low-code/schema/types";
import {
  clampDisplayPreviewHeight,
  readDisplayPreviewHeight,
} from "./display-preview-height";

describe("display-preview-height", () => {
  it("clamps showItem max height", () => {
    expect(clampDisplayPreviewHeight("showItem", 32)).toBe(64);
    expect(clampDisplayPreviewHeight("showItem", 800)).toBe(800);
    expect(clampDisplayPreviewHeight("showItem", 4000)).toBe(2400);
  });

  it("reads showItem maxHeight from schema", () => {
    const field: FormFieldSchema = {
      key: "title",
      label: "标题",
      component: "showItem",
      showItem: { contentSource: "payload", maxHeight: 240 },
    };
    expect(readDisplayPreviewHeight(field)).toBe(240);
  });
});
