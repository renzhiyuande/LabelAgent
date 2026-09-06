import { describe, expect, it } from "vitest";
import { collectResourceFormValidationErrors } from "./resource-form-validation";
import type { FormFieldSchema } from "../../schema/types";

describe("resource-form-validation", () => {
  it("validates array fields inside remote schema nested fields", () => {
    const remoteSchemaFields: Record<string, FormFieldSchema[]> = {
      rewardRuleConfig: [
        {
          key: "rules",
          label: "规则明细",
          component: "array",
          required: true,
          fields: [
            {
              key: "amount",
              label: "金额",
              component: "number",
              required: true,
            },
          ],
        },
      ],
    };

    const errors = collectResourceFormValidationErrors(
      {
        resource: "tasks",
        idKey: "id",
        api: {},
        table: { columns: [] },
        filters: { fields: [] },
        form: {
          sections: [
            {
              key: "basic",
              fields: [
                {
                  key: "rewardRuleConfig",
                  label: "规则配置",
                  component: "remoteSchema",
                },
              ],
            },
          ],
          actions: [],
        },
      },
      {
        rewardRuleConfig: {
          rules: [{ amount: null }],
        },
      },
      remoteSchemaFields,
    );

    expect(errors["rewardRuleConfig.rules.0.amount"]).toBe("请填写金额");
  });

  it("skips validation for fields hidden by visibleIn", () => {
    const errors = collectResourceFormValidationErrors(
      {
        resource: "assignments",
        idKey: "id",
        api: {},
        table: { columns: [] },
        filters: { fields: [] },
        form: {
          sections: [
            {
              key: "basic",
              fields: [
                { key: "taskId", label: "任务", component: "text", required: true, visibleIn: ["create"] },
                { key: "labelerId", label: "标注员", component: "text", required: true },
              ],
            },
          ],
          actions: [],
        },
      },
      { labelerId: "" },
      {},
      null,
      "edit",
    );

    expect(errors.taskId).toBeUndefined();
    expect(errors.labelerId).toBe("请填写标注员");
  });
});
