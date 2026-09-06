import { describe, expect, it } from "vitest";
import {
  buildImportTemplateSample,
  resolveDownloadImportContract,
} from "./download-import-template";
import type { TaskImportTemplateContext } from "./import-template-draft";

describe("buildImportTemplateSample", () => {
  it("builds empty sample row from import contract keys", () => {
    expect(
      buildImportTemplateSample({
        requiredKeys: ["prompt", "lang"],
        optionalKeys: ["note"],
      }),
    ).toEqual([{ lang: "", note: "", prompt: "" }]);
  });
});

describe("resolveDownloadImportContract", () => {
  it("falls back to payload keys when import contract is missing", () => {
    const context: TaskImportTemplateContext = {
      hasTemplate: true,
      payloadKeys: ["prompt", "lang"],
      importContract: null,
    };
    expect(resolveDownloadImportContract(context)).toEqual({
      requiredKeys: ["prompt", "lang"],
      optionalKeys: [],
    });
  });
});
