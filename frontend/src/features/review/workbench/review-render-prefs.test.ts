import { describe, expect, it } from "vitest";
import {
  createDefaultReviewRenderPrefs,
  loadReviewRenderPrefs,
  saveReviewRenderPrefs,
} from "./review-render-prefs";

describe("review-render-prefs", () => {
  it("loads defaults when storage is empty", () => {
    const prefs = loadReviewRenderPrefs("review");
    expect(prefs.chrome).toBe("flush");
    expect(prefs.defaults.payload).toBe("inline");
    expect(prefs.defaults.annotate).toBe("inline");
  });

  it("persists chrome and view mode changes", () => {
    saveReviewRenderPrefs("ai-queue", {
      ...createDefaultReviewRenderPrefs(),
      chrome: "default",
      defaults: { payload: "cards", annotate: "json" },
    });
    const prefs = loadReviewRenderPrefs("ai-queue");
    expect(prefs.chrome).toBe("default");
    expect(prefs.defaults.payload).toBe("cards");
    expect(prefs.defaults.annotate).toBe("json");
  });
});
