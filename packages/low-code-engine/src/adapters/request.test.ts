import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  REMOTE_SCHEMA_CACHE_TTL_MS,
  buildEngineActionPath,
  buildEngineBatchActionPath,
  buildLegacyListPath,
  clearRemoteSchemaCache,
  fetchDetail,
  fetchEngineList,
  fetchRemoteOptions,
  fetchRemoteSchema,
  fetchOptionSources,
  runBatchAction,
  runBulkResourceAction,
  runHeaderRequestAction,
  runResourceAction,
} from "./request";
import type { ActionSchema } from "../schema/types";
import type { ResourceMeta } from "../schema/types";

const requestMock = vi.fn();

vi.mock("../../utils/apiClient", () => ({
  request: (...args: unknown[]) => requestMock(...args),
}));

const baseResource: ResourceMeta = {
  resource: "users",
  label: "用户",
  idKey: "id",
  permissions: {},
  api: {
    list: "/api/v1/admin/users",
    detail: "/api/v1/admin/users/{id}",
    create: "/api/v1/admin/users",
    update: "/api/v1/admin/users/{id}",
  },
  table: {
    columns: [],
  },
  filters: {
    fields: [],
  },
  form: {
    sections: [],
    actions: [],
  },
  detail: {
    sections: [],
  },
  actions: [],
};

describe("buildEngineActionPath", () => {
  it("WB-FE-LC-002: 行 action URL 拼接 id + actionKey", () => {
    expect(buildEngineActionPath("tasks", 42, "publish")).toBe(
      "/api/v1/engine/resources/tasks/42/actions/publish",
    );
  });
});

describe("runBatchAction", () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue(undefined);
  });

  it("builds the engine batch action path", () => {
    expect(buildEngineBatchActionPath("taskItems", "delete")).toBe(
      "/api/v1/engine/resources/taskItems/actions/delete/batch",
    );
  });

  it("skips invalid ids and empty selections", async () => {
    await runBatchAction("taskItems", "delete", []);
    await runBatchAction("taskItems", "delete", ["", "abc", 0, -1]);
    expect(requestMock).not.toHaveBeenCalled();
  });
});

describe("runBulkResourceAction", () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue(undefined);
  });

  it("calls engine batch delete endpoint once with all ids", async () => {
    const deleteAction: ActionSchema = {
      key: "delete",
      label: "删除",
      kind: "danger",
    };
    await runBulkResourceAction({
      resource: {
        ...baseResource,
        resource: "taskItems",
      },
      action: deleteAction,
      ids: [101, 102, 103],
    });
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith(
      "/api/v1/engine/resources/taskItems/actions/delete/batch",
      {
        method: "POST",
        body: JSON.stringify({ ids: ["101", "102", "103"] }),
      },
    );
  });

  it("preserves snowflake ids as strings in batch body", async () => {
    await runBatchAction("taskItems", "delete", ["1234567890123456789", "9876543210987654321"]);
    expect(requestMock).toHaveBeenCalledWith(
      "/api/v1/engine/resources/taskItems/actions/delete/batch",
      {
        method: "POST",
        body: JSON.stringify({ ids: ["1234567890123456789", "9876543210987654321"] }),
      },
    );
  });
});

describe("buildLegacyListPath", () => {
  it("replaces path placeholders when pathParams are provided", () => {
    const path = buildLegacyListPath(
      {
        ...baseResource,
        resource: "templates",
        api: {
          ...baseResource.api,
          list: "/api/v1/owner/tasks/{taskId}/templates",
        },
      },
      { page: 1, pageSize: 10, filters: [] },
      { taskId: 42 },
    );
    expect(path).toBe("/api/v1/owner/tasks/42/templates?page=1&pageSize=10");
  });

  it("serializes keyword and filter fields into query string", () => {
    const path = buildLegacyListPath(
      {
        ...baseResource,
        resource: "labelerMarket",
        api: {
          ...baseResource.api,
          list: "/api/v1/labeler/market",
        },
      },
      {
        page: 2,
        pageSize: 12,
        keyword: "测试任务",
        filters: [
          { field: "keyword", op: "like" as const, value: "ignored" },
          { field: "sceneCode", op: "eq" as const, value: "GENERAL" },
        ],
      },
    );
    expect(path).toBe(
      "/api/v1/labeler/market?page=2&pageSize=12&keyword=%E6%B5%8B%E8%AF%95%E4%BB%BB%E5%8A%A1&sceneCode=GENERAL",
    );
  });
});

describe("fetchEngineList", () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue({ list: [{ id: 1, username: "admin" }], total: 1, page: 1, pageSize: 10 });
  });

  it("WB-FE-LC-001: tasks 资源 POST engine query", async () => {
    await fetchEngineList(
      {
        ...baseResource,
        resource: "users",
      },
      { page: 1, pageSize: 10, filters: [{ field: "status", op: "eq" as const, value: "ACTIVE" }] },
    );

    expect(requestMock).toHaveBeenCalledWith("/api/v1/engine/resources/users/query", {
      method: "POST",
      body: JSON.stringify({
        page: 1,
        pageSize: 10,
        sort: [],
        filters: [{ field: "status", op: "eq" as const, value: "ACTIVE" }],
      }),
    });
  });
});

describe("fetchDetail", () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue({ id: "1" });
  });

  it("applies scoped path params for nested resources", async () => {
    await fetchDetail(
      {
        ...baseResource,
        resource: "taskItems",
        api: {
          ...baseResource.api,
          detail: "/api/v1/owner/tasks/{taskId}/items/{id}",
        },
      },
      99,
      { taskId: 42 },
    );
    expect(requestMock).toHaveBeenCalledWith("/api/v1/owner/tasks/42/items/99");
  });
});

