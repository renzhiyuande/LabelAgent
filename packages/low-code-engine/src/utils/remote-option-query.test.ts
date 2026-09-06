import { describe, expect, it } from "vitest";
import {
  buildRemoteOptionQuery,
  collectRemoteParamSourcePaths,
  isRemoteOptionQueryReady,
  normalizeRemoteOptionMeta,
  resolveRemoteOptionParams,
} from "./remote-option-query";

describe("remote-option-query", () => {
  it("builds declarative params and search separately", () => {
    expect(
      buildRemoteOptionQuery(
        {
          source: "exportFields",
          params: { taskId: { from: "taskId" } },
          searchParam: "q",
        },
        {
          values: { taskId: "910230000001" },
          searchText: "提交",
        },
      ),
    ).toEqual({
      taskId: "910230000001",
      q: "提交",
    });
  });

  it("migrates legacy dependsOn to source-specific param", () => {
    expect(
      resolveRemoteOptionParams({
        source: "assignableTaskItems",
        dependsOn: "taskId",
      } as never),
    ).toEqual({
      taskId: { from: "taskId" },
    });
    expect(
      buildRemoteOptionQuery(
        {
          source: "assignableTaskItems",
          dependsOn: "taskId",
        } as never,
        {
          values: { taskId: "910230000001" },
        },
      ),
    ).toEqual({
      taskId: "910230000001",
    });
  });

  it("migrates legacy roleFrom and supports search", () => {
    expect(
      buildRemoteOptionQuery(
        {
          source: "collaborators",
          roleFrom: "memberRole",
        } as never,
        {
          values: { memberRole: "LABELER" },
          searchText: "Anna",
        },
      ),
    ).toEqual({
      role: "LABELER",
      keyword: "Anna",
    });
  });

  it("supports static params", () => {
    expect(
      buildRemoteOptionQuery(
        {
          source: "collaborators",
          params: { role: "LABELER" },
        },
        {
          values: {},
          searchText: "Ben",
        },
      ),
    ).toEqual({
      role: "LABELER",
      keyword: "Ben",
    });
  });

  it("does not overwrite bound keyword with search text", () => {
    expect(
      buildRemoteOptionQuery(
        {
          source: "cities",
          params: { keyword: { from: "province" } },
        },
        {
          values: { province: "zhejiang" },
          searchText: "杭州",
        },
      ),
    ).toEqual({
      keyword: "zhejiang",
    });
  });

  it("collects param source paths and validates readiness", () => {
    const remote = {
      source: "exportFields",
      params: { taskId: { from: "taskId" } },
    };
    expect(collectRemoteParamSourcePaths(remote)).toEqual(["taskId"]);
    expect(isRemoteOptionQueryReady(remote, {})).toBe(false);
    expect(isRemoteOptionQueryReady(remote, { taskId: "910230000001" })).toBe(true);
  });

  it("supports multiple declarative params on custom sources", () => {
    expect(
      buildRemoteOptionQuery(
        {
          source: "customOptionSource",
          params: {
            role: { from: "config.role" },
            keyword: { from: "sceneCode" },
          },
        },
        {
          values: {
            sceneCode: "TEXT",
            config: { role: "REVIEWER" },
          },
        },
      ),
    ).toEqual({
      role: "REVIEWER",
      keyword: "TEXT",
    });
  });

  it("normalizes legacy remote meta for saving", () => {
    expect(
      normalizeRemoteOptionMeta({
        source: "collaborators",
        roleFrom: "memberRole",
        dependsOn: "taskId",
      } as never),
    ).toEqual({
      source: "collaborators",
      params: {
        role: { from: "memberRole" },
      },
    });
  });

  it("drops stale params that do not belong to the current source", () => {
    expect(
      buildRemoteOptionQuery(
        {
          source: "tasks",
          params: {
            role: "LABELER",
            taskId: { from: "taskId" },
          },
        },
        { values: { taskId: 0, role: "LABELER" } },
      ),
    ).toEqual({});
  });

  it("ignores blank taskId values such as 0", () => {
    expect(
      buildRemoteOptionQuery(
        {
          source: "exportFields",
          params: { taskId: { from: "taskId" } },
        },
        { values: { taskId: 0 } },
      ),
    ).toEqual({});
  });
});
