import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useUserMentionOptions } from "./use-user-mention-options";

vi.mock("../../utils/apiClient", () => ({
  request: vi.fn(),
}));

import { request } from "../adapters/lowcode-utils";

describe("useUserMentionOptions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(request).mockResolvedValue([{ label: "Alice", value: 1 }]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("fetches users when mention menu is enabled", async () => {
    const { result } = renderHook(() => useUserMentionOptions("ali", true));

    await act(async () => {
      vi.advanceTimersByTime(250);
      await Promise.resolve();
    });

    expect(request).toHaveBeenCalledWith("/api/v1/engine/options/users?keyword=ali");
    expect(result.current).toEqual([{ label: "Alice", value: "1" }]);
  });

  it("does not fetch when disabled", () => {
    renderHook(() => useUserMentionOptions("ali", false));
    vi.advanceTimersByTime(300);
    expect(request).not.toHaveBeenCalled();
  });
});
