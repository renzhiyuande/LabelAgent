import { describe, expect, it } from "vitest";
import type { FormSchema } from "./types";
import {
  inferImportContractFromFormSchema,
  isRuntimeImportField,
  resolveImportRole,
  validateSchemaRespectsImportContract,
  withImportFieldMeta,
} from "./import-field-meta";

describe("import-field-meta", () => {
  it("treats payload showItem as display binding", () => {
    expect(
      resolveImportRole({ key: "title", path: "title", label: "标题", component: "showItem" }),
    ).toBe("display");
  });

  it("treats static showItem as runtime", () => {
    expect(
      resolveImportRole({
        key: "hint",
        label: "提示",
        component: "showItem",
        showItem: { contentSource: "static", staticContent: "说明" },
      }),
    ).toBe("runtime");
  });

  it("marks llm fields as runtime", () => {
    const field = withImportFieldMeta(
      { key: "hint", path: "__hint", label: "LLM", component: "llmSuggest" },
      "runtime",
    );
    expect(isRuntimeImportField(field)).toBe(true);
  });

  it("infers contract from meta roles", () => {
    const schema: FormSchema = {
      sections: [
        {
          key: "s1",
          title: "t",
          fields: [
            withImportFieldMeta(
              { key: "id", path: "id", label: "id", component: "text" },
              "display",
            ),
            withImportFieldMeta(
              { key: "pref", path: "preferred", label: "p", component: "radioGroup" },
              "input",
            ),
            withImportFieldMeta(
              { key: "llm", path: "__llm", label: "L", component: "llmSuggest" },
              "runtime",
            ),
          ],
        },
      ],
      actions: [],
    };
    expect(inferImportContractFromFormSchema(schema)).toEqual({
      schemaVersion: 1,
      requiredKeys: ["id"],
      optionalKeys: ["preferred"],
      forbiddenKeys: ["__llm"],
      source: "FROM_TEMPLATE",
    });
  });

  it("blocks removing frozen display columns on save", () => {
    const schema: FormSchema = {
      sections: [
        {
          key: "s1",
          title: "t",
          fields: [
            withImportFieldMeta(
              { key: "id", path: "id", label: "id", component: "text" },
              "display",
            ),
          ],
        },
      ],
      actions: [],
    };
    const result = validateSchemaRespectsImportContract(schema, {
      requiredKeys: ["id", "prompt"],
    });
    expect(result.ok).toBe(false);
    expect(result.missingRequiredKeys).toEqual(["prompt"]);
  });
});
