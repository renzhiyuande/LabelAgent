import { describe, expect, it } from "vitest";
import { moveTabToRegion, moveTabToRegionAtIndex, normalizeAllTabIndices, reorderTabsInRegion } from "./layout-dnd-operations";
import type { WorkbenchTabItem } from "../types";

const tabs: WorkbenchTabItem[] = [
  { id: "a", slotId: "queue", label: "A", regionId: "left", index: 0 },
  { id: "b", slotId: "filters", label: "B", regionId: "left", index: 1 },
  { id: "c", slotId: "canvas", label: "C", regionId: "center", index: 0 },
];

describe("workbench2 dnd operations", () => {
  it("normalizes indices inside each region", () => {
    const normalized = normalizeAllTabIndices([
      { ...tabs[1], index: 9 },
      { ...tabs[0], index: 7 },
      tabs[2],
    ]);

    expect(normalized.find((tab) => tab.id === "a")?.index).toBe(0);
    expect(normalized.find((tab) => tab.id === "b")?.index).toBe(1);
    expect(normalized.find((tab) => tab.id === "c")?.index).toBe(0);
  });

  it("moves tabs across regions", () => {
    const moved = moveTabToRegion(tabs, "b", "right");
    expect(moved.find((tab) => tab.id === "b")?.regionId).toBe("right");
    expect(moved.find((tab) => tab.id === "a")?.index).toBe(0);
  });

  it("moves tabs to target index across regions", () => {
    const moved = moveTabToRegionAtIndex(
      [...tabs, { id: "d", slotId: "insight", label: "D", regionId: "right", index: 0 }],
      "b",
      "right",
      0,
    );
    expect(moved.filter((tab) => tab.regionId === "right").map((tab) => tab.id)).toEqual(["b", "d"]);
  });

  it("reorders tabs inside a region", () => {
    const reordered = reorderTabsInRegion(tabs, "left", "a", "b");
    expect(reordered.filter((tab) => tab.regionId === "left").map((tab) => tab.id)).toEqual(["b", "a"]);
  });
});
