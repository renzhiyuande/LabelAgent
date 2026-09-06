import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitBulkAssignmentAction } from "./assignment";

const requestMock = vi.fn();

vi.mock("../../utils/apiClient", () => ({
  request: (...args: unknown[]) => requestMock(...args),
}));

describe("submitBulkAssignmentAction", () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue({
      successCount: 2,
      failureCount: 0,
      failures: [],
    });
  });

  it("posts userIds and roleIds to bulk assignment endpoint", async () => {
    await submitBulkAssignmentAction(
      "/api/v1/admin/users/roles/batch",
      [1, 2],
      "roleIds",
      [10, 20],
    );

    expect(requestMock).toHaveBeenCalledWith("/api/v1/admin/users/roles/batch", {
      method: "POST",
      body: JSON.stringify({
        userIds: [1, 2],
        roleIds: [10, 20],
      }),
    });
  });

  it("rejects empty role selection", async () => {
    await expect(
      submitBulkAssignmentAction("/api/v1/admin/users/roles/batch", [1], "roleIds", []),
    ).rejects.toThrow("请至少选择一个角色");
  });
});
