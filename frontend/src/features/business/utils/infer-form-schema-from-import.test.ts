import { describe, expect, it } from "vitest";
import {
  buildDefaultColumnConfigs,
  buildFormSchemaFromImport,
  collectImportColumnKeys,
  countActiveColumns,
  guessDefaultColumnRole,
  guessDefaultComponent,
} from "./infer-form-schema-from-import";

const sampleItems = [
  {
    id: "P0001",
    prompt: "解释什么是过拟合",
    response_a: "答案 A",
    preferred: "A",
    margin: "明显优于",
  },
];

describe("infer-form-schema-from-import", () => {
  it("collects union of keys", () => {
    expect(collectImportColumnKeys(sampleItems)).toEqual([
      "id",
      "margin",
      "preferred",
      "prompt",
      "response_a",
    ]);
  });

  it("guesses display vs input roles", () => {
    expect(guessDefaultColumnRole("prompt", ["长文本"])).toBe("display");
    expect(guessDefaultColumnRole("preferred", ["A"])).toBe("input");
  });

  it("builds sections for display and input fields", () => {
    const configs = buildDefaultColumnConfigs(sampleItems);
    const schema = buildFormSchemaFromImport(sampleItems, configs);
    expect(schema.sections.length).toBeGreaterThanOrEqual(2);
    const displaySection = schema.sections.find((s) => s.key === "import_source");
    const inputSection = schema.sections.find((s) => s.key === "import_label");
    expect(displaySection?.fields.some((f) => f.key === "prompt" && f.readonly)).toBe(true);
    expect(inputSection?.fields.some((f) => f.key === "preferred")).toBe(true);
  });

  it("uses explicit component from column config", () => {
    const configs = buildDefaultColumnConfigs(sampleItems).map((config) =>
      config.key === "preferred"
        ? { ...config, role: "input" as const, component: "select" as const }
        : config,
    );
    const schema = buildFormSchemaFromImport(sampleItems, configs);
    const inputSection = schema.sections.find((s) => s.key === "import_label");
    const preferred = inputSection?.fields.find((f) => f.key === "preferred");
    expect(preferred?.component).toBe("select");
    expect(preferred?.options?.length).toBeGreaterThan(0);
  });

  it("guesses component by role and samples", () => {
    expect(guessDefaultComponent("preferred", "input", ["A", "B"])).toBe("radioGroup");
    expect(guessDefaultComponent("prompt", "display", ["x".repeat(200)])).toBe("showItem");
  });

  it("counts active columns", () => {
    const configs = buildDefaultColumnConfigs(sampleItems);
    const counts = countActiveColumns(configs);
    expect(counts.display).toBeGreaterThan(0);
    expect(counts.input).toBeGreaterThan(0);
  });
});
