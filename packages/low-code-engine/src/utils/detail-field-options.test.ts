import { describe, expect, it, vi } from "vitest";
import type { DetailFieldSchema, FormFieldSchema, ResourceMeta } from "../schema/types";
import {
  buildDetailRemoteOptionQuery,
  findFormFieldForDetail,
  loadDetailFieldOptions,
  resolveDetailFieldOptions,
} from "./detail-field-options";

const resource: ResourceMeta = {
  resource: "demo",
  idKey: "id",
  capabilities: {
    query: true,
    detail: true,
    create: true,
    edit: true,
    delete: true,
  },
  api: {},
  table: { columns: [] },
  filters: { fields: [] },
  form: {
    sections: [
      {
        key: "basic",
        fields: [
          {
            key: "status",
            label: "状态",
            component: "remoteSelect",
            dict: "TASK_STATUS",
          },
          {
            key: "scopeType",
            label: "范围类型",
            component: "select",
            dependsOn: "resourceType",
            optionMap: {
              MENU: [{ label: "菜单范围", value: "MENU_ONLY" }],
            },
          },
          {
            key: "candidateUsers",
            label: "候选用户",
            component: "select",
            optionsFrom: "candidateUserOptions",
          },
          {
            key: "reviewerId",
            path: "config.reviewerId",
            label: "审核员",
            component: "remoteSelect",
            remote: {
              source: "collaborators",
              params: {
                role: { from: "config.role" },
                keyword: { from: "sceneCode" },
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
        fields: [{ key: "status", label: "状态" }],
      },
    ],
  },
};

describe("detail-field-options", () => {
  it("matches detail field to form field by path first", () => {
    const detailField: DetailFieldSchema = {
      key: "reviewerId",
      path: "config.reviewerId",
      label: "审核员",
    };
    const field = findFormFieldForDetail(resource, detailField);
    expect(field?.remote?.source).toBe("collaborators");
  });

  it("builds remote option query from declarative params", () => {
    const field = findFormFieldForDetail(resource, {
      key: "reviewerId",
      path: "config.reviewerId",
    }) as FormFieldSchema;
    expect(
      buildDetailRemoteOptionQuery(field, {
        sceneCode: "TEXT",
        config: { role: "REVIEWER" },
      }),
    ).toEqual({
      role: "REVIEWER",
      keyword: "TEXT",
    });
  });

  it("resolves optionMap and optionsFrom against detail record", () => {
    const scopeField = findFormFieldForDetail(resource, { key: "scopeType" }) as FormFieldSchema;
    const candidateField = findFormFieldForDetail(resource, { key: "candidateUsers" }) as FormFieldSchema;

    expect(resolveDetailFieldOptions(scopeField, { resourceType: "MENU" })).toEqual([
      { label: "菜单范围", value: "MENU_ONLY" },
    ]);
    expect(
      resolveDetailFieldOptions(candidateField, {
        candidateUserOptions: [{ label: "张三", value: 1 }],
      }),
    ).toEqual([{ label: "张三", value: 1 }]);
  });

  it("records per-field errors when remote option loading fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const result = await loadDetailFieldOptions({
      resource,
      record: { status: "ACTIVE" },
      loadRemoteOptions: async (source) => {
        if (source === "dict:TASK_STATUS") {
          throw new Error("network down");
        }
        return [];
      },
    });

    expect(result.fieldOptions.status).toEqual([]);
    expect(result.fieldOptionErrors.status).toBe("network down");
    expect(warnSpy).toHaveBeenCalledWith(
      '[detail] failed to load options for "status"',
      expect.objectContaining({
        resource: "demo",
        source: "dict:TASK_STATUS",
      }),
    );
    warnSpy.mockRestore();
  });
});
