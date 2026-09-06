import { describe, expect, it } from "vitest";
import {
  applyRemoteSchemaBindingsToRecord,
  applyRemoteSchemaBindingsToValues,
  mergeRemoteSchemaBinding,
  normalizeRemoteSchema,
  splitRemoteSchemaBinding,
} from "./remote-schema";
import type { ResourceMeta } from "../schema/types";

describe("remote-schema utils", () => {
  it("splits discriminator and config from payload", () => {
    expect(
      splitRemoteSchemaBinding({
        mode: "PER_APPROVED",
        currency: "CNY",
        base_amount: 12,
      }),
    ).toEqual({
      mode: "PER_APPROVED",
      config: {
        currency: "CNY",
        base_amount: 12,
      },
    });
  });

  it("merges discriminator and config into payload", () => {
    expect(
      mergeRemoteSchemaBinding("PER_APPROVED", {
        currency: "CNY",
        base_amount: 12,
      }),
    ).toEqual({
      mode: "PER_APPROVED",
      currency: "CNY",
      base_amount: 12,
    });
  });

  it("normalizes empty schema shape", () => {
    expect(normalizeRemoteSchema({ title: "test" })).toEqual({
      title: "test",
      sections: [],
      actions: [],
    });
  });

  it("does not infer mode when payload omits discriminator", () => {
    expect(
      splitRemoteSchemaBinding({
        currency: "CNY",
        base_amount: 12,
      }),
    ).toEqual({
      mode: undefined,
      config: {
        currency: "CNY",
        base_amount: 12,
      },
    });
  });

  it("applies configured bindings to record and values", () => {
    const resource: ResourceMeta = {
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
              { key: "rewardRuleMode", label: "模式", component: "remoteSelect", remote: { source: "rewardRules" } },
              {
                key: "rewardRuleConfig",
                label: "配置",
                component: "remoteSchema",
                remoteSchema: {
                  api: "/schema/{rewardRuleMode}",
                  dependsOn: "rewardRuleMode",
                  binding: {
                    payloadField: "rewardRuleJson",
                    discriminatorKey: "mode",
                  },
                },
              },
            ],
          },
        ],
        actions: [],
      },
    };

    expect(
      applyRemoteSchemaBindingsToRecord(
        {
          rewardRuleJson: {
            mode: "PER_APPROVED",
            base_amount: 5,
          },
        },
        resource,
      ),
    ).toMatchObject({
      rewardRuleMode: "PER_APPROVED",
      rewardRuleConfig: { base_amount: 5 },
    });

    expect(
      applyRemoteSchemaBindingsToRecord(
        {
          rewardRuleJson: JSON.stringify({
            mode: "FIXED_BONUS",
            currency: "CNY",
            base_amount: 9,
          }),
        },
        resource,
      ),
    ).toMatchObject({
      rewardRuleMode: "FIXED_BONUS",
      rewardRuleConfig: { currency: "CNY", base_amount: 9 },
    });

    expect(
      applyRemoteSchemaBindingsToValues(
        { title: "task" },
        {
          title: "task",
          rewardRuleMode: "PER_APPROVED",
          rewardRuleConfig: { base_amount: 5 },
        },
        resource,
      ),
    ).toEqual({
      title: "task",
      rewardRuleJson: {
        mode: "PER_APPROVED",
        base_amount: 5,
      },
    });
  });
});
