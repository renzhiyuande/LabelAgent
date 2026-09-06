import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { ApiError } from "../utils/apiClient";
import { appMessage, markMessageErrorHandled } from "./message";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe("appMessage.errorUnlessHandled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips toast when apiClient already handled the error", () => {
    const error = new ApiError("Database connection failed", "SYS_004", "trace-500", 500);
    markMessageErrorHandled(error);

    appMessage.errorUnlessHandled("加载失败", error);

    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows toast and marks error when not yet handled", () => {
    const error = new ApiError("Database connection failed", "SYS_004", "trace-500", 500);

    appMessage.errorUnlessHandled("加载失败", error);

    expect(toast.error).toHaveBeenCalledWith("System error, please retry later", { description: undefined });
    expect(error.handled).toBe(true);
  });

  it("errorUnlessHandled does not duplicate apiClient toast for mapped 400 errors", () => {
    const error = new ApiError(
      "No reviewed submissions with AI and human comments are available under published versions of this template. Publish the template, run the task, and complete manual reviews first.",
      "RVW_007",
      "trace-400",
      400,
    );
    markMessageErrorHandled(error);

    appMessage.errorUnlessHandled("生成 AI 建议失败", error);

    expect(toast.error).not.toHaveBeenCalled();
  });

  it("dedupes identical error toasts within a short window", () => {
    appMessage.error("加载 AI 预审质检数据失败");
    appMessage.error("加载 AI 预审质检数据失败");

    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it("errorFrom prefers mapped i18n over backend message", () => {
    const error = new ApiError(
      "No historical review cases are available for prompt optimization on this template version. Please accumulate runtime data first.",
      "RVW_007",
      "trace-400",
      400,
    );

    appMessage.errorFrom(error, "生成 AI 建议失败");

    expect(toast.error).toHaveBeenCalledWith(
      "No reviewed submissions with AI and human comments are available under published versions of this template. Publish the template, run the task, and complete manual reviews first.",
      { description: "错误码：RVW_007 · TraceId：trace-400" },
    );
    expect(error.handled).toBe(true);
  });
});
