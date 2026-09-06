import { describe, expect, it } from "vitest";
import { isFlushWorkbenchPath, isWorkbenchShellPath } from "./flush-workbench-path";

describe("flush-workbench-path", () => {
  it("detects flush workbench routes", () => {
    expect(isFlushWorkbenchPath("/labeler/work/123")).toBe(true);
    expect(isFlushWorkbenchPath("/reviewer/audit-pool")).toBe(true);
    expect(isFlushWorkbenchPath("/reviewer/audit-pool/456")).toBe(true);
    expect(isFlushWorkbenchPath("/reviewer/ai-queue")).toBe(true);
    expect(isFlushWorkbenchPath("/reviewer/ai-queue/789")).toBe(true);
    expect(isFlushWorkbenchPath("/")).toBe(false);
    expect(isFlushWorkbenchPath("/system/template-designer")).toBe(false);
  });

  it("detects workbench shell routes for focus mode cleanup", () => {
    expect(isWorkbenchShellPath("/system/template-designer")).toBe(true);
    expect(isWorkbenchShellPath("/reviewer/audit-pool")).toBe(true);
    expect(isWorkbenchShellPath("/owner/dashboard")).toBe(false);
  });
});
