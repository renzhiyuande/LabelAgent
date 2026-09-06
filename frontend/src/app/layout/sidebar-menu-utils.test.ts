import { describe, expect, it } from "vitest";
import type { AppMenuItem } from "../navigation/menu-config";
import { collectExpandableKeysInSubtree, toggleAccordionExpandedKeys } from "./sidebar-menu-utils";

const menus: AppMenuItem[] = [
  {
    key: "system",
    path: "/system",
    title: "系统管理",
    children: [
      { key: "users", path: "/system/users", title: "用户" },
      {
        key: "dict",
        path: "/system/dict",
        title: "字典",
        children: [{ key: "dict-types", path: "/system/dict-types", title: "字典类型" }],
      },
    ],
  },
  {
    key: "tasks",
    path: "/tasks",
    title: "任务",
    children: [{ key: "task-list", path: "/tasks/list", title: "任务列表" }],
  },
];

describe("toggleAccordionExpandedKeys", () => {
  it("expands one top-level branch and collapses the other", () => {
    const current = new Set(["system", "dict"]);
    const next = toggleAccordionExpandedKeys(current, menus, "tasks", null);

    expect(next.has("tasks")).toBe(true);
    expect(next.has("system")).toBe(false);
    expect(next.has("dict")).toBe(false);
  });

  it("expands one sibling nested branch and collapses the other", () => {
    const current = new Set(["system", "dict"]);
    const next = toggleAccordionExpandedKeys(current, menus, "users", null);

    expect(next.has("system")).toBe(true);
    expect(next.has("users")).toBe(true);
    expect(next.has("dict")).toBe(false);
  });

  it("collapses the current branch when toggled again", () => {
    const current = new Set(["system", "dict"]);
    const next = toggleAccordionExpandedKeys(current, menus, "dict", null);

    expect(next.has("dict")).toBe(false);
  });
});

describe("collectExpandableKeysInSubtree", () => {
  it("collects expandable keys in a subtree", () => {
    expect(collectExpandableKeysInSubtree(menus[0], null)).toEqual(["system", "dict"]);
  });
});
