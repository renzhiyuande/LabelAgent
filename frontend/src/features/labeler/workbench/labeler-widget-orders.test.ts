import { beforeEach, describe, expect, it } from "vitest";
import { loadLabelerWidgetOrdersFromStorage } from "./labeler-widget-orders";
import { saveLabelerWidgetOrder } from "./labeler-widget-board-storage";

describe("loadLabelerWidgetOrdersFromStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("keeps ai-review on payload when ai board storage is empty", () => {
    saveLabelerWidgetOrder("payload", ["payload-main", "ai-review"]);
    saveLabelerWidgetOrder("annotate", ["annotate-main", "annotate-actions"]);
    saveLabelerWidgetOrder("ai", []);

    const orders = loadLabelerWidgetOrdersFromStorage();

    expect(orders.payload).toContain("ai-review");
    expect(orders.ai).not.toContain("ai-review");
  });
});
