import { describe, expect, it } from "vitest";
import type { ActionSchema, ResourceMeta } from "../schema/types";
import {
  listApiRequiresPathParams,
  resolveLegacyActionApi,
  shouldRunLegacyResourceAction,
  usesLegacyListApi,
} from "./resolve-legacy-action-api";

const baseResource: ResourceMeta = {
  resource: "labelerMarket",
  label: "任务广场",
  idKey: "taskId",
  api: {
    query: "/api/v1/labeler/market",
    detail: "/api/v1/labeler/market/{id}",
    create: "/api/v1/labeler/market",
    update: "/api/v1/labeler/market/{id}",
    actions: {
      claim: "/api/v1/labeler/tasks/{taskId}/claim",
    },
  },
  table: { columns: [] },
  filters: { fields: [] },
  form: { sections: [], actions: [] },
};

const claimAction: ActionSchema = {
  key: "claim",
  label: "领取任务",
  kind: "request",
  api: "/api/v1/labeler/tasks/{taskId}/claim",
};

describe("resolve-legacy-action-api", () => {
  it("detects labeler market list as legacy REST", () => {
    expect(usesLegacyListApi(baseResource)).toBe(true);
  });

  it("does not treat scoped owner list as plain legacy", () => {
    const templates: ResourceMeta = {
      ...baseResource,
      resource: "templates",
      api: {
        ...baseResource.api,
        query: "/api/v1/owner/tasks/{taskId}/templates",
      },
    };
    expect(listApiRequiresPathParams(templates)).toBe(true);
    expect(usesLegacyListApi(templates)).toBe(false);
  });

  it("detects labeler claim as legacy REST action", () => {
    expect(resolveLegacyActionApi(baseResource, claimAction)).toBe("/api/v1/labeler/tasks/{taskId}/claim");
    expect(shouldRunLegacyResourceAction(baseResource, claimAction)).toBe(true);
  });

  it("skips actions with sidePanel", () => {
    const withPanel: ActionSchema = {
      ...claimAction,
      sidePanel: { resourceKey: "taskItems", scope: { field: "taskId" } },
    };
    expect(shouldRunLegacyResourceAction(baseResource, withPanel)).toBe(false);
  });
});
