import { describe, expect, it } from "vitest";
import {
  hasDraftParamRows,
  paramsFromRows,
  rowsFromParams,
  serializeRemoteParams,
  type ParamRow,
} from "./remote-params-editor-state";

describe("remote-params-editor-state", () => {
  it("round-trips field bindings without required default noise", () => {
    const rows: ParamRow[] = [
      { key: "taskId", mode: "field", staticValue: "", fieldPath: "taskId", required: true },
    ];
    expect(paramsFromRows(rows)).toEqual({ taskId: { from: "taskId" } });
    expect(serializeRemoteParams(paramsFromRows(rows))).toBe(
      serializeRemoteParams({ taskId: { from: "taskId", required: true } }),
    );
  });

  it("keeps draft rows when param name or field path is missing", () => {
    expect(
      hasDraftParamRows([
        { key: "", mode: "field", staticValue: "", fieldPath: "taskId", required: true },
      ]),
    ).toBe(true);
    expect(
      hasDraftParamRows([
        { key: "taskId", mode: "field", staticValue: "", fieldPath: "", required: true },
      ]),
    ).toBe(true);
    expect(paramsFromRows([{ key: "", mode: "field", staticValue: "", fieldPath: "taskId", required: true }])).toBeUndefined();
  });

  it("restores rows from saved params", () => {
    expect(
      rowsFromParams({
        role: "LABELER",
        taskId: { from: "parent.taskId" },
      }),
    ).toEqual([
      { key: "role", mode: "static", staticValue: "LABELER", fieldPath: "", required: false },
      { key: "taskId", mode: "field", staticValue: "", fieldPath: "parent.taskId", required: true },
    ]);
  });
});
