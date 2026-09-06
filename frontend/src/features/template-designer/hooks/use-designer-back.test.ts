import { beforeEach, describe, expect, it } from "vitest";
import {
  appendDesignerReturnTo,
  DESIGNER_RETURN_TO_KEY,
  isDesignerLocation,
  peekDesignerReturnTo,
  rememberDesignerReturnTo,
  resolveDesignerBackTarget,
  resolveDesignerReturnTo,
} from "./use-designer-back";

describe("isDesignerLocation", () => {
  it("detects designer paths with or without query", () => {
    expect(isDesignerLocation("/system/template-designer")).toBe(true);
    expect(isDesignerLocation("/system/template-designer?templateId=1")).toBe(true);
    expect(isDesignerLocation("/owner/tasks")).toBe(false);
  });
});

describe("resolveDesignerReturnTo", () => {
  it("accepts safe internal paths", () => {
    const params = new URLSearchParams({ returnTo: encodeURIComponent("/owner/tasks") });
    expect(resolveDesignerReturnTo(params)).toBe("/owner/tasks");
  });

  it("rejects external urls", () => {
    const params = new URLSearchParams({ returnTo: "https://evil.test" });
    expect(resolveDesignerReturnTo(params)).toBeNull();
  });

  it("rejects designer self-references", () => {
    const params = new URLSearchParams({
      returnTo: encodeURIComponent("/system/template-designer?templateId=1&returnTo=%2Fowner%2Ftasks"),
    });
    expect(resolveDesignerReturnTo(params)).toBeNull();
  });
});

describe("appendDesignerReturnTo", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("appends returnTo query param and remembers it", () => {
    expect(
      appendDesignerReturnTo(
        "/system/template-designer?templateId=1&versionId=2",
        "/owner/tasks",
      ),
    ).toBe("/system/template-designer?templateId=1&versionId=2&returnTo=%2Fowner%2Ftasks");
    expect(peekDesignerReturnTo()).toBe("/owner/tasks");
  });

  it("does not overwrite an existing remembered target", () => {
    rememberDesignerReturnTo("/owner/tasks");
    appendDesignerReturnTo(
      "/system/template-designer?templateId=1&versionId=2",
      "/system/template-designer?templateId=1",
    );
    expect(peekDesignerReturnTo()).toBe("/owner/tasks");
  });
});

describe("resolveDesignerBackTarget", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("falls back when returnTo points to designer", () => {
    rememberDesignerReturnTo("/owner/tasks");
    const params = new URLSearchParams({
      returnTo: encodeURIComponent("/system/template-designer?templateId=1"),
    });
    expect(resolveDesignerBackTarget(params)).toBe("/owner/tasks");
  });
});

describe("rememberDesignerReturnTo", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("stores only safe internal paths", () => {
    rememberDesignerReturnTo("/owner/tasks");
    expect(sessionStorage.getItem(DESIGNER_RETURN_TO_KEY)).toBe("/owner/tasks");
    rememberDesignerReturnTo("https://evil.test");
    expect(sessionStorage.getItem(DESIGNER_RETURN_TO_KEY)).toBe("/owner/tasks");
  });
});
