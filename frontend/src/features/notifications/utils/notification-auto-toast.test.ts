import { afterEach, describe, expect, it } from "vitest";
import {
  isOptimizationResultWatchActive,
  isPromptOptimizationNotification,
  shouldAutoToastNotification,
  startOptimizationResultWatch,
} from "./notification-auto-toast";

describe("notification-auto-toast", () => {
  afterEach(() => {
    while (isOptimizationResultWatchActive()) {
      startOptimizationResultWatch()();
    }
  });

  it("detects prompt optimization notifications", () => {
    expect(
      isPromptOptimizationNotification({
        title: "AI 预审提示词优化建议",
        linkUrl: "/owner/ai-review-health/1?suggestionId=9",
      }),
    ).toBe(true);
    expect(
      isPromptOptimizationNotification({
        title: "系统公告",
        linkUrl: "/dashboard",
      }),
    ).toBe(false);
  });

  it("skips auto toast on health page for optimization notifications", () => {
    const item = {
      title: "提示词优化任务已完成",
      linkUrl: "/owner/ai-review-health/1",
    };
    expect(shouldAutoToastNotification(item, "/owner/ai-review-health/1")).toBe(false);
    expect(shouldAutoToastNotification(item, "/dashboard/owner")).toBe(true);
  });

  it("skips auto toast while optimization watch is active", () => {
    const endWatch = startOptimizationResultWatch();
    const item = {
      title: "提示词优化任务已完成",
      linkUrl: "/owner/ai-review-health/1",
    };
    expect(shouldAutoToastNotification(item, "/tasks")).toBe(false);
    endWatch();
    expect(shouldAutoToastNotification(item, "/tasks")).toBe(true);
  });
});
