import { describe, expect, it } from "vitest";
import type { FormSchema } from "@/low-code/schema/types";
import { withImportFieldMeta } from "@/low-code/schema/import-field-meta";
import { splitLabelerFormSchemaBySection } from "./split-labeler-schema-by-section";

describe("splitLabelerFormSchemaBySection", () => {
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
            showItem: { contentSource: "static", staticContent: "规则" },
          },
        ],
      },
      {
        key: "labeling",
        title: "作答",
        fields: [
          withImportFieldMeta(
            { key: "preferred", path: "preferred", label: "偏好", component: "radioGroup" },
            "input",
          ),
        ],
      },
    ],
    actions: [{ key: "submit", label: "提交" }],
  };

  it("keeps full section fields without role filtering", () => {
    const { displaySchema, annotateSchema } = splitLabelerFormSchemaBySection(schema, {
      instructions: "payload",
      labeling: "annotate",
    });

    expect(displaySchema.sections).toHaveLength(1);
    expect(displaySchema.sections[0]?.key).toBe("instructions");
    expect(displaySchema.sections[0]?.fields).toHaveLength(1);

    expect(annotateSchema.sections.some((section) => section.key === "labeling")).toBe(true);
    expect(annotateSchema.actions).toHaveLength(1);
  });
});
