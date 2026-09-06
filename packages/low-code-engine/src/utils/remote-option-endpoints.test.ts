import { describe, expect, it } from "vitest";
import { isBusinessOptionSource, resolveDefaultRemoteOptionPath } from "./remote-option-endpoints";

describe("remote-option-endpoints", () => {
  it("routes business option sources to business api", () => {
    expect(isBusinessOptionSource("collaborators")).toBe(true);
    expect(isBusinessOptionSource("assignableTaskItems")).toBe(true);
    expect(isBusinessOptionSource("tasks")).toBe(false);
    expect(resolveDefaultRemoteOptionPath("assignableTaskItems")).toBe(
      "/api/v1/business/options/assignableTaskItems",
    );
    expect(resolveDefaultRemoteOptionPath("tasks")).toBe("/api/v1/engine/options/tasks");
  });
});
