import { describe, expect, it } from "vitest";
import type { WorkbenchTabItem, WorkbenchV2Schema } from "../types";
import { normalizeWorkbenchLayoutState } from "./layout-global-normalize";

const schema: WorkbenchV2Schema = {
  mode: "test",
  storageKey: "test-layout",
  regions: {
    top: { id: "top", label: "Top", direction: "horizontal", defaultSize: 100, minSize: 80, maxSize: 120 },
    left: { id: "left", label: "Left", direction: "vertical", defaultSize: 280, minSize: 80, maxSize: 400, collapsible: true },
    center: { id: "center", label: "Center", direction: "vertical", defaultSize: 0, minSize: 0, maxSize: 9999 },
    right: { id: "right", label: "Right", direction: "vertical", defaultSize: 320, minSize: 80, maxSize: 600, collapsible: true },
  },
};

const defaultTabs: WorkbenchTabItem[] = [
  { id: "tab-a", slotId: "a", label: "A", regionId: "left", index: 0 },
  { id: "tab-b", slotId: "b", label: "B", regionId: "center", index: 0 },
];

describe("normalizeWorkbenchLayoutState", () => {
  it("restores tab region from storage while keeping default tab metadata", () => {
    const normalized = normalizeWorkbenchLayoutState(
      schema,
      {
        tabs: [
          { id: "tab-a", slotId: "a", regionId: "right", index: 0 },
          { id: "tab-b", slotId: "b", regionId: "left", index: 0 },
        ],
      },
      defaultTabs,
    );

    expect(normalized.tabs.find((tab) => tab.id === "tab-a")?.regionId).toBe("right");
    expect(normalized.tabs.find((tab) => tab.id === "tab-b")?.regionId).toBe("left");
    expect(normalized.tabs.find((tab) => tab.id === "tab-a")?.label).toBe("A");
  });

  it("restores tab order within a region from stored index", () => {
    const normalized = normalizeWorkbenchLayoutState(
      schema,
      {
        tabs: [
          { id: "tab-a", slotId: "a", regionId: "left", index: 1 },
          { id: "tab-b", slotId: "b", regionId: "left", index: 0 },
        ],
      },
      defaultTabs,
    );

    const leftTabs = normalized.tabs
      .filter((tab) => tab.regionId === "left")
      .sort((left, right) => left.index - right.index)
      .map((tab) => tab.id);

    expect(leftTabs).toEqual(["tab-b", "tab-a"]);
  });
});
