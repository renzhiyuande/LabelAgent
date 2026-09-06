import { describe, expect, it } from "vitest";
import { withImportFieldMeta } from "@/low-code/schema/import-field-meta";
import {
  collectPayloadKeysFromFormSchema,
  inferImportContractFromFormSchema,
  validateImportItemsAgainstContract,
  validateImportRowKeys,
} from "./import-schema-validation";
import type { FormSchema } from "@/low-code/schema/types";

const templateSchema: FormSchema = {
  sections: [
    {
      key: "import_source",
      title: "题目",
      fields: [
        withImportFieldMeta(
          { key: "prompt", label: "prompt", component: "textarea", path: "prompt", readonly: true },
          "display",
        ),
        withImportFieldMeta(
          { key: "id", label: "id", component: "text", path: "id", readonly: true },
          "display",
        ),
      ],
    },
    {
      key: "import_label",
      title: "标注",
      fields: [
        withImportFieldMeta(
          { key: "preferred", label: "preferred", component: "radioGroup", path: "preferred" },
          "input",
        ),
      ],
    },
    {
      key: "assist",
      title: "辅助",
      fields: [
        withImportFieldMeta(
          { key: "llm_hint", label: "LLM", component: "llmSuggest", path: "__llm_hint" },
          "runtime",
        ),
      ],
    },
  ],
  actions: [{ key: "submit", label: "提交", kind: "submit" }],
};

describe("import-schema-validation", () => {
  it("collects binding keys excluding runtime fields", () => {
    expect(collectPayloadKeysFromFormSchema(templateSchema)).toEqual(["id", "preferred", "prompt"]);
  });

  it("infers required and optional keys from form schema", () => {
    expect(inferImportContractFromFormSchema(templateSchema)).toEqual({
      schemaVersion: 1,
      requiredKeys: ["id", "prompt"],
      optionalKeys: ["preferred"],
      forbiddenKeys: ["__llm_hint"],
      source: "FROM_TEMPLATE",
    });
  });

  it("accepts import keys as subset of contract", () => {
    const contract = { requiredKeys: ["id", "prompt"], optionalKeys: ["preferred"], forbiddenKeys: [] };
    expect(validateImportRowKeys(["id", "prompt"], contract).ok).toBe(true);
    expect(validateImportRowKeys(["id", "prompt", "preferred"], contract).ok).toBe(true);
  });

  it("rejects missing required and extra columns", () => {
    const contract = { requiredKeys: ["id", "prompt"], optionalKeys: ["preferred"], forbiddenKeys: [] };
    expect(validateImportRowKeys(["id"], contract).ok).toBe(false);
    expect(validateImportRowKeys(["id", "prompt", "extra"], contract).ok).toBe(false);
  });

  it("validates each import row", () => {
    const contract = { requiredKeys: ["id", "prompt"], optionalKeys: ["preferred"], forbiddenKeys: [] };
    const result = validateImportItemsAgainstContract(
      [{ id: "1", prompt: "a" }, { id: "2", prompt: "b", preferred: "x" }],
      contract,
    );
    expect(result.ok).toBe(true);
  });
});
