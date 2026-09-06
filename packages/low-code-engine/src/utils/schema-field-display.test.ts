import { describe, expect, it } from "vitest";
import type { FormFieldSchema } from "../schema/types";
import { resolveSchemaFieldDisplayLabel } from "./schema-field-display";

const statusField: FormFieldSchema = {
  key: "status",
  label: "状态",
  component: "remoteSelect",
  dict: "TASK_STATUS",
};

describe("resolveSchemaFieldDisplayLabel", () => {
  it("maps submitted value to dict label", () => {
    const label = resolveSchemaFieldDisplayLabel(statusField, "PENDING", {
      TASK_STATUS: [{ label: "待处理", value: "PENDING" }],
    });
    expect(label).toBe("待处理");
  });

  it("keeps submitted label without remapping", () => {
    const label = resolveSchemaFieldDisplayLabel(statusField, "待处理", {
      TASK_STATUS: [{ label: "待处理", value: "PENDING" }],
    });
    expect(label).toBe("待处理");
  });

  it("uses inline options without dict load", () => {
    const field: FormFieldSchema = {
      key: "level",
      label: "等级",
      component: "select",
      options: [
        { label: "高", value: "high" },
        { label: "低", value: "low" },
      ],
    };
    expect(resolveSchemaFieldDisplayLabel(field, "high", {})).toBe("高");
    expect(resolveSchemaFieldDisplayLabel(field, "高", {})).toBe("高");
  });

  it("does not infer dict from remote source", () => {
    const field: FormFieldSchema = {
      key: "status",
      label: "状态",
      component: "remoteSelect",
      remote: { source: "dict:TASK_STATUS" },
    };
    expect(resolveSchemaFieldDisplayLabel(field, "PENDING", {
      TASK_STATUS: [{ label: "待处理", value: "PENDING" }],
    })).toBe("PENDING");
  });
});
