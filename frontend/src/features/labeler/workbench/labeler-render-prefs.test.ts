import { describe, expect, it } from "vitest";
import type { FormSchema } from "@/low-code/schema/types";
import { withImportFieldMeta } from "@/low-code/schema/import-field-meta";
import {
  buildDefaultSectionWidgetConfigs,
  createDefaultLabelerRenderPrefs,
  ensureSectionWidgetConfigs,
} from "./labeler-render-prefs";
import { buildSectionWidgetId, inferSectionSurface } from "./labeler-section-widget";
import { buildDefaultSectionWidgetOrders } from "./labeler-section-widget-orders";

describe("labeler-render-prefs v2", () => {
  const schema: FormSchema = {
    sections: [
      {
        key: "instructions",
        title: "标注说明",
        fields: [
          {
            key: "hint",
            label: "说明",
            component: "showItem",
            showItem: { contentSource: "static", staticContent: "请先阅读" },
          },
        ],
      },
      {
        key: "labeling",
        title: "偏好判断",
        fields: [
          withImportFieldMeta(
            { key: "preferred", path: "preferred", label: "偏好", component: "radioGroup" },
            "input",
          ),
        ],
      },
    ],
    actions: [],
  };

  it("defaults to classic layout", () => {
    expect(createDefaultLabelerRenderPrefs().layoutMode).toBe("classic");
  });

  it("defaults to flush chrome", () => {
    expect(createDefaultLabelerRenderPrefs().chrome).toBe("flush");
  });

  it("builds section widget configs for each section", () => {
    const configs = buildDefaultSectionWidgetConfigs(schema);
    expect(Object.keys(configs)).toEqual(["instructions", "labeling"]);
    expect(configs.instructions?.surface).toBe("auto");
  });

  it("creates one widget per section with default board by surface", () => {
    const prefs = {
      ...createDefaultLabelerRenderPrefs(),
      layoutMode: "sectionWidgets" as const,
      sectionWidgets: ensureSectionWidgetConfigs(schema),
    };
    const orders = buildDefaultSectionWidgetOrders(schema, prefs);
    expect(orders.payload).toContain(buildSectionWidgetId("instructions"));
    expect(orders.annotate).toContain(buildSectionWidgetId("labeling"));
    expect(orders.annotate).toContain("annotate-actions");
  });

  it("infers annotate surface for input-heavy sections", () => {
    const section = schema.sections[1]!;
    expect(inferSectionSurface(section)).toBe("annotate");
  });
});