describe("fetchOptionSources", () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue([
      { key: "dictTypes", label: "字典类型" },
      { key: "menus", label: "菜单" },
    ]);
  });

  it("loads role-filtered option source catalog", async () => {
    const sources = await fetchOptionSources();
    expect(requestMock).toHaveBeenCalledWith("/api/v1/engine/options");
    expect(sources).toHaveLength(2);
    expect(sources[1]?.key).toBe("menus");
  });
});

describe("fetchRemoteOptions", () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue([]);
  });

  it("uses configured resource option path when provided", async () => {
    await fetchRemoteOptions(
      {
        ...baseResource,
        api: {
          ...baseResource.api,
          options: {
            roles: "/api/v1/engine/options/roles",
          },
        },
      },
      "roles",
    );
    expect(requestMock).toHaveBeenCalledWith("/api/v1/engine/options/roles");
  });

  it("falls back to engine options path when not configured", async () => {
    await fetchRemoteOptions(baseResource, "dictTypes");
    expect(requestMock).toHaveBeenCalledWith("/api/v1/engine/options/dictTypes");
  });

  it("appends encoded keyword to request path", async () => {
    await fetchRemoteOptions(baseResource, "users", "admin user");
    expect(requestMock).toHaveBeenCalledWith("/api/v1/engine/options/users?keyword=admin+user");
  });

  it("routes assignableTaskItems to business options endpoint", async () => {
    await fetchRemoteOptions(baseResource, "assignableTaskItems", { taskId: "910230000001" });
    expect(requestMock).toHaveBeenCalledWith(
      "/api/v1/business/options/assignableTaskItems?taskId=910230000001",
    );
  });

  it("routes collaborators to business options endpoint", async () => {
    await fetchRemoteOptions(baseResource, "collaborators", { role: "LABELER", keyword: "张" });
    expect(requestMock).toHaveBeenCalledWith(
      "/api/v1/business/options/collaborators?role=LABELER&keyword=%E5%BC%A0",
    );
  });

  it("uses configured collaborators path when provided on resource", async () => {
    await fetchRemoteOptions(
      {
        ...baseResource,
        api: {
          ...baseResource.api,
          options: {
            collaborators: "/api/v1/business/options/collaborators",
          },
        },
      },
      "collaborators",
      { role: "REVIEWER" },
    );
    expect(requestMock).toHaveBeenCalledWith("/api/v1/business/options/collaborators?role=REVIEWER");
  });
});

describe("fetchRemoteSchema", () => {
  beforeEach(() => {
    vi.useRealTimers();
    requestMock.mockReset();
    clearRemoteSchemaCache();
    requestMock.mockResolvedValue({ title: "schema", sections: [], actions: [] });
  });

  it("reuses cached promise within ttl", async () => {
    const remoteSchema = { api: "/api/v1/owner/remote-schemas/rewardRules/{rewardRuleMode}/form-schema" };
    const values = { rewardRuleMode: "PER_APPROVED" };

    const first = fetchRemoteSchema(remoteSchema, values);
    const second = fetchRemoteSchema(remoteSchema, values);
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(firstResult).toEqual(secondResult);
  });

  it("evicts expired remote schema cache entries", async () => {
    vi.useFakeTimers();
    const remoteSchema = { api: "/api/v1/owner/remote-schemas/rewardRules/{rewardRuleMode}/form-schema" };
    const values = { rewardRuleMode: "PER_APPROVED" };

    await fetchRemoteSchema(remoteSchema, values);
    vi.advanceTimersByTime(REMOTE_SCHEMA_CACHE_TTL_MS + 1);
    await fetchRemoteSchema(remoteSchema, values);

    expect(requestMock).toHaveBeenCalledTimes(2);
  });

  it("cleans failed requests from cache for retry", async () => {
    requestMock.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce({ title: "ok", sections: [], actions: [] });
    const remoteSchema = { api: "/api/v1/owner/remote-schemas/rewardRules/{rewardRuleMode}/form-schema" };
    const values = { rewardRuleMode: "PER_APPROVED" };

    await expect(fetchRemoteSchema(remoteSchema, values)).rejects.toThrow("boom");
    await expect(fetchRemoteSchema(remoteSchema, values)).resolves.toEqual({ title: "ok", sections: [], actions: [] });

    expect(requestMock).toHaveBeenCalledTimes(2);
  });
});

describe("runHeaderRequestAction", () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue({ id: "1" });
  });

  it("replaces query placeholders from prompt values", async () => {
    await runHeaderRequestAction(
      {
        ...baseResource,
        resource: "rewardSettlements",
        api: {
          ...baseResource.api,
          actions: {
            createBatch: "/api/v1/owner/reward-settlements/tasks/{taskId}",
          },
        },
      },
      { key: "createBatch", label: "生成奖励批次", kind: "request" },
      { taskId: 42 },
    );
    expect(requestMock).toHaveBeenCalledWith("/api/v1/owner/reward-settlements/tasks/42", { method: "POST" });
  });
});

describe("runResourceAction", () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue(undefined);
  });

  it("sends configured request body for legacy request actions", async () => {
    await runResourceAction({
      resource: {
        ...baseResource,
        resource: "acceptanceSamples",
      },
      action: {
        key: "pass",
        label: "通过",
        kind: "request",
        api: "/api/v1/owner/acceptances/samples/{id}/decision",
        requestBody: { decision: "PASS" },
      },
      record: { id: 99, sampleStatus: "PENDING" },
    });

    expect(requestMock).toHaveBeenCalledWith("/api/v1/owner/acceptances/samples/99/decision", {
      method: "POST",
      body: JSON.stringify({ decision: "PASS" }),
    });
  });
});
