import { describe, expect, it } from "vitest";
import type { FormSchema } from "@/low-code/schema/types";
import { createDefaultLabelerRenderPrefs } from "../labeler-render-prefs";
import type { LabelerWorkbenchBusinessContext } from "../types";
import { buildSectionWidgetRailSummary } from "./section-widget-rail-summary";

const formSchema: FormSchema = {
  title: "测试",
  sections: [
    {
      key: "instructions",
      title: "标注说明",
      description: "请先阅读任务要求再作答",
      fields: [
        {
          key: "topic",
          label: "主题",
          component: "text",
          path: "topic",
          meta: { importRole: "display", payloadSource: "import" },
        },
      ],
    },
    {
      key: "answer",
      title: "作答区",
      fields: [
        { key: "choice", label: "选项", component: "select", path: "choice" },
        { key: "note", label: "备注", component: "textarea", path: "note" },
      ],
    },
  ],
  actions: [],
};

function createContext(overrides?: Partial<LabelerWorkbenchBusinessContext>): LabelerWorkbenchBusinessContext {
  return {
    work: {
      task: { taskName: "任务" },
      taskItem: { payload: { topic: "图像分类" }, seqNo: 1 },
      submission: { id: 1, currentStatus: "DRAFT" },
      templateVersion: { versionNo: 1 },
    },
    assignmentId: "1",
    formSchema,
    renderPrefs: createDefaultLabelerRenderPrefs(),
    values: { choice: "A", note: "" },
    layoutTabs: [],
  } as unknown as LabelerWorkbenchBusinessContext;
}

describe("buildSectionWidgetRailSummary", () => {
  it("summarizes display section with description and field values", () => {
    const summary = buildSectionWidgetRailSummary(createContext(), "instructions");
    expect(summary?.title).toBe("标注说明");
    expect(summary?.surface).toBe("display");
    expect(summary?.lines[0]).toEqual({ label: "说明", value: "请先阅读任务要求再作答" });
    expect(summary?.lines[1]).toEqual({ label: "主题", value: "图像分类" });
  });

  it("summarizes annotate section with fill progress", () => {
    const summary = buildSectionWidgetRailSummary(createContext(), "answer");
    expect(summary?.surface).toBe("annotate");
    expect(summary?.progress).toEqual({ filled: 1, total: 2 });
  });
});
