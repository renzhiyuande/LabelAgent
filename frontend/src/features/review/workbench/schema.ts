import {
  WORKBENCH_WIDGET_HOST_SLOT_ID,
  createDefaultWorkbenchLayoutState,
  type WorkbenchGlobalLayoutState,
  type WorkbenchTabItem,
  type WorkbenchV2Schema,
} from "@/components/workbench2";

export const REVIEW_WORKBENCH2_STORAGE_KEY = "labelhub:workbench2:review";
export const AI_QUEUE_WORKBENCH2_STORAGE_KEY = "labelhub:workbench2:ai-queue";

export const reviewWorkbench2Schema: WorkbenchV2Schema = {
  mode: "review-workbench2",
  storageKey: REVIEW_WORKBENCH2_STORAGE_KEY,
  legacyStorageKeys: ["labelhub.workbench.review.v1"],
  chrome: "flush",
  regions: {
    top: {
      id: "top",
      label: "人工审核",
      direction: "horizontal",
      defaultSize: 96,
      minSize: 72,
      maxSize: 140,
    },
    left: {
      id: "left",
      label: "左侧",
      direction: "vertical",
      defaultSize: 280,
      minSize: 72,
      maxSize: 400,
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
      defaultSize: 380,
      minSize: 72,
      maxSize: 640,
      collapsible: true,
    },
  },
};

const reviewWorkbench2BaseTabs: WorkbenchTabItem[] = [
  { id: "top-toolbar", slotId: "toolbar", label: "导航", regionId: "top", index: 0 },
  { id: "top-ai", slotId: "ai-header", label: "AI", regionId: "top", index: 1 },
  { id: "left-queue", slotId: "queue", label: "队列", regionId: "left", index: 0 },
  { id: "left-history", slotId: "history", label: "历史", regionId: "left", index: 1 },
  { id: "center-content", slotId: "content", label: "题目", regionId: "center", index: 0 },
  { id: "right-review", slotId: "review", label: "审核", regionId: "right", index: 0 },
  { id: "right-ai", slotId: "ai", label: "AI", regionId: "right", index: 1 },
];

/** 差异 / 时间线独立 tab，避免挤占题目看板高度 */
const reviewWorkbench2WidgetTabs: WorkbenchTabItem[] = [
  {
    id: "widget-tab:content-annotate-timeline:center",
    slotId: WORKBENCH_WIDGET_HOST_SLOT_ID,
    label: "标注时间线",
    regionId: "center",
    index: 1,
    tabKind: "widget",
    widgetId: "content-annotate-timeline",
  },
  {
    id: "widget-tab:content-annotate-diff:center",
    slotId: WORKBENCH_WIDGET_HOST_SLOT_ID,
    label: "标准结果差异",
    regionId: "center",
    index: 2,
    tabKind: "widget",
    widgetId: "content-annotate-diff",
  },
];

export const reviewWorkbench2Tabs: WorkbenchTabItem[] = [
  ...reviewWorkbench2BaseTabs,
  ...reviewWorkbench2WidgetTabs,
];

/** 与当前审核工作台 localStorage 快照一致的全局布局默认值 */
export function createDefaultReviewWorkbenchLayoutState(): WorkbenchGlobalLayoutState {
  const base = createDefaultWorkbenchLayoutState(reviewWorkbench2Schema, reviewWorkbench2Tabs);
  return {
    ...base,
    regions: {
      ...base.regions,
      top: {
        ...base.regions.top,
        size: 72,
        activeTabId: base.regions.top.activeTabId ?? "top-toolbar",
      },
      left: {
        ...base.regions.left,
        collapsed: true,
        activeTabId: base.regions.left.activeTabId ?? "left-queue",
      },
      center: {
        ...base.regions.center,
        collapsed: false,
        activeTabId: base.regions.center.activeTabId ?? "center-content",
      },
      right: {
        ...base.regions.right,
        collapsed: true,
        activeTabId: base.regions.right.activeTabId ?? "right-review",
      },
    },
  };
}

export const aiQueueWorkbench2Schema: WorkbenchV2Schema = {
  mode: "ai-queue-workbench2",
  storageKey: AI_QUEUE_WORKBENCH2_STORAGE_KEY,
  legacyStorageKeys: ["labelhub.workbench.ai-queue.v2", "labelhub.workbench.ai-queue.v1"],
  chrome: "flush",
  regions: {
    top: {
      id: "top",
      label: "AI 审核",
      direction: "horizontal",
      defaultSize: 96,
      minSize: 72,
      maxSize: 140,
    },
    left: {
      id: "left",
      label: "左侧",
      direction: "vertical",
      defaultSize: 300,
      minSize: 72,
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
      defaultSize: 360,
      minSize: 72,
      maxSize: 480,
      collapsible: true,
    },
  },
};

export const aiQueueWorkbench2Tabs: WorkbenchTabItem[] = [
  { id: "top-toolbar", slotId: "toolbar", label: "导航", regionId: "top", index: 0 },
  { id: "left-queue", slotId: "queue", label: "队列", regionId: "left", index: 0 },
  { id: "center-content", slotId: "content", label: "内容", regionId: "center", index: 0 },
  { id: "right-insight", slotId: "insight", label: "AI 分析", regionId: "right", index: 0 },
];
