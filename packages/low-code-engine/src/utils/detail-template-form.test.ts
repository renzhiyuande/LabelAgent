import { describe, expect, it } from "vitest";
import { cloneReadonlyFormSchema } from "./detail-template-form";
import type { FormSchema } from "../schema/types";

describe("cloneReadonlyFormSchema", () => {
  it("converts upload fields to show components for readonly detail forms", () => {
    const schema: FormSchema = {
      sections: [
        {
          key: "main",
          fields: [
            { key: "evidence", label: "证据素材", component: "fileUpload" },
            { key: "photo", label: "配图", component: "imageUpload", upload: { multiple: true } },
            { key: "note", label: "备注", component: "textarea" },
          ],
        },
      ],
    };

    const readonly = cloneReadonlyFormSchema(schema);
    const fields = readonly.sections[0]?.fields ?? [];

    expect(fields[0]).toMatchObject({
      key: "evidence",
      readonly: true,
      component: "showFile",
      showFile: { contentSource: "payload", showSize: true },
    });
    expect(fields[1]).toMatchObject({
      key: "photo",
      readonly: true,
      component: "showImage",
      showImage: { contentSource: "payload", multiple: true, showFileName: true },
    });
    expect(fields[2]).toMatchObject({ key: "note", readonly: true, component: "textarea" });
  });
});
