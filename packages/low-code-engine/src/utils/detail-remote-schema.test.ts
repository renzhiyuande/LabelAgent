import { describe, expect, it } from "vitest";
import type { ResourceMeta } from "../schema/types";
import {
  findRemoteSchemaFormFieldForDetail,
  remoteSchemaApiHasPathParams,
  resolveDetailRemoteSchemaContext,
  resolveRemoteSchemaDisplayConfig,
  resolveRemoteSchemaModeRowLabel,
  shouldRenderDetailAsRemoteSchema,
} from "./detail-remote-schema";
import { getValueAtPath } from "./object-path";

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
          {
            key: "rewardRuleMode",
            label: "奖励规则",
            component: "remoteSelect",
            remote: { source: "rewardRules" },
          },
          {
            key: "rewardRuleConfig",
            label: "规则配置",
            component: "remoteSchema",
            remoteSchema: {
              api: "/api/v1/owner/remote-schemas/rewardRules/{rewardRuleMode}/form-schema",
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
  detail: {
    sections: [
      {
        key: "basic",
        fields: [{ key: "rewardRuleJson", label: "奖励规则", type: "remoteSchema" }],
      },
    ],
  },
};

describe("detail-remote-schema", () => {
  it("matches detail payload field to form remoteSchema binding", () => {
    const formField = findRemoteSchemaFormFieldForDetail(resource, { key: "rewardRuleJson", label: "奖励规则" });
    expect(formField?.key).toBe("rewardRuleConfig");
    expect(formField?.remoteSchema?.binding?.payloadField).toBe("rewardRuleJson");
  });

  it("detects remote schema detail rendering from form binding", () => {
    expect(shouldRenderDetailAsRemoteSchema(resource, { key: "rewardRuleJson", label: "奖励规则", type: "json" })).toBe(
      true,
    );
  });

  it("injects parsed mode into enriched record for remote schema fetch", () => {
    const context = resolveDetailRemoteSchemaContext(
      resource,
      { key: "rewardRuleJson", label: "奖励规则" },
      {
        rewardRuleJson: JSON.stringify({
          mode: "PER_APPROVED",
          currency: "CNY",
          base_amount: 12,
        }),
      },
    );

    expect(context?.mode).toBe("PER_APPROVED");
    expect(context?.enrichedRecord.rewardRuleMode).toBe("PER_APPROVED");
  });

  it("splits payload into mode and config for detail display", () => {
    const context = resolveDetailRemoteSchemaContext(
      resource,
      { key: "rewardRuleJson", label: "奖励规则" },
      {
        rewardRuleJson: {
          mode: "PER_APPROVED",
          currency: "CNY",
          base_amount: 12,
        },
      },
    );

    expect(context?.mode).toBe("PER_APPROVED");
    expect(context?.config).toEqual({
      currency: "CNY",
      base_amount: 12,
    });
    expect(context?.modeField?.key).toBe("rewardRuleMode");
  });

  it("uses a distinct mode row label when it matches the detail field title", () => {
    expect(
      resolveRemoteSchemaModeRowLabel("奖励规则", {
        key: "rewardRuleMode",
        label: "奖励规则",
        component: "remoteSelect",
      }),
    ).toBe("规则类型");
    expect(
      resolveRemoteSchemaModeRowLabel("奖励规则", {
        key: "otherMode",
        label: "结算模式",
        component: "select",
      }),
    ).toBe("结算模式");
  });

  it("does not infer legacy reward rule mode for detail display", () => {
    const context = resolveDetailRemoteSchemaContext(
      resource,
      { key: "rewardRuleJson", label: "奖励规则" },
      {
        rewardRuleJson: {
          currency: "CNY",
          base_amount: 8,
        },
      },
    );

    expect(context?.mode).toBeUndefined();
    expect(context?.config).toEqual({
      currency: "CNY",
      base_amount: 8,
    });
  });

  it("loads static task settings schema without mode discriminator", () => {
    const taskResource: ResourceMeta = {
      ...resource,
      form: {
        sections: [
          {
            key: "settings",
            fields: [
              {
                key: "taskSettingsConfig",
                label: "任务设置",
                component: "remoteSchema",
                remoteSchema: {
                  api: "/api/v1/owner/remote-schemas/taskSettings/default/form-schema",
                  binding: {
                    payloadField: "settingsJson",
                    stripSourceFields: false,
                  },
                },
              },
            ],
          },
        ],
        actions: [],
      },
      detail: {
        sections: [{ key: "basic", fields: [{ key: "settingsJson", label: "任务设置", type: "remoteSchema" }] }],
      },
    };

    const context = resolveDetailRemoteSchemaContext(
      taskResource,
      { key: "settingsJson", label: "任务设置" },
      {
        settingsJson: {
          allowTie: true,
          showModelName: true,
          submission: {
            withdraw: { enabled: true, maxWithdrawCount: 2 },
          },
        },
      },
    );

    expect(context?.mode).toBeUndefined();
    expect(context?.config).toEqual({
      allowTie: true,
      showModelName: true,
      submission: {
        withdraw: { enabled: true, maxWithdrawCount: 2 },
      },
    });
    expect(remoteSchemaApiHasPathParams(context?.remoteSchema.api)).toBe(false);
  });

  it("fills missing task settings detail values from remote schema defaults", () => {
    const schema = {
      sections: [
        {
          key: "submission",
          fields: [
            {
              key: "submission.withdraw.enabled",
              label: "允许标注员撤回提交",
              component: "switch" as const,
              defaultValue: true,
            },
            {
              key: "submission.withdraw.maxWithdrawCount",
              label: "单条最大撤回次数",
              component: "number" as const,
              defaultValue: 1,
            },
          ],
        },
      ],
      actions: [],
    };

    const displayConfig = resolveRemoteSchemaDisplayConfig(schema, {
      allowTie: true,
      showModelName: true,
    });

    expect(getValueAtPath(displayConfig, "submission.withdraw.enabled")).toBe(true);
    expect(getValueAtPath(displayConfig, "submission.withdraw.maxWithdrawCount")).toBe(1);
    expect(displayConfig.allowTie).toBe(true);
  });
});
