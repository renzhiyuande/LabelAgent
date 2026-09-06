import type { WorkbenchTabItem, WorkbenchV2Schema } from "@/components/workbench2";

export const LABELER_WORKBENCH2_STORAGE_KEY = "labelhub:workbench2:labeler";

export const labelerWorkbench2Schema: WorkbenchV2Schema = {
  chrome: "flush",
  mode: "labeler-workbench2",
  storageKey: LABELER_WORKBENCH2_STORAGE_KEY,
  regions: {
    top: {
      id: "top",
      label: "标注工作台",
      direction: "horizontal",
      defaultSize: 104,
      minSize: 84,
      maxSize: 152,
    },
    left: {
      id: "left",
      label: "左侧",
      direction: "vertical",
      defaultSize: 296,
      minSize: 84,
      maxSize: 420,
      collapsible: true,
    },
    center: {
      id: "center",
      label: "中间",
      direction: "vertical",
      defaultSize: 0,
      minSize: 0,
      maxSize: 9999,
      collapsible: false,
    },
    right: {
      id: "right",
      label: "右侧",
      direction: "vertical",
      defaultSize: 420,
      minSize: 84,
      maxSize: 720,
      collapsible: true,
    },
  },
};

export const labelerWorkbench2Tabs: WorkbenchTabItem[] = [
  { id: "top-toolbar", slotId: "toolbar", label: "工具", regionId: "top", index: 0 },
  { id: "top-summary", slotId: "summary", label: "进度", regionId: "top", index: 1 },
  { id: "left-queue", slotId: "queue", label: "队列", regionId: "left", index: 0 },
  { id: "center-payload", slotId: "payload", label: "题面", regionId: "center", index: 0 },
  { id: "right-annotate", slotId: "annotate", label: "作答", regionId: "right", index: 0 },
  { id: "right-ai", slotId: "ai", label: "审核进度", regionId: "right", index: 1 },
];
