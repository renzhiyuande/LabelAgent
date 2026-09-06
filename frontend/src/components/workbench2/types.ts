import type { ReactNode } from "react";

export type WorkbenchRegionId = "top" | "left" | "center" | "right";

export type WorkbenchPlacementMode =
  | "top-full"
  | "top-compact"
  | "left-wide"
  | "left-narrow"
  | "center-full"
  | "right-wide"
  | "right-narrow";

export type WorkbenchDragMode = "idle" | "dragging-tab-item";

export type WorkbenchSlotPresentation = "default" | "narrow" | "collapsed";

export interface WorkbenchGlobalDragState {
  mode: WorkbenchDragMode;
  activeTabId: string | null;
  sourceRegionId: WorkbenchRegionId | null;
  currentHoverOverRegionId: WorkbenchRegionId | null;
  previewInsertIndex: number | null;
}

export interface WorkbenchDraggableData {
  type: "workbench-tab-item";
  tabId: string;
  sourceRegionId: WorkbenchRegionId;
}

export interface WorkbenchDroppableData {
  type: "workbench-tab-container";
  regionId: WorkbenchRegionId;
}

export interface WorkbenchRenderContext {
  regionId: WorkbenchRegionId;
  placementMode: WorkbenchPlacementMode;
  regionSize: number;
  regionCollapsed: boolean;
  isActive: boolean;
  tabId: string;
}

export interface WorkbenchTabItem {
  id: string;
  slotId: string;
  label: string;
  regionId: WorkbenchRegionId;
  index: number;
  pinned?: boolean;
  /** widget 独立 tab：仅展示单个 widget。无此字段即为普通 slot tab */
  tabKind?: "widget";
  /** tabKind === "widget" 时必须提供 */
  widgetId?: string;
}

/** 独立 widget tab 使用的 slotId */
export const WORKBENCH_WIDGET_HOST_SLOT_ID = "widget-host";

export interface WorkbenchRegionState {
  id: WorkbenchRegionId;
  collapsed: boolean;
  size: number;
  activeTabId: string | null;
}

export interface WorkbenchGlobalLayoutState {
  regions: Record<WorkbenchRegionId, WorkbenchRegionState>;
  bodyRegionOrder: Array<Extract<WorkbenchRegionId, "left" | "center" | "right">>;
  tabs: WorkbenchTabItem[];
}

export interface WorkbenchTopBarRenderParams<TBusinessContext = unknown> {
  regionId: "top";
  label: string;
  region: WorkbenchRegionState;
  tabs: WorkbenchTabItem[];
  activeTab: WorkbenchTabItem | null;
  businessContext: TBusinessContext;
  editing: boolean;
  tabContainer: ReactNode;
  actions?: ReactNode;
}

export interface WorkbenchSlotProvider<TBusinessContext = unknown> {
  id: string;
  label: string;
  icon?: ReactNode;
  render: (businessContext: TBusinessContext, env: WorkbenchRenderContext) => ReactNode;
  getPresentation?: (
    businessContext: TBusinessContext,
    env: WorkbenchRenderContext,
  ) => WorkbenchSlotPresentation;
  renderPopover?: (businessContext: TBusinessContext, env: WorkbenchRenderContext) => ReactNode;
  renderNarrow?: (businessContext: TBusinessContext, env: WorkbenchRenderContext) => ReactNode;
  renderCollapsed?: (businessContext: TBusinessContext, env: WorkbenchRenderContext) => ReactNode;
  renderTabBadge?: (businessContext: TBusinessContext, env: WorkbenchRenderContext) => ReactNode;
  renderTopTab?: (businessContext: TBusinessContext, env: WorkbenchRenderContext) => ReactNode;
  renderBodyTab?: (businessContext: TBusinessContext, env: WorkbenchRenderContext) => ReactNode;
  renderTabCustom?: (businessContext: TBusinessContext, env: WorkbenchRenderContext) => ReactNode;
  onActivate?: () => void;
  onDeactivate?: () => void;
  isAvailableInPlacement?: (mode: WorkbenchPlacementMode) => boolean;
  metadata?: Record<string, unknown>;
}

export interface WorkbenchRegionDefinition {
  id: WorkbenchRegionId;
  label: string;
  direction: "horizontal" | "vertical";
  defaultSize: number;
  minSize: number;
  maxSize: number;
  collapsible?: boolean;
}

/** default：圆角卡片 + 内边距；flush：VS Code 式贴边、无区域外边距 */
export type WorkbenchChrome = "default" | "flush";

export interface WorkbenchV2Schema {
  mode: string;
  storageKey: string;
  legacyStorageKeys?: string[];
  /** 未指定时为 default */
  chrome?: WorkbenchChrome;
  regions: Record<WorkbenchRegionId, WorkbenchRegionDefinition>;
}



export const WORKBENCH_REGION_IDS: WorkbenchRegionId[] = ["top", "left", "center", "right"];

export const REGION_COLLAPSED_WIDTH = 52;
